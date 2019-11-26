const {ipcRenderer} = require('electron')

const innerHTML = `<link rel="stylesheet" href="./components/test-component.css" />
<section class="test-component">
  <p>This is a custom component</p>
</section>`

class TestComponent extends HTMLElement {
  constructor() {
    super();

    this.ipcRenderer = ipcRenderer
    this.ipcRenderer.on('whatevz', (event, message) => {
      console.log(`got whatevz ${message} from ${event.senderId}`)
    })
    this.ipcRenderer.on('whatever', (event, message) => {
      console.log(`got whatever ${message} from ${event.senderId}`)
    })

    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = innerHTML;
  }

  connectedCallback () {
    console.log('test-component connected')
    console.log('async:', this.ipcRenderer.send('whatever', 'ping'))
    console.log('sync:', this.ipcRenderer.sendSync('whatever', 'ping'))
  }
}

customElements.define('test-component', TestComponent);
