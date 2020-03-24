export { tagName, eventNames }

const tagName = 'direct-take-toggle'

const eventNames = {
	ACTIVATE: 'direct-take-activated',
	DEACTIVATE: 'direct-take-deactivated'
}

const classNames = {
	ARMED: 'armed'
}

class DirectTakeToggle extends HTMLButtonElement {
	constructor() {
		super()
	}

	connectedCallback() {
		this.addEventListener('click', () => {
			this.handleClick()
		})
	}

	handleClick() {
		if (this.classList.contains(classNames.ARMED)) {
			this.deactivate()
		} else {
			this.activate()
		}
	}

	deactivate() {
		this.classList.remove(classNames.ARMED)
		this.dispatchEvent(new CustomEvent(eventNames.DEACTIVATE, { composed: true, bubbles: true }))
	}

	activate() {
		this.classList.add(classNames.ARMED)
		this.dispatchEvent(new CustomEvent(eventNames.ACTIVATE, { composed: true, bubbles: true }))
	}
}
customElements.define(tagName, DirectTakeToggle, { extends: 'button' })
