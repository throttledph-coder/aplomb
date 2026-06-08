import { app } from 'electron'
import type { BrowserWindow } from 'electron'
import pkg from 'electron-updater'
import { logError } from './logger'

// electron-updater ships CJS; grab autoUpdater off the default export.
const { autoUpdater } = pkg

let getWindow: (() => BrowserWindow | null) | null = null
let wired = false

function send(type: string, payload?: unknown): void {
  getWindow?.()?.webContents.send('updater:event', { type, payload })
}

// Wire autoUpdater once and kick off an initial check. No-op in dev (an unpacked
// app can't self-update — the renderer shows a "use the installed app" note).
export function setupUpdater(getWin: () => BrowserWindow | null): void {
  if (!app.isPackaged || wired) return
  wired = true
  getWindow = getWin

  autoUpdater.autoDownload = false // user clicks Download (app is unsigned)
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => send('checking'))
  autoUpdater.on('update-available', (info) => send('available', { version: info.version }))
  autoUpdater.on('update-not-available', (info) => send('not-available', { version: info.version }))
  autoUpdater.on('download-progress', (p) => send('progress', { percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (info) => send('downloaded', { version: info.version }))
  autoUpdater.on('error', (err) => {
    logError('updater', err?.stack ?? String(err))
    send('error', { message: err?.message ?? String(err) })
  })

  // Auto-check on launch (chosen behavior: auto-check, manual download/install).
  autoUpdater.checkForUpdates().catch((err) => logError('updater.check', String(err)))
}

export function checkForUpdates(): void {
  if (!app.isPackaged) return
  autoUpdater.checkForUpdates().catch((err) => logError('updater.check', String(err)))
}

export function downloadUpdate(): void {
  if (!app.isPackaged) return
  autoUpdater.downloadUpdate().catch((err) => logError('updater.download', String(err)))
}

export function quitAndInstall(): void {
  if (!app.isPackaged) return
  autoUpdater.quitAndInstall()
}
