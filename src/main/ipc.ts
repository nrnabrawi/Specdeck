import { statSync } from 'node:fs'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import { z } from 'zod'
import { PROJECT_CHANGED, type Channel, type IpcMap } from '../shared/ipc'
import { detectAgents } from './agents'
import { detectAll, getAdapter } from './adapters'
import type { Store } from './db'
import type { ProjectWatcher } from './watcher'

const fw = z.enum(['openspec', 'speckit'])
const id = z.string().min(1).max(200)
const dirPath = z.string().min(1).refine((p) => {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}, 'Not a directory')

export function registerIpc(store: Store, watcher: ProjectWatcher): void {
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
    return p
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
  handle('agents:detect', none, () => detectAgents(process.cwd()))
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


