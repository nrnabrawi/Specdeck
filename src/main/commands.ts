import { randomUUID } from 'node:crypto'
import type { Command } from '../shared/types'
import type { Preview, PreviewReq, RunResult } from '../shared/ipc'
import { runCapture } from './exec'
import { getAdapter } from './adapters'
import { detectAgents } from './agents'
import type { Store } from './db'
import type { PtyManager } from './pty'

const TTL = 10 * 60 * 1000

// AC-003: the renderer can only run a command it previewed. A single-use token binds the confirmed display text to the exact command.
export class CommandService {
  private pending = new Map<string, { cmd: Command; projectId?: string; exp: number }>()

  constructor(
    private store: Store,
    private pty: PtyManager
  ) {}

  async preview(req: PreviewReq): Promise<Preview> {
    let cmd: Command
    let projectId: string | undefined
    if (req.kind === 'init') {
      cmd = getAdapter(req.framework).initCommand(req.path, req.agents)
    } else {
      const p = this.store.get(req.projectId)
      if (!p) throw new Error('Unknown project')
      projectId = p.id
      const a = getAdapter(p.framework)
      if (req.kind === 'maintenance') cmd = await a.maintenanceCommand(p.path, req.actionId)
      else {
        if (req.stage !== 'archive') {
          const ag = (await detectAgents(p.path, this.store)).find((x) => x.key === req.agent && x.launchable)
          if (!ag?.detected) throw new Error(`${req.agent} was not found on PATH.`)
          if (!ag.enabled) throw new Error(`${ag.label} is turned off in Add-ons.`)
        }
        cmd = a.stageCommand(p.path, req.unitId, req.stage, req.agent)
      }
    }
    const token = randomUUID()
    this.pending.set(token, { cmd, projectId, exp: Date.now() + TTL })
    return { token, display: cmd.display, cwd: cmd.cwd, mode: cmd.mode }
  }

  async run(token: string): Promise<RunResult> {
    const e = this.pending.get(token)
    this.pending.delete(token)
    if (!e || e.exp < Date.now()) throw new Error('This confirmation expired. Review the command again.')
    if (e.cmd.mode === 'pty') {
      return { mode: 'pty', runId: this.pty.start(e.projectId!, e.cmd).id }
    }
    return { mode: 'exec', ...(await runCapture(e.cmd.bin, e.cmd.args, e.cmd.cwd)) }
  }
}
