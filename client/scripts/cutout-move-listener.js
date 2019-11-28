const {ipcRenderer} = require('electron')

export {init}

function init () {
  document.addEventListener('cutout-move', (event) => {
    const {source, x, y, width, height} = event.detail;

    ipcRenderer.send('cutout-move', {source, x, y, width, height})
  })
}