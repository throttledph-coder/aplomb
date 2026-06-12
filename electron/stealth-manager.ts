import { app } from 'electron'
import { getMainWindow } from './windows'
import { createTray, destroyTray } from './tray-manager'
import { openOverlay, closeOverlay } from './overlay-manager'

let stealthActive = false

export function isStealthActive(): boolean {
  return stealthActive
}

// Stealth IS overlay mode: content protection blacks out captures, but
// share pickers (Zoom/Meet) still LIST any visible window — only a hidden
// main window + the toolwindow overlay are absent from enumeration.
export function enableStealth(): void {
  const main = getMainWindow()

  main?.setSkipTaskbar(true)
  main?.setContentProtection(true)
  // Window pickers show titles even when the content is protected — present a
  // generic one for the brief transition before the window hides.
  main?.setTitle('Widget')

  if (process.platform === 'darwin') app.dock?.hide()

  createTray(disableStealth)
  stealthActive = true
  openOverlay() // hides the main window — gone from every picker
}

export function disableStealth(): void {
  const main = getMainWindow()

  main?.setSkipTaskbar(false)
  main?.setContentProtection(false)
  main?.setTitle('Aplomb')

  if (process.platform === 'darwin') app.dock?.show()

  destroyTray()
  // Flip the flag BEFORE closing the overlay so its closed-hook (main.ts)
  // doesn't re-enter; closeOverlay restores + focuses the main window.
  stealthActive = false
  closeOverlay()
}
