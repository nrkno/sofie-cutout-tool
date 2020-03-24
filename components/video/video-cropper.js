import {
	tagName as videoDisplayTagName,
	attributeNames as videoDisplayAttributeNames,
	eventNames as videoDisplayEventNames
} from './video-display.js'

import {
	tagName as cropToolTagName,
	attributeNames as cropToolAttributeNames,
	eventNames as cropToolEventNames
} from './cutout-window.js'
import { get as getConfigValue } from '../../lib/config.js'
import { EventNames } from '../../shared/events.js'

const html = String.raw

export { tagName, attributeNames, eventNames }

const tagName = 'video-cropper'

/* These must be kept in sync with this element's stylesheet */
const classNames = {
	CONTAINER: 'video-cropper--container',
	CONTENT: 'video-cropper--content'
}

const attributeNames = {
	CUTOUT_ID: 'data-cutout-id'
}

const eventNames = {
	CROP_MOVE: 'crop-move'
}

const template = html`
	<link rel="stylesheet" href="./components/video/video-cropper.css" />
	<div class="${classNames.CONTAINER}"></div>
`

class VideoCropper extends HTMLElement {
	constructor() {
		super()

		const shadowRoot = this.attachShadow({ mode: 'open' })
		shadowRoot.innerHTML = template

		this.container = shadowRoot.querySelector(`.${classNames.CONTAINER}`)

		this.videoDisplay = document.createElement(videoDisplayTagName)
		this.videoDisplay.classList.add(classNames.CONTENT)
		this.container.appendChild(this.videoDisplay)

		this.cropTool = document.createElement(cropToolTagName)
		this.cropTool.classList.add(classNames.CONTENT)
		this.container.appendChild(this.cropTool)
	}

	static get observedAttributes() {
		return Object.values(attributeNames)
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case attributeNames.CUTOUT_ID:
				if (newValue) {
					this.updateId(newValue)
				}
				break
		}
	}

	connectedCallback() {
		if (this.hasAttribute(attributeNames.CUTOUT_ID)) {
			this.updateId(this.getAttribute(attributeNames.CUTOUT_ID))
		}

		this.addEventListener(videoDisplayEventNames.STREAM_PLAYING, () => {
			this.cropTool.dispatchEvent(new CustomEvent(cropToolEventNames.UPDATE_FRAME_SIZE))
		})

		this.addEventListener(cropToolEventNames.MOVE, (event) => {
			event.stopPropagation()
			const { width, height, x, y } = event.detail
			const centeredPosition = transformTopLeftToCenterOrigo({ x, y, width, height }, this.source)
			this.cutout = Object.assign({}, this.cutout, {
				width,
				height,
				x: centeredPosition.x,
				y: centeredPosition.y
			})
			this.triggerSendUpdate()
		})

		document.addEventListener(EventNames.UPDATE_CONFIG, () => {
			if (this.cutoutId) {
				this.updateId(this.cutoutId)
			}
		})
	}

	updateId(id) {
		const cutouts = getConfigValue('cutouts')
		const sources = getConfigValue('sources')
		const sourceReferenceLayers = getConfigValue('sourceReferenceLayers')

		if (!cutouts[id]) {
			this.cutoutId = null
			this.source = null
			this.cropTool.setAttribute(cropToolAttributeNames.CUTOUT, '')
			this.videoDisplay.setAttribute(videoDisplayAttributeNames.STREAM_CONTENT_ID, '')
			return
		}

		this.cutoutId = id
		this.cutout = Object.assign({}, cutouts[id])
		const sourceId = this.cutout.source
		this.source = sources[sourceId]

		const topLeftPosition = transformCenterToTopLeft(this.cutout, this.source)
		const topLeftCutout = Object.assign({}, this.cutout, topLeftPosition)
		this.cropTool.setAttribute(cropToolAttributeNames.CUTOUT, JSON.stringify(topLeftCutout))

		const { contentId } = sourceReferenceLayers[sourceId]
		this.videoDisplay.setAttribute(videoDisplayAttributeNames.STREAM_CONTENT_ID, contentId)
	}

	triggerSendUpdate() {
		if (!this.sendUpdateTimeout) {
			this.sendUpdateTimeout = setTimeout(() => {
				this.sendUpdateTimeout = null

				const event = new CustomEvent(eventNames.CROP_MOVE, {
					bubbles: true,
					composed: true,
					detail: {
						cutoutId: this.cutoutId,
						cutout: this.cutout
					}
				})
				this.dispatchEvent(event)
			}, 40)
		}
	}
}

customElements.define(tagName, VideoCropper)

function transformTopLeftToCenterOrigo(cutout, source) {
	const cutoutOrigoX = cutout.x + cutout.width / 2
	const cutoutOrigoY = cutout.y + cutout.height / 2

	return {
		x: cutoutOrigoX - source.width / 2,
		y: cutoutOrigoY - source.height / 2
	}
}

function transformCenterToTopLeft(cutout, source) {
	const cutoutOrigoX = cutout.x - cutout.width / 2
	const cutoutOrigoY = cutout.y - cutout.height / 2

	return {
		x: cutoutOrigoX + source.width / 2,
		y: cutoutOrigoY + source.height / 2
	}
}
