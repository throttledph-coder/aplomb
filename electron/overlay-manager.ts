import { app, BrowserWindow, screen } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { getMainWindow } from './windows'
import { getSetting, setSetting } from '../src/lib/database/queries'
import {
  clampBounds,
  defaultBounds,
  parseBounds,
  OVERLAY_MIN_WIDTH,
  OVERLAY_MIN_HEIGHT,
} from '../src/lib/overlay/bounds'

// The Focus overlay IS the stealth surface: a frameless toolwindow (excluded
// from Alt+Tab and standard screen-share window pickers), skip-taskbar,
// content-protected (black in any capture), generic title — while the main
// window is hidden entirely (hidden windows appear nowhere). Note: transparent
// frameless windows lose native resize on Windows, so we use a solid charcoal
// background + Win11 native rounded corners instead.

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let overlay: BrowserWindow | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let onClosedCb: (() => void) | null = null

// Hook fired after the overlay closes and the main window is restored —
// main.ts uses it to exit stealth when the user leaves the overlay.
export function setOnClosed(cb: () => void): void {
  onClosedCb = cb
}

export function isOverlayOpen(): boolean {
  return overlay !== null && !overlay.isDestroyed() && overlay.isVisible()
}

function persistBounds(): void {
  if (!overlay || overlay.isDestroyed()) return
  const b = overlay.getBounds()
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    setSetting('overlay_bounds', JSON.stringify(b))
  }, 500)
}

export function openOverlay(): void {
  const main = getMainWindow()
  if (overlay && !overlay.isDestroyed()) {
    overlay.show()
    overlay.focus()
    main?.hide()
    return
  }

  const workArea = screen.getPrimaryDisplay().workArea
  const saved = parseBounds(getSetting('overlay_bounds'))
  const bounds = saved ? clampBounds(saved, workArea) : defaultBounds(workArea)

  overlay = new BrowserWindow({
    ...bounds,
    minWidth: OVERLAY_MIN_WIDTH,
    minHeight: OVERLAY_MIN_HEIGHT,
    // EMPTY title is load-bearing: Chromium's getDisplayMedia picker (Brave →
    // Meet/Zoom-web) enumerates with kIgnoreUntitled, so an untitled window is
    // dropped from the "Select a window" list. Combined with the toolwindow
    // style + content protection below.
    title: '',
    frame: false,
    resizable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    roundedCorners: true,
    backgroundColor: '#262624',
    // Toolwindow (Windows) / panel (macOS): excluded from Alt+Tab and from
    // standard application/window share pickers.
    type: process.platform === 'darwin' ? 'panel' : 'toolbar',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  overlay.setContentProtection(true)
  overlay.setAlwaysOnTop(getSetting('overlay_always_on_top') !== 'false', 'screen-saver')
  // The overlay loads the app's index.html (<title>Aplomb</title>); stop that
  // from renaming the window, and re-assert an empty title after load — keeps
  // the window untitled so share pickers never list it.
  overlay.webContents.on('page-title-updated', (e) => e.preventDefault())
  overlay.webContents.on('did-finish-load', () => overlay?.setTitle(''))
  if (process.platform === 'darwin') {
    overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    app.dock?.hide()
  }

  const opacity = Number(getSetting('overlay_opacity') ?? '1')
  if (Number.isFinite(opacity) && opacity >= 0.3 && opacity <= 1) overlay.setOpacity(opacity)

  overlay.on('moved', persistBounds)
  overlay.on('resized', persistBounds)
  overlay.on('closed', () => {
    overlay = null
    const m = getMainWindow()
    m?.show()
    m?.focus()
    // Let the live session refresh anything asked from the overlay.
    m?.webContents.send('session:refresh')
    // Dock + stealth re-assertion are owned by the onClosed hook (main.ts),
    // which knows whether stealth is still active.
    onClosedCb?.()
  })

  const devUrl = process.env['VITE_DEV_SERVER_URL']
  if (devUrl) {
    void overlay.loadURL(`${devUrl}#/overlay`)
  } else {
    void overlay.loadFile(path.join(process.env.APP_ROOT!, 'dist', 'index.html'), {
      hash: '/overlay',
    })
  }

  main?.hide()
}

export function closeOverlay(): void {
  if (overlay && !overlay.isDestroyed()) {
    overlay.close() // 'closed' handler restores the main window
  } else {
    const m = getMainWindow()
    m?.show()
    m?.focus()
  }
}

export function toggleOverlay(): void {
  if (isOverlayOpen()) closeOverlay()
  else openOverlay()
}

export function setOverlayOpacity(value: number): void {
  const clamped = Math.min(1, Math.max(0.3, value))
  setSetting('overlay_opacity', String(clamped))
  if (overlay && !overlay.isDestroyed()) overlay.setOpacity(clamped)
}

export function setOverlayAlwaysOnTop(on: boolean): void {
  if (overlay && !overlay.isDestroyed()) overlay.setAlwaysOnTop(on, 'screen-saver')
}

// Grow/shrink the window width (e.g. the Notes side panel opening/closing) so
// the chat column keeps its size. Clamped to the window's current display.
export function adjustOverlayWidth(delta: number): void {
  if (!overlay || overlay.isDestroyed()) return
  const b = overlay.getBounds()
  const work = screen.getDisplayMatching(b).workArea
  const width = Math.min(Math.max(b.width + delta, OVERLAY_MIN_WIDTH), work.width)
  const x = Math.min(Math.max(b.x, work.x), work.x + work.width - width)
  overlay.setBounds({ x, y: b.y, width, height: b.height })
}
