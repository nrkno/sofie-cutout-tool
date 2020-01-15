import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

import { Cutout, Cutouts, FullConfig, Outputs, Sources } from './api';

const fsReadFile = util.promisify(fs.readFile);
const fsWriteFile = util.promisify(fs.writeFile);

export class DataHandler {
	private _onConfigChangedTimeout?: NodeJS.Timeout;
	private _lastTimeStoredCutouts = 0;

	constructor(private _basePath: string) {
		this._getConfigCutouts().catch(console.error);
	}
	public async requestConfig(): Promise<FullConfig> {
		return {
			cutouts: await this._getConfigCutouts(),
			outputs: await this._getConfigOutputs(),
			sources: await this._getConfigSources()
		};
	}
	public onConfigChanged(callback: () => void): void {
		const triggerCallback = (): void => {
			if (this._onConfigChangedTimeout) {
				clearTimeout(this._onConfigChangedTimeout);
			}
			this._onConfigChangedTimeout = setTimeout(() => {
				callback();
			}, 500);
		};
		chokidar.watch(this._getConfigPath('outputs.json')).on('all', () => {
			triggerCallback();
		});
		chokidar.watch(this._getConfigPath('sources.json')).on('all', () => {
			triggerCallback();
		});

		chokidar.watch(this._getConfigPath('cutouts.json')).on('all', () => {
			if (Date.now() - this._lastTimeStoredCutouts > 1000) {
				triggerCallback();
			}
		});
	}

	async setConfigCutout(cutoutId: string, cutout: Cutout): Promise<void> {
		const cutouts = await this._getConfigCutouts();
		cutouts[cutoutId] = cutout;
		this._lastTimeStoredCutouts = Date.now();
		await this._storeConfig('cutouts.json', {
			note:
				'This file is not intended to be manually edited, it will update when the user makes changes in the UI',
			cutouts: cutouts
		});
	}
	private async _getConfigCutouts(): Promise<Cutouts> {
		// TODO: add data verifications here..
		return (await this._getConfig('cutouts.json')).cutouts as Cutouts;
	}
	private async _getConfigOutputs(): Promise<Outputs> {
		// TODO: add data verifications here..
		return (await this._getConfig('outputs.json')).outputs as Outputs;
	}
	private async _getConfigSources(): Promise<Sources> {
		// TODO: add data verifications here..
		return (await this._getConfig('sources.json')).sources as Sources;
	}

	private async _getConfig(fileName: string): Promise<any> {
		const text = await fsReadFile(this._getConfigPath(fileName), {
			encoding: 'utf-8'
		});
		return JSON.parse(text);
	}
	private async _storeConfig(fileName: string, data: Record<string, any>): Promise<void> {
		await fsWriteFile(this._getConfigPath(fileName), JSON.stringify(data, null, 2), {
			encoding: 'utf-8'
		});
	}
	private _getConfigPath(fileName: string): string {
		return path.join(this._basePath, '/config', fileName);
	}
}
