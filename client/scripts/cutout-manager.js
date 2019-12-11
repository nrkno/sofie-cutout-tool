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

	console.log('newFullConfig received', newFullConfig)

	// Note: How this is handled is very much a draft
	// It should be replaced by something more intelligent later

	// Reset container and recreate cutouts:
	const container = document.getElementById('cropper-container')
	container.innerHTML = ''

	for (let cutoutId in newFullConfig.cutouts) {
		var cropper = document.createElement('video-cropper');
		container.appendChild(cropper);
		cropper.setAttribute('id', cutoutId) // this is kind of a hack to trigger an update in VideoCropper.attributeChangedCallback
	}
})
