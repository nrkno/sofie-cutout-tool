import {
	tagName as toggleTagName,
	attributeNames as toggleAttributeNames,
	eventNames as toggleEventNames
} from './slider-toggle.js'

export { tagName, eventNames }

const tagName = 'stream-control-switch'

const eventNames = {
	CONNECT: 'stream-control-connect',
	DISCONNECT: 'stream-control-disconnect'
}

class StreamControlSwitch extends HTMLElement {
	constructor() {
		super()

		const toggle = document.createElement(toggleTagName)
		toggle.setAttribute(toggleAttributeNames.LABEL_TEXT, 'On Air')

		this.attachShadow({ mode: 'open' }).appendChild(toggle)
	}

	connectedCallback() {
		this.addEventListener(toggleEventNames.TOGGLE_ON, (event) => {
			event.stopImmediatePropagation()
			this.connect()
		})

		this.addEventListener(toggleEventNames.TOGGLE_OFF, (event) => {
			event.stopImmediatePropagation()
			this.disconnect()
		})
	}

	connect() {
		this.dispatchEvent(new CustomEvent(eventNames.CONNECT, { composed: true, bubbles: true }))
	}

	disconnect() {
		this.dispatchEvent(new CustomEvent(eventNames.DISCONNECT, { composed: true, bubbles: true }))
	}
}
customElements.define(tagName, StreamControlSwitch)
