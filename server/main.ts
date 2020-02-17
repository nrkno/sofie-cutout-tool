import * as chokidar from 'chokidar';

import { BrowserWindow, ipcMain } from 'electron';
import { Cutout, FullConfig, FullConfigClient } from './api';

import { DataHandler } from './dataHandler';
import { TSRController, RunTimeData } from './TSRController';
import _ from 'underscore';

export default class Main {
	static mainWindow: Electron.BrowserWindow | null;
	static application: Electron.App;
	static BrowserWindow: typeof BrowserWindow;

	static tsrController: TSRController;
	static dataHandler: DataHandler;

	static runtimeData: RunTimeData = {};

	private static onWindowAllClosed(): void {
		// On macOS it is common for applications and their menu bar
		// to stay active until the user quits explicitly with Cmd + Q
		if (process.platform !== 'darwin') {
			Main.application.quit();
		}
	}

	private static onClose(): void {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		Main.mainWindow = null;

		Main.tsrController.destroy().catch(console.error);
	}

	private static onReady(): void {
		Main.mainWindow = new Main.BrowserWindow({
			width: 1280,
			height: 720,
			webPreferences: {
				nodeIntegration: true
			}
		});
		Main.mainWindow.loadFile('index.html');
		Main.mainWindow.on('closed', Main.onClose);

		chokidar.watch('/config.json').on('all', (event, path) => {
			console.log(event, path);
		});

		Main.dataHandler
			.updateConfig()
			.then(() => {
				return Main.tsrController.init(Main.dataHandler.getConfig());
			})
			.catch(console.error);

		ipcMain.on('cutout-move', (event, move) => {
			// console.log(move);
		});
		ipcMain.on('initialize', (event) => {
			console.log('Initializing...');

			Main.dataHandler.onConfigChanged(() => {
				console.log('config changed, reloading..');

				Main.updateTimeline();

				const fullConfig = Main.dataHandler.getConfig();

				const fullConfigClient: FullConfigClient = _.extend(
					{
						sourceReferenceLayers: {}
					},
					fullConfig
				);

				// Find where the sources have been mapped up in CasparCG, so we know which layers to fetch the images from in the UI:
				_.each(fullConfig.sources, (source, sourceId) => {
					const refId = Main.tsrController.refer.getSourceRef(source.input);
					const ref = Main.tsrController.refer.getRef(refId, '');
					if (ref) {
						const mapping = Main.tsrController.mappings[ref.content.mappedLayer];
						if (mapping) {
							fullConfigClient.sourceReferenceLayers[sourceId] = {
								channel: mapping.channel,
								layer: mapping.layer
							};
						}
					}
				});

				event.reply('new-config', fullConfigClient);
			});
		});
		ipcMain.on('update-cutout', (event, cutoutId: string, cutout: Cutout) => {
			console.log('update-cutout handler', cutoutId, cutout);
			Main.dataHandler
				.setConfigCutout(cutoutId, cutout)
				.then(() => {
					const fullConfig = Main.dataHandler.getConfig();
					console.log('fullConfig.cutouts', fullConfig.cutouts);
					Main.updateTimeline();
				})
				.catch(console.error);
		});
		ipcMain.on('take', (event, cutoutId: string) => {
			console.log('TAKE', cutoutId);
			Main.runtimeData.pgmCutout = cutoutId;

			Main.updateTimeline();
		});
	}

	private static updateTimeline() {
		Main.tsrController.updateTimeline(Main.dataHandler.getConfig(), Main.runtimeData);
	}

	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	private static onActivate(): void {
		if (Main.mainWindow === null) {
			Main.onReady();
		}
	}

	static main(app: Electron.App, browserWindow: typeof BrowserWindow): void {
		Main.BrowserWindow = browserWindow;
		Main.application = app;
		Main.application.on('window-all-closed', Main.onWindowAllClosed);
		Main.application.on('ready', Main.onReady);
		Main.application.on('activate', Main.onActivate);

		Main.tsrController = new TSRController();
		Main.dataHandler = new DataHandler(app.getAppPath());
	}
}
