import { join } from 'node:path'
import { app, BrowserWindow, Menu, nativeImage, screen, Tray } from 'electron'
import { PANEL_ACTION, type PanelAction } from '../shared/ipc'

// Main window + tray quick panel (AC-090, AC-091). Closing the main window hides it; the app lives in the tray until Quit.
const PANEL = { w: 360, h: 540 }

/** 32x32 tray icon drawn in code: dark rounded square with three light "deck" bars. */
function trayIcon() {
  const n = 32
  const buf = Buffer.alloc(n * n * 4)
  const set = (x: number, y: number, c: [number, number, number]) => {
    const i = (y * n + x) * 4
    buf[i] = c[2]
    buf[i + 1] = c[1]
    buf[i + 2] = c[0]
    buf[i + 3] = 255
  }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dx = Math.min(x, n - 1 - x)
      const dy = Math.min(y, n - 1 - y)
      if (dx + dy < 4 && dx < 4 && dy < 4 && (4 - dx) ** 2 + (4 - dy) ** 2 > 16) continue // rounded corners stay transparent
      const bar = [8, 14, 20].some((by) => y >= by && y < by + 4 && x >= 7 && x < 25)
      set(x, y, bar ? [250, 250, 250] : [24, 24, 27])
    }
  return nativeImage.createFromBitmap(buf, { width: n, height: n })
}

export interface Windows {
  showMain(): BrowserWindow
  hidePanel(): void
  sendToMain(a: PanelAction): void
}

const load = (win: BrowserWindow, hash: string) => {
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}#${hash}`)
  else void win.loadFile(join(import.meta.dirname, '../renderer/index.html'), { hash })
}

const webPreferences = { preload: join(import.meta.dirname, '../preload/index.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false }

export function createWindows(): Windows {
  let quitting = false
  app.on('before-quit', () => (quitting = true))

  let main: BrowserWindow
  const makeMain = () => {
    main = new BrowserWindow({ width: 1280, height: 800, show: true, webPreferences })
    load(main, '/')
    main.on('close', (e) => {
      if (quitting) return
      e.preventDefault() // AC-091: keep running in the tray
      main.hide()
    })
    return main
  }
  makeMain()

  const panel = new BrowserWindow({
    ...PANEL,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    webPreferences
  })
  load(panel, '/quick')
  panel.on('blur', () => panel.hide())
  panel.on('close', (e) => {
    if (!quitting) {
      e.preventDefault()
      panel.hide()
    }
  })

  const showMain = () => {
    panel.hide()
    // A renderer-initiated window.close() destroys the window without the 'close' event; recreate it on demand.
    if (main.isDestroyed()) makeMain()
    if (main.isMinimized()) main.restore()
    main.show()
    main.focus()
    return main
  }

  const togglePanel = () => {
    if (panel.isVisible()) return panel.hide()
    const b = tray.getBounds()
    const area = screen.getDisplayNearestPoint(b.width ? { x: b.x, y: b.y } : screen.getCursorScreenPoint()).workArea
    // Anchor under/over the tray icon when the OS reports it (Windows, macOS); otherwise the top-right corner.
    const x = b.width ? Math.round(b.x + b.width / 2 - PANEL.w / 2) : area.x + area.width - PANEL.w - 12
    const y = b.width ? (b.y > area.y + area.height / 2 ? b.y - PANEL.h - 8 : b.y + b.height + 8) : area.y + 12
    panel.setPosition(Math.max(area.x, Math.min(x, area.x + area.width - PANEL.w)), Math.max(area.y, Math.min(y, area.y + area.height - PANEL.h)))
    panel.show()
    panel.focus()
  }

  const tray = new Tray(trayIcon())
  tray.setToolTip('Specdeck')
  tray.on('click', togglePanel)
  tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Open Specdeck', click: showMain }, { label: 'Quick panel', click: togglePanel }, { type: 'separator' }, { label: 'Quit', click: () => app.quit() }]))

  return {
    showMain,
    hidePanel: () => panel.hide(),
    sendToMain: (a) => {
      const w = showMain()
      const send = () => w.webContents.send(PANEL_ACTION, a)
      if (w.webContents.isLoading()) w.webContents.once('did-finish-load', () => setTimeout(send, 300))
      else send()
    }
  }
}
