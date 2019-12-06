const {ipcRenderer} = require('electron')

export {init}
document.fullConfig = {
	cutouts: {},
	outputs: {},
	sources: {}
} // TMP, we should change how to access this data

function init () {

	document.addEventListener('cutout-move', (event) => {
		const {source, x, y, width, height} = event.detail;

		ipcRenderer.send('cutout-move', {source, x, y, width, height})
	})

	ipcRenderer.send('initialize')
}


ipcRenderer.on('new-config', (event, newFullConfig) => {
	// A new config is received from the backend.
	document.fullConfig = newFullConfig
	console.log(newFullConfig)

	// Note: How this is handled is very much a draft

	// Reset container and recreate cutouts
	const container = document.getElementById('cropper-container')

	for( let child of container.childNodes) {
		container.removeChild(child);
	}

	for (let cutoutId in newFullConfig.cutouts) {
		// let cutout = newFullConfig.cutouts[cutoutId]
		// console.log(cutoutId, cutout)

		var cropper = document.createElement('video-cropper');
		container.appendChild(cropper);
		cropper.setAttribute('id', cutoutId) // this is kind of a hack to trigger an update in VideoCropper.attributeChangedCallback


	}
})

