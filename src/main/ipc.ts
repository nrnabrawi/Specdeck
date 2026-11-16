import { statSync } from 'node:fs'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import { z } from 'zod'
import { PROJECT_CHANGED, type Channel, type IpcMap } from '../shared/ipc'
import { detectAgents } from './agents'
import { detectAll, getAdapter } from './adapters'
import type { Store } from './db'
import type { ProjectWatcher } from './watcher'
import type { CommandService } from './commands'
import { loadDraft, saveDraft } from './wizard'
import { buildFeed, computeStats, type Recorder } from './activity'
import type { PtyManager } from './pty'

const fw = z.enum(['openspec', 'speckit'])
const id = z.string().min(1).max(200)
const unitId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/).max(200)
const agent = z.enum(['claude', 'codex'])
const dirPath = z.string().min(1).refine((p) => {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}, 'Not a directory')

export function registerIpc(store: Store, watcher: ProjectWatcher, commands: CommandService, pty: PtyManager, recorder: Recorder): void {
  const handle = <C extends Channel>(
    channel: C,
    schema: z.ZodType<IpcMap[C]['arg']>,
    fn: (arg: IpcMap[C]['arg']) => Promise<IpcMap[C]['res']> | IpcMap[C]['res']
  ) => ipcMain.handle(channel, (_e, raw) => fn(schema.parse(raw)))

  const proj = (projectId: string) => {
    const p = store.get(projectId)
    if (!p) throw new Error('Unknown project')
    return { p, a: getAdapter(p.framework) }
  }
  const none = z.undefined() as z.ZodType<void>

  handle('projects:list', none, () => store.list())
  handle('projects:add', z.object({ path: dirPath, name: z.string().min(1).max(100), framework: fw }), (a) => {
    const p = store.add(a.path, a.name, a.framework)
    watcher.sync(store.list())
    return recorder.record(p.id).then(() => p) // baseline snapshot
  })
  handle('projects:setFramework', z.object({ id, framework: fw }), async (a) => {
    const p = store.setFramework(a.id, a.framework)
    await watcher.resync(store.list())
    return p
  })
  handle('projects:remove', z.object({ id }), (a) => {
    store.remove(a.id)
    watcher.sync(store.list())
  })
  handle('projects:pickFolder', none, async () => {
    const win = BrowserWindow.getFocusedWindow() ?? undefined
    const r = await (win ? dialog.showOpenDialog(win, { properties: ['openDirectory'] }) : dialog.showOpenDialog({ properties: ['openDirectory'] }))
    return r.canceled ? null : r.filePaths[0]
  })
  handle('projects:detect', z.object({ path: dirPath }), (a) => detectAll(a.path))
  handle('active:get', none, () => store.getActive())
  handle('active:set', z.object({ id: id.nullable() }), (a) => store.setActive(a.id))
  handle('agents:detect', none, () => detectAgents(process.cwd(), store))
  handle('agents:setEnabled', z.object({ key: agent, enabled: z.boolean() }), (a) => store.setSetting(`agent:${a.key}:enabled`, String(a.enabled)))
  handle(
    'commands:preview',
    z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('init'), path: dirPath, framework: fw, agents: z.array(agent).max(2) }),
      z.object({ kind: z.literal('stage'), projectId: id, unitId: unitId, stage: z.string().regex(/^[a-z]+$/).max(20), agent, input: z.string().max(4000).optional() }),
      z.object({ kind: z.literal('maintenance'), projectId: id, actionId: z.string().min(1).max(50) })
    ]),
    (a) => commands.preview(a)
  )
  handle('commands:run', z.object({ token: z.string().uuid() }), (a) => commands.run(a.token))
  handle('runs:attach', z.object({ projectId: id }), (a) => pty.attach(a.projectId))
  handle('runs:write', z.object({ runId: id, data: z.string().max(65536) }), (a) => pty.write(a.runId, a.data))
  handle('runs:resize', z.object({ runId: id, cols: z.number().int().min(10).max(500), rows: z.number().int().min(2).max(200) }), (a) => pty.resize(a.runId, a.cols, a.rows))
  handle('runs:stop', z.object({ runId: id }), (a) => pty.stop(a.runId))
  handle('runs:list', z.object({ projectId: id, sinceMs: z.number().int().min(0).optional() }), (a) => store.listRuns(a.projectId, a.sinceMs))
  handle('wizard:load', z.object({ projectId: id }), (a) => loadDraft(store, proj(a.projectId).p))
  handle('wizard:save', z.object({ projectId: id, state: z.unknown() }), (a) => saveDraft(store, proj(a.projectId).p, a.state))
  handle('activity:list', z.object({ projectId: id }), async (a) => {
    const { p, a: ad } = proj(a.projectId)
    return buildFeed(store.listEvents(p.id), store.listRuns(p.id), await ad.listUnits(p.path))
  })
  handle('stats:get', z.object({ projectId: id, days: z.union([z.literal(14), z.literal(30)]) }), async (a) => {
    const { p, a: ad } = proj(a.projectId)
    return computeStats(store.listEvents(p.id), store.listRuns(p.id), await ad.listUnits(p.path), a.days, Date.now())
  })
  handle('maintenance:get', z.object({ projectId: id }), (a) => proj(a.projectId).a.maintenance(proj(a.projectId).p.path))
  handle('units:list', z.object({ projectId: id }), (a) => proj(a.projectId).a.listUnits(proj(a.projectId).p.path))
  handle('specs:list', z.object({ projectId: id }), (a) => proj(a.projectId).a.listSpecs(proj(a.projectId).p.path))
  handle('specs:read', z.object({ projectId: id, id }), (a) => proj(a.projectId).a.readSpec(proj(a.projectId).p.path, a.id))
  handle('specs:search', z.object({ projectId: id, query: z.string().max(200) }), (a) =>
    proj(a.projectId).a.searchSpecs(proj(a.projectId).p.path, a.query)
  )
  handle('deltas:forUnit', z.object({ projectId: id, unitId: id }), (a) =>
    proj(a.projectId).a.readDeltas(proj(a.projectId).p.path, a.unitId)
  )
  handle('deltas:forSpec', z.object({ projectId: id, specId: id }), (a) =>
    proj(a.projectId).a.deltasForSpec(proj(a.projectId).p.path, a.specId)
  )
}

export function broadcastChanged(projectId: string): void {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send(PROJECT_CHANGED, projectId)
}


