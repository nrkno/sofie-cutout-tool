import { BrowserWindow, ipcMain, app } from 'electron'
import * as chokidar from 'chokidar'
import * as _ from 'underscore'
import { TSRController } from './TSRController'
import { DataHandler } from './dataHandler'
import { SourceInputType, FullConfig, FullConfigClient, Cutout } from './api'

export default class Main {
  static mainWindow: Electron.BrowserWindow|null
  static application: Electron.App
  static BrowserWindow: typeof BrowserWindow

  static tsrController: TSRController
  static dataHandler: DataHandler

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

    Main.tsrController.destroy().catch(console.error)
  }

  private static onReady () {
    Main.mainWindow = new Main.BrowserWindow({
      width: 1280,
      height: 720,
      webPreferences: {
        nodeIntegration: true
      }
    })
    Main.mainWindow.loadFile('index.html')
    Main.mainWindow.on('closed', Main.onClose)


    chokidar.watch('/config.json').on('all', (event, path) => {
      console.log(event, path);
    });

    Main.tsrController.init().catch(console.error)

    ipcMain.on('cutout-move', (event, move) => {
      console.log(move)
    })
    ipcMain.on('initialize', (event, move) => {

      console.log('Initializing...')

      Main.dataHandler.onConfigChanged(() => {
        console.log('config changed, reloading..')


        Main.dataHandler.requestConfig()
        .then((fullConfig: FullConfig) => {

          Main.tsrController.updateTimeline(
            fullConfig.sources,
            fullConfig.cutouts, // TODO: tmp! this should come from the user instead
            fullConfig.outputs
          )

          const fullConfigClient: FullConfigClient = _.extend({
            sourceReferenceLayers: {}
          },fullConfig)

          // Find where the sources have been mapped up in CasparCG, so we know which layers to fetch the images from in the UI:
          _.each(fullConfig.sources, (source, sourceId) => {
            if (source.input.type === SourceInputType.MEDIA) {
              const refId = Main.tsrController.refer.mediaRef(source.input.file)
              const ref = Main.tsrController.refer.getRef(refId, '')
              if (ref) {
                const mapping = Main.tsrController.mappings[ref.content.mappedLayer]
                if (mapping) {
                  fullConfigClient.sourceReferenceLayers[sourceId] = {
                    channel: mapping.channel,
                    layer: mapping.layer
                  }
                }

              }
            }
          })

          event.reply('new-config', fullConfigClient)

        }).catch(console.error)

      })



    })
    ipcMain.on('update-cutout', (event, cutoutId: string, cutout: Cutout) => {
      Main.dataHandler.setConfigCutout(cutoutId, cutout)
      .then(() => {
        return Main.dataHandler.requestConfig()
        .then((fullConfig: FullConfig) => {

          Main.tsrController.updateTimeline(
            fullConfig.sources,
            fullConfig.cutouts,
            fullConfig.outputs
          )
        })
      }).catch(console.error)

    })
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
    Main.dataHandler = new DataHandler(
      app.getAppPath()
    )
  }
}
