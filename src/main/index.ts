import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { Store } from './db'
import { broadcastChanged, registerIpc } from './ipc'
import { ProjectWatcher } from './watcher'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(join(import.meta.dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
  const store = new Store(app.getPath('userData'))
  const watcher = new ProjectWatcher(broadcastChanged)
  watcher.sync(store.list())
  registerIpc(store, watcher)
  createWindow()
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
