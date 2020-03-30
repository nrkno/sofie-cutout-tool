import {
	tagName as toggleTagName,
	attributeNames as toggleAttributeNames,
	eventNames as toggleEventNames
} from './slider-toggle.js'

export { tagName, eventNames }

const tagName = 'direct-take-toggle'

const eventNames = {
	ACTIVATE: 'direct-take-activated',
	DEACTIVATE: 'direct-take-deactivated'
}

class DirectTakeToggle extends HTMLElement {
	constructor() {
		super()

		const toggle = document.createElement(toggleTagName)
		toggle.setAttribute(toggleAttributeNames.LABEL_TEXT, 'Direkte Take')

		this.attachShadow({ mode: 'open' }).appendChild(toggle)
	}

	connectedCallback() {
		this.addEventListener(toggleEventNames.TOGGLE_ON, (event) => {
			event.stopImmediatePropagation()
			this.activate()
		})

		this.addEventListener(toggleEventNames.TOGGLE_OFF, (event) => {
			event.stopImmediatePropagation()
			this.deactivate()
		})
	}

	deactivate() {
		this.dispatchEvent(new CustomEvent(eventNames.DEACTIVATE, { composed: true, bubbles: true }))
	}

	activate() {
		this.dispatchEvent(new CustomEvent(eventNames.ACTIVATE, { composed: true, bubbles: true }))
	}
}
customElements.define(tagName, DirectTakeToggle)
