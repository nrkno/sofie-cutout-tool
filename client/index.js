const { ipcRenderer } = require('electron');

import CutoutManager from './scripts/cutout-manager.js';
import { write } from '../lib/config.js';

/* using console.log from inside init for some reason doesn't work,
so here's this monstrosity */
const logger = {
	log: (args) => {
		console.log('logger.log()', args);
	},
	warn: (args) => console.warn(args),
	error: (args) => console.error(args),
	info: (args) => console.info(args)
};

const cutoutManager = new CutoutManager(ipcRenderer);

ipcRenderer.on('new-config', (event, newFullConfig) => {
	// A new config is received from the backend.
	write(newFullConfig);

	logger.log('newFullConfig received', newFullConfig);

	document.dispatchEvent(new CustomEvent('new-config'));
});
