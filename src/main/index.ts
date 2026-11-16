import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { Store } from './db'
import { CommandService } from './commands'
import { broadcastChanged, registerIpc } from './ipc'
import { PtyManager } from './pty'
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
  const pty = new PtyManager(store, (channel, payload) => {
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel, payload)
  })
  app.on('before-quit', () => pty.stopAll())
  registerIpc(store, watcher, new CommandService(store, pty), pty)
  createWindow()
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
