import { BrowserWindow, ipcMain } from 'electron'
import { TSRController } from './TSRController'

export default class Main {
  static mainWindow: Electron.BrowserWindow|null
  static application: Electron.App
  static BrowserWindow: typeof BrowserWindow

  static tsrController: TSRController

  private static onWindowAllClosed() {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      Main.application.quit();
    }
  }


  private static onClose () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    Main.mainWindow = null
  }

  private static onReady () {
    Main.mainWindow = new Main.BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true
      }
    })
    Main.mainWindow.loadFile('index.html')
    Main.mainWindow.on('closed', Main.onClose)

    Main.tsrController.init().catch(console.error)

    ipcMain.on('whatever', (event, arg) => {
      console.log('got whatever', arg)
      event.returnValue = 'return!'
      event.reply('whatevz', 'pong')
    })
    
    setTimeout(() => {
      Main.mainWindow.webContents.send('whatevz', 'manual whatevz')
    }, 2000)
  }

  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  private static onActivate () {
    if (Main.mainWindow === null) {
      Main.onReady()
    }
  }

  static main(app:Electron.App, browserWindow: typeof BrowserWindow) {
    Main.BrowserWindow = browserWindow
    Main.application = app
    Main.application.on('window-all-closed', Main.onWindowAllClosed)
    Main.application.on('ready', Main.onReady)
    Main.application.on('activate', Main.onActivate)

    Main.tsrController = new TSRController()
  }
}
