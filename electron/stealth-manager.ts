import { app } from 'electron'
import { getMainWindow } from './windows'
import { openOverlay, closeOverlay } from './overlay-manager'

let stealthActive = false

export function isStealthActive(): boolean {
  return stealthActive
}

// Stealth IS overlay mode: content protection blacks out captures, but share
// pickers (Zoom/Meet) still LIST any visible window — only a hidden main window
// + the untitled toolwindow overlay are absent from enumeration. No tray icon
// in stealth (user requirement); recovery is via the overlay and the global
// hotkeys (Ctrl+Shift+S / Ctrl+Shift+H).
export function enableStealth(): void {
  const main = getMainWindow()

  main?.setContentProtection(true)
  main?.setSkipTaskbar(true)
  main?.setTitle('Widget')

  if (process.platform === 'darwin') app.dock?.hide()

  stealthActive = true
  openOverlay() // hides the main window
  main?.hide() // belt-and-suspenders: a hidden window is never enumerated
}

export function disableStealth(): void {
  const main = getMainWindow()

  main?.setSkipTaskbar(false)
  main?.setContentProtection(false)
  main?.setTitle('Aplomb')

  if (process.platform === 'darwin') app.dock?.show()

  // Flip the flag BEFORE closing the overlay so its closed-hook (main.ts)
  // doesn't re-enter; closeOverlay restores + focuses the main window.
  stealthActive = false
  closeOverlay()
}
