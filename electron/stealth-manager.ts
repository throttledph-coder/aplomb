import { app } from 'electron'
import { getMainWindow } from './windows'
import { createTray, destroyTray } from './tray-manager'

let stealthActive = false

export function isStealthActive(): boolean {
  return stealthActive
}

export function enableStealth(): void {
  const main = getMainWindow()

  main?.setSkipTaskbar(true)
  main?.setContentProtection(true)
  // Window pickers (Zoom/Meet/Discord) show titles even when the content is
  // protected — present a generic one while stealthed.
  main?.setTitle('Widget')

  if (process.platform === 'darwin') app.dock?.hide()

  createTray(disableStealth)
  stealthActive = true
}

export function disableStealth(): void {
  const main = getMainWindow()

  main?.setSkipTaskbar(false)
  main?.setContentProtection(false)
  main?.setTitle('Aplomb')

  if (process.platform === 'darwin') app.dock?.show()

  main?.show()
  destroyTray()
  stealthActive = false
}
