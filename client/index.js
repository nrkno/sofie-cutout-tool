const { ipcRenderer } = require('electron')

import CutoutManager from './scripts/cutout-manager.js'
import { write } from '../lib/config.js'
import { EventNames } from '../shared/events.js'

new CutoutManager(ipcRenderer)

ipcRenderer.on(EventNames.UPDATE_CONFIG, (event, newFullConfig) => {
	// A new config is received from the backend.
	write(newFullConfig)
	document.dispatchEvent(new CustomEvent(EventNames.UPDATE_CONFIG))
})
