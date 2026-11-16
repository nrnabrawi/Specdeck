import * as nodePty from 'node-pty'
import type { Command, Run } from '../shared/types'
import type { Store } from './db'

export interface PtyLike {
  onData(cb: (d: string) => void): void
  onExit(cb: (e: { exitCode: number }) => void): void
  write(d: string): void
  resize(cols: number, rows: number): void
  kill(): void
}
export type SpawnFn = (bin: string, args: string[], opts: { cwd: string; cols: number; rows: number }) => PtyLike

const defaultSpawn: SpawnFn = (bin, args, o) =>
  nodePty.spawn(bin, args, { name: 'xterm-256color', cwd: o.cwd, cols: o.cols, rows: o.rows, env: process.env as Record<string, string> })

const BUFFER_MAX = 256 * 1024

interface Active {
  run: Run
  pty: PtyLike
  buffer: string
}

// AC-100/101/102: embedded PTY runs, one active run per project, lifecycle recorded in the store.
export class PtyManager {
  private active = new Map<string, Active>() // by run id

  constructor(
    private store: Store,
    private emit: (channel: 'pty:data' | 'pty:exit', payload: unknown) => void,
    private spawn: SpawnFn = defaultSpawn
  ) {}

  start(projectId: string, c: Command): Run {
    if (!c.meta) throw new Error('Not an agent command')
    if (this.activeFor(projectId)) throw new Error('A run is already active in this project. Stop it first.')
    const run = this.store.startRun({ projectId, agent: c.meta.agent, unitId: c.meta.unitId, stage: c.meta.stage, command: c.display })
    const a: Active = { run, buffer: '', pty: undefined as unknown as PtyLike }
    try {
      a.pty = this.spawn(c.bin, c.args, { cwd: c.cwd, cols: 100, rows: 30 })
    } catch (e) {
      this.store.endRun(run.id, null)
      throw e
    }
    this.active.set(run.id, a)
    a.pty.onData((d) => {
      a.buffer = (a.buffer + d).slice(-BUFFER_MAX)
      this.emit('pty:data', { runId: run.id, data: d })
    })
    a.pty.onExit(({ exitCode }) => {
      this.active.delete(run.id)
      this.store.endRun(run.id, exitCode)
      this.emit('pty:exit', { runId: run.id, exitCode })
    })
    return run
  }

  activeFor(projectId: string): Active | undefined {
    return [...this.active.values()].find((a) => a.run.projectId === projectId)
  }

  attach(projectId: string): { run: Run; buffer: string } | null {
    const a = this.activeFor(projectId)
    return a ? { run: a.run, buffer: a.buffer } : null
  }

  write(runId: string, data: string): void {
    this.active.get(runId)?.pty.write(data)
  }

  resize(runId: string, cols: number, rows: number): void {
    this.active.get(runId)?.pty.resize(cols, rows)
  }

  stop(runId: string): void {
    this.active.get(runId)?.pty.kill()
  }

  stopAll(): void {
    for (const a of this.active.values()) a.pty.kill()
  }
}
