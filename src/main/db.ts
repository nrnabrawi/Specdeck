import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import type { AgentKey, FrameworkId, Project, Run } from '../shared/types'

type Row = { id: string; path: string; name: string; framework: FrameworkId; added_at: number }
const toProject = (r: Row): Project => ({ id: r.id, path: r.path, name: r.name, framework: r.framework, addedAt: r.added_at })

export class Store {
  private db: InstanceType<typeof Database>

  constructor(dir: string) {
    this.db = new Database(dir === ':memory:' ? dir : join(dir, 'specdeck.db'))
    this.db.exec(`
      create table if not exists projects (
        id text primary key, path text unique not null, name text not null,
        framework text not null, added_at integer not null);
      create table if not exists settings (k text primary key, v text not null);
      create table if not exists runs (
        id text primary key, project_id text not null, agent text not null, unit_id text not null,
        stage text not null, command text not null, started_at integer not null,
        ended_at integer, exit_code integer);`)
    // A crash can leave runs open; close them so they are not reported as running (AC-101).
    this.db.prepare('update runs set ended_at = ? where ended_at is null').run(Date.now())
  }

  list(): Project[] {
    return (this.db.prepare('select * from projects order by added_at').all() as Row[]).map(toProject)
  }

  get(id: string): Project | undefined {
    const r = this.db.prepare('select * from projects where id = ?').get(id) as Row | undefined
    return r && toProject(r)
  }

  add(path: string, name: string, framework: FrameworkId): Project {
    const id = randomUUID()
    this.db
      .prepare('insert into projects (id, path, name, framework, added_at) values (?, ?, ?, ?, ?)')
      .run(id, path, name, framework, Date.now())
    return this.get(id)!
  }

  setFramework(id: string, framework: FrameworkId): Project {
    this.db.prepare('update projects set framework = ? where id = ?').run(framework, id)
    const p = this.get(id)
    if (!p) throw new Error('Unknown project')
    return p
  }

  remove(id: string): void {
    this.db.prepare('delete from projects where id = ?').run(id)
    if (this.getActive() === id) this.setActive(null)
  }

  getActive(): string | null {
    const r = this.db.prepare("select v from settings where k = 'active'").get() as { v: string } | undefined
    return r?.v ?? null
  }

  setActive(id: string | null): void {
    if (id === null) this.db.prepare("delete from settings where k = 'active'").run()
    else this.db.prepare("insert into settings (k, v) values ('active', ?) on conflict(k) do update set v = excluded.v").run(id)
  }

  getSetting(k: string): string | null {
    const r = this.db.prepare('select v from settings where k = ?').get(k) as { v: string } | undefined
    return r?.v ?? null
  }

  setSetting(k: string, v: string): void {
    this.db.prepare('insert into settings (k, v) values (?, ?) on conflict(k) do update set v = excluded.v').run(k, v)
  }

  startRun(r: { projectId: string; agent: AgentKey; unitId: string; stage: string; command: string }): Run {
    const id = randomUUID()
    const startedAt = Date.now()
    this.db
      .prepare('insert into runs (id, project_id, agent, unit_id, stage, command, started_at) values (?, ?, ?, ?, ?, ?, ?)')
      .run(id, r.projectId, r.agent, r.unitId, r.stage, r.command, startedAt)
    return { id, ...r, startedAt, endedAt: null, exitCode: null }
  }

  endRun(id: string, exitCode: number | null): void {
    this.db.prepare('update runs set ended_at = ?, exit_code = ? where id = ?').run(Date.now(), exitCode, id)
  }

  listRuns(projectId: string, sinceMs = 0): Run[] {
    type R = { id: string; project_id: string; agent: AgentKey; unit_id: string; stage: string; command: string; started_at: number; ended_at: number | null; exit_code: number | null }
    return (this.db.prepare('select * from runs where project_id = ? and started_at >= ? order by started_at desc').all(projectId, sinceMs) as R[]).map((r) => ({
      id: r.id,
      projectId: r.project_id,
      agent: r.agent,
      unitId: r.unit_id,
      stage: r.stage,
      command: r.command,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      exitCode: r.exit_code
    }))
  }
}
