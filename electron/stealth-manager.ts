import { app, BrowserWindow } from 'electron'
import { getMainWindow } from './windows'
import { openOverlay, closeOverlay } from './overlay-manager'

let stealthActive = false

export function isStealthActive(): boolean {
  return stealthActive
}

// Single source of truth: tell every window (main + overlay) the real stealth
// state so their toggles never drift out of sync with the actual protection.
function broadcast(): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('stealth:changed', stealthActive)
  }
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
  broadcast()
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
  broadcast()
}

// Re-apply protection to the (now-visible) main window when the user leaves the
// Focus overlay while stealth is still on — stealth must persist across Focus
// enter/exit. Leaving the overlay drops the toolwindow enumeration-hiding, but
// the main window stays capture-protected, off the taskbar, and generically
// titled. The user only loses stealth by explicitly toggling it off.
export function reassertStealth(): void {
  if (!stealthActive) return
  const main = getMainWindow()
  main?.setContentProtection(true)
  main?.setSkipTaskbar(true)
  main?.setTitle('Widget')
  if (process.platform === 'darwin') app.dock?.hide()
  broadcast()
}
