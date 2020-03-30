export { tagName, attributeNames, eventNames }

const html = String.raw

const tagName = 'slider-toggle'

const attributeNames = {
	LABEL_TEXT: 'data-label-text'
}

const classNames = {
	LABEL_TEXT_ELEMENT: 'slider-toggle--label-text'
}

const eventNames = {
	TOGGLE_OFF: 'toggle-off',
	TOGGLE_ON: 'toggle-on'
}

const template = html`
	<link rel="stylesheet" href="./components/ui/slider-toggle.css" />
	<label class="slider-toggle--label">
		<span class="${classNames.LABEL_TEXT_ELEMENT}">Label</span>
		<div class="slider-toggle--slider-container">
			<input type="checkbox" class="slider-toggle--checkbox" />
			<span class="slider-toggle--slider round"></span>
		</div>
	</label>
`

class SliderToggle extends HTMLElement {
	constructor() {
		super()

		const shadowRoot = this.attachShadow({ mode: 'open' })
		shadowRoot.innerHTML = template

		this.checkbox = this.shadowRoot.querySelector('input')
	}

	connectedCallback() {
		const label = this.shadowRoot.querySelector(`.${classNames.LABEL_TEXT_ELEMENT}`)
		label.textContent = this.getAttribute(attributeNames.LABEL_TEXT)

		this.addEventListener('input', () => {
			const eventName =
				this.checkbox.checked === true ? eventNames.TOGGLE_ON : eventNames.TOGGLE_OFF

			this.dispatchEvent(
				new CustomEvent(eventName, {
					composed: true,
					bubbles: true
				})
			)
		})
	}
}
customElements.define(tagName, SliderToggle)
