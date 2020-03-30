export { tagName, eventNames }

const tagName = 'sources-reload'

const eventNames = {
	RELOAD: 'reload-source-streams'
}

class SourcesReload extends HTMLButtonElement {
	constructor() {
		super()
	}

	connectedCallback() {
		this.addEventListener('click', () => {
			this.dispatchEvent(new CustomEvent(eventNames.RELOAD, { composed: true, bubbles: true }))
		})
	}
}
customElements.define(tagName, SourcesReload, { extends: 'button' })
