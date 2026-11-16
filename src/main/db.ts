import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import type { FrameworkId, Project } from '../shared/types'

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
      create table if not exists settings (k text primary key, v text not null);`)
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
}
