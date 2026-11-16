import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS, PROJECT_CHANGED, PTY_DATA, PTY_EXIT, type SpecdeckApi } from '../shared/ipc'

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
