import { contextBridge, ipcRenderer } from 'electron'
import { CHANNELS, PROJECT_CHANGED, type SpecdeckApi } from '../shared/ipc'

const api: SpecdeckApi = {
  invoke: (channel, arg) => {
    if (!CHANNELS.includes(channel)) throw new Error(`Blocked channel: ${channel}`)
    return ipcRenderer.invoke(channel, arg)
  },
  onProjectChanged: (cb) => {
    const h = (_e: unknown, id: string) => cb(id)
    ipcRenderer.on(PROJECT_CHANGED, h)
    return () => ipcRenderer.removeListener(PROJECT_CHANGED, h)
  }
}

contextBridge.exposeInMainWorld('specdeck', api)
