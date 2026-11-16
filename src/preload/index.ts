import { contextBridge, ipcRenderer } from 'electron'
import { ACTIVE_CHANGED, CHANNELS, PANEL_ACTION, PROJECT_CHANGED, PTY_DATA, PTY_EXIT, type PanelAction, type SpecdeckApi } from '../shared/ipc'

const api: SpecdeckApi = {
  invoke: (channel, arg) => {
    if (!CHANNELS.includes(channel)) throw new Error(`Blocked channel: ${channel}`)
    return ipcRenderer.invoke(channel, arg)
  },
  onProjectChanged: (cb) => {
    const h = (_e: unknown, id: string) => cb(id)
    ipcRenderer.on(PROJECT_CHANGED, h)
    return () => ipcRenderer.removeListener(PROJECT_CHANGED, h)
  },
  onActiveChanged: (cb) => {
    const h = () => cb()
    ipcRenderer.on(ACTIVE_CHANGED, h)
    return () => ipcRenderer.removeListener(ACTIVE_CHANGED, h)
  },
  onPanelAction: (cb) => {
    const h = (_e: unknown, a: PanelAction) => cb(a)
    ipcRenderer.on(PANEL_ACTION, h)
    return () => ipcRenderer.removeListener(PANEL_ACTION, h)
  },
  onPtyData: (cb) => {
    const h = (_e: unknown, p: { runId: string; data: string }) => cb(p)
    ipcRenderer.on(PTY_DATA, h)
    return () => ipcRenderer.removeListener(PTY_DATA, h)
  },
  onPtyExit: (cb) => {
    const h = (_e: unknown, p: { runId: string; exitCode: number | null }) => cb(p)
    ipcRenderer.on(PTY_EXIT, h)
    return () => ipcRenderer.removeListener(PTY_EXIT, h)
  }
}

contextBridge.exposeInMainWorld('specdeck', api)
