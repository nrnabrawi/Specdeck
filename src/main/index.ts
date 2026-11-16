import { app, BrowserWindow } from 'electron'
import { Recorder } from './activity'
import { Store } from './db'
import { CommandService } from './commands'
import { broadcastChanged, registerIpc } from './ipc'
import { PtyManager } from './pty'
import { createWindows } from './windows'
import { ProjectWatcher } from './watcher'

app.whenReady().then(() => {
  const store = new Store(app.getPath('userData'))
  const recorder = new Recorder(store)
  const watcher = new ProjectWatcher((id) => void recorder.record(id).then(() => broadcastChanged(id)))
  watcher.sync(store.list())
  for (const p of store.list()) void recorder.record(p.id)
  const pty = new PtyManager(store, (channel, payload) => {
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel, payload)
  })
  app.on('before-quit', () => pty.stopAll())
  const windows = createWindows()
  registerIpc(store, watcher, new CommandService(store, pty), pty, recorder, windows)
})
// The app lives in the tray (AC-091): closing windows does not quit; Quit in the tray menu does.
app.on('window-all-closed', () => undefined)
