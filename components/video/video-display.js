import { getElementWidth } from '../../lib/dimensions.js'
import { getImageProviderLocation } from '../../lib/config.js'

const html = String.raw

export { tagName, attributeNames, eventNames }

const tagName = 'video-display'

const attributeNames = {
	STREAM_CONTENT_ID: 'data-stream-content-id'
}

/*
  WARNING: These class names are also used in the stylesheet, and so they must
  be changed there if they are changed here.
*/
const classNames = {
	CONTAINER: 'video-display--container',
	AR_PLACEHOLDER: 'ar-placeholder',
	IMG: 'img'
}

const eventNames = {
	STREAM_PLAYING: 'stream-playing'
}

const template = html`
	<link rel="stylesheet" href="./components/video/video-display.css" />
	<div class="${classNames.CONTAINER}">
		<div class="${classNames.AR_PLACEHOLDER}"></div>
		<img class="${classNames.IMG}" />
	</div>
`

/**
 * A custom element for displaying a video stream provided by an instance
 * of {@link https://github.com/SuperFlyTV/casparCG-image-provider Casparcg Image Provider}.
 *
 */
class VideoDisplay extends HTMLElement {
	static get observedAttributes() {
		return Object.values(attributeNames)
	}

	constructor() {
		super()

		const shadowRoot = this.attachShadow({ mode: 'open' })
		shadowRoot.innerHTML = template

		this.streamContentId = this.getAttribute(attributeNames.STREAM_CONTENT_ID)
	}

	connectedCallback() {
		const img = this.shadowRoot.querySelector(`img.${classNames.IMG}`)
		img.addEventListener('load', () => {
			this.dispatchStreamPlaying()
		})
		img.addEventListener('error', function(e) {
			console.warn('Error loading video stream', e)
		})

		this.loadStream()

		// https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API
		const resizeObserver = new ResizeObserver(() => {
			this.resize()
		})
		resizeObserver.observe(this)
	}

	attributeChangedCallback(name, oldValue, currentValue) {
		if (name === attributeNames.STREAM_CONTENT_ID) {
			if (this.streamContentId !== currentValue) {
				this.streamContentId = currentValue
				this.loadStream()
			}
		}
	}

	dispatchStreamPlaying() {
		const event = new CustomEvent(eventNames.STREAM_PLAYING, { bubbles: true, composed: true })
		this.dispatchEvent(event)
	}

	loadStream() {
		const img = this.shadowRoot.querySelector(`img.${classNames.IMG}`)

		if (!this.streamContentId) {
			console.warn(`Unable to load stream, missing data: streamContentId: ${this.streamContentId}`)
			img.src = 'data:,' // could use a placeholder?
			img.setAttribute('alt', '')
			return
		}

		const imageProviderLocation = getImageProviderLocation()
		const streamUrl = `${imageProviderLocation}/info`

		fetch(streamUrl)
			.then((response) => response.json())
			.then((streamInfo) => {
				const region = streamInfo.regions.find((r) => r.contentId === this.streamContentId)
				if (!region) {
					throw new Error(
						`Region for contentId ${this.streamContentId} not found using ${streamUrl}`
					)
				}
				this.region = region

				const stream = streamInfo.streams.find((s) => s.id == region.streamId)
				if (!stream) {
					throw new Error(`Stream ${region.streamId} not found`)
				}

				const srcUrl = imageProviderLocation + stream.url
				if (img.src !== srcUrl) {
					img.src = srcUrl
				} else {
					this.dispatchStreamPlaying()
				}

				this.resize()
			})
			.catch(console.error)
	}

	resize() {
		if (!this.region) {
			return
		}

		const img = this.shadowRoot.querySelector(`img.${classNames.IMG}`)
		const container = this.shadowRoot.querySelector(`.${classNames.CONTAINER}`)
		const arPlaceholder = this.shadowRoot.querySelector(`.${classNames.AR_PLACEHOLDER}`)
		const scale = calcTransformScale(this.shadowRoot.host, this.region)
		const containerDimensions = {
			width: Math.round(this.region.width * scale),
			height: Math.round(this.region.height * scale)
		}

		img.style.transform = getCSSTransformString(scale, this.region)
		container.style.width = containerDimensions.width
		arPlaceholder.style.paddingBottom = `${containerDimensions.height}px`
	}
}

customElements.define(tagName, VideoDisplay)

function calcTransformScale(container, region) {
	const width = getElementWidth(container)
	return width / region.width
}

function getCSSTransformString(scale, region) {
	/* Note that the transforms depend on transform-origin: top left, which is
	set in the component stylesheet */
	const transforms = []

	transforms.push(`scale3d(${scale},${scale}, 1)`)
	transforms.push(`translate3d(${-region.x}px, ${-region.y}px, 0)`)

	return transforms.join(' ')
}
