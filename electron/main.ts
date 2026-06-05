import { app, BrowserWindow, globalShortcut, Menu, session, desktopCapturer, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initDatabase, closeDatabase } from '../src/lib/database/db'
import { registerIpcHandlers } from './ipc-handlers'
import { setMainWindow } from './windows'
import { enableStealth, disableStealth, isStealthActive } from './stealth-manager'
import { logError } from './logger'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Capture unexpected main-process failures to the local diagnostic log.
process.on('uncaughtException', (err) => {
  logError('uncaughtException', err?.stack ?? String(err))
})
process.on('unhandledRejection', (reason) => {
  logError(
    'unhandledRejection',
    reason instanceof Error ? (reason.stack ?? reason.message) : String(reason),
  )
})

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

const PRELOAD = path.join(__dirname, 'preload.mjs')

function createWindow() {
  win = new BrowserWindow({
    title: 'Aplomb',
    autoHideMenuBar: true,
    backgroundColor: '#262624',
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  setMainWindow(win)

  // Open external links in the system browser; never spawn in-app windows.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  // Block navigation away from the app's own content (anti-phishing / token theft).
  win.webContents.on('will-navigate', (e, url) => {
    const allowed = (!!VITE_DEV_SERVER_URL && url.startsWith(VITE_DEV_SERVER_URL)) || url.startsWith('file://')
    if (!allowed) {
      e.preventDefault()
      if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function registerHotkeys() {
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (isStealthActive()) disableStealth()
    else enableStealth()
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('before-quit', () => {
  closeDatabase()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Content-Security-Policy for the packaged app. The renderer only talks to
// Supabase directly (AI providers are fetched in the main process), so connect
// is locked to Supabase + self. Skipped in dev so Vite HMR works.
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data:; font-src 'self' data:; " +
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co; " +
  "media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"

app.whenReady().then(() => {
  // Remove the default Electron menu bar (File/Edit/View/Window/Help).
  Menu.setApplicationMenu(null)

  if (!VITE_DEV_SERVER_URL) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [CSP],
        },
      })
    })
  }

  // Enable system-audio (loopback) capture for auto-listen: when the renderer
  // calls getDisplayMedia({audio:true}), grant the primary screen + loopback
  // audio so we capture the interviewer's voice, not the user's mic.
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      callback({ video: sources[0], audio: 'loopback' })
    })
  })

  // Initialize SQLite (main-process only) and register DB IPC before the window loads.
  initDatabase(path.join(app.getPath('userData'), 'clarity.db'))
  registerIpcHandlers()
  createWindow()
  registerHotkeys()
})
