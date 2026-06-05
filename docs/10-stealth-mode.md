STEALTH MODE — TECHNICAL IMPLEMENTATION
How to Make the App Invisible to Screen Share
JavaScript

// electron/main.js

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0a',
  })
  return mainWindow
}

function createOverlayWindow() {
  const overlay = new BrowserWindow({
    width: 420,
    height: 130,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,          // Does not steal focus
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  })
  
  overlay.setAlwaysOnTop(true, 'screen-saver') // Highest level
  overlay.setVisibleOnAllWorkspaces(true)
  
  return overlay
}

// STEALTH MODE TOGGLE
ipcMain.handle('enable-stealth-mode', () => {
  // 1. Hide from taskbar
  mainWindow.setSkipTaskbar(true)
  
  // 2. Make content invisible to screen capture
  // This is the KEY feature — setContentProtection(true) makes
  // the window appear as a black rectangle to any screen recording software
  mainWindow.setContentProtection(true)
  overlay.setContentProtection(true)
  
  // 3. On macOS: hide from dock
  if (process.platform === 'darwin') {
    app.dock.hide()
  }
  
  // 4. Show only the overlay (which is also content-protected)
  overlay.show()
  
  // 5. Register tray icon (only way user sees the app)
  createTrayIcon()
})

ipcMain.handle('disable-stealth-mode', () => {
  mainWindow.setSkipTaskbar(false)
  mainWindow.setContentProtection(false)
  overlay.setContentProtection(false)
  
  if (process.platform === 'darwin') {
    app.dock.show()
  }
  
  mainWindow.show()
  destroyTrayIcon()
})

// TRAY ICON
function createTrayIcon() {
  tray = new Tray(path.join(__dirname, 'assets/tray-icon.png'))
  
  const contextMenu = Menu.buildFromTemplate([
    { label: '◆ Aplomb — Stealth Mode', enabled: false },
    { type: 'separator' },
    { label: 'Show App', click: () => { mainWindow.show() } },
    { label: 'Toggle Overlay (⌘⇧H)', click: () => {
        overlay.isVisible() ? overlay.hide() : overlay.show()
    }},
    { label: 'Copy Last Answer (⌘⇧C)', click: () => {
        mainWindow.webContents.send('copy-last-answer')
    }},
    { type: 'separator' },
    { label: 'End Session', click: () => {
        mainWindow.webContents.send('end-session')
    }},
    { label: 'Disable Stealth Mode', click: () => {
        ipcMain.emit('disable-stealth-mode')
    }},
  ])
  
  tray.setToolTip('Aplomb — Active')
  tray.setContextMenu(contextMenu)
}
