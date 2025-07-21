// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu, ipcMain} = require('electron')
const path = require('path')
const Database = require('better-sqlite3')
// Initialize @electron/remote
require('@electron/remote/main').initialize()

// Suppress Electron security warnings in production
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

// Suppress specific console messages
const originalConsoleError = console.error
console.error = function(...args) {
  // Filter out known harmless errors
  const errorString = args.join(' ')
  if (errorString.includes('Unknown VE context') || 
      errorString.includes('NSKeyBindingManager') ||
      errorString.includes('Autofill.enable') ||
      errorString.includes('Autofill.setAddresses')) {
    return
  }
  originalConsoleError.apply(console, args)
}

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 840,
    icon: path.join(__dirname, 'icons/pa.png'),//Only used in Linux
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true,
      // Suppress console warnings
      devTools: true
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Enable remote module for this window
  require('@electron/remote/main').enable(mainWindow.webContents)

  // Open the DevTools
  // mainWindow.webContents.openDevTools()

  // Check if we are on a MAC
  if (process.platform === 'darwin') {
    // Create our menu entries so that we can use MAC shortcuts
    const template = [
      {
        label: 'PaperArxiv',
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services', submenu: [] },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Find',
            accelerator: 'CmdOrCtrl+F',
            click: () => {
              mainWindow.webContents.send('find')
            }
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' }
        ]
      }
    ];
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } else {
    // For Windows and Linux, remove the menu bar
    mainWindow.setMenuBarVisibility(false);
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
