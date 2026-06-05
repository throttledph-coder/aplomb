import { BrowserWindow } from 'electron'

// Shared window registry so the stealth/tray managers and IPC handlers can
// reach the main window without circular imports through main.ts.

let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
