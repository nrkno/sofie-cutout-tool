import { clamp } from '../../lib/math.js'
import { getElementHeight, getElementWidth } from '../../lib/dimensions.js'
import { aspectRatios, calcAspectRatio } from '../../lib/aspect-ratios.js'
import { get as getConfigValue } from '../../lib/config.js'
import { EventNames as applicationEvents } from '../../shared/events.js'

const html = String.raw

export { tagName, attributeNames, eventNames }

const tagName = 'cutout-window'

const classNames = {
	CONTAINER: 'cutout-window--container',
	CROP_FRAME: 'cutout-window--frame',
	CROP_FRAME_BOTTOM_BAR: 'cutout-window--frame--handlebar-bottom'
}

const containerArClassnames = {
	AR1_1_FROM_16_9: 'crop11src169',
	AR9_16_FROM_16_9: 'crop916src169'
}

const attributeNames = {
	SRC: 'data-source',
	CUTOUT: 'data-cutout'
}

const eventNames = {
	MOVE: 'cutout-move',
	UPDATE_FRAME_SIZE: 'update-frame-size'
}

const template = html`
	<link rel="stylesheet" href="./components/video/cutout-window.css" />
	<div class="${classNames.CONTAINER}">
		<div class="${classNames.CROP_FRAME}">
			<div class="${classNames.CROP_FRAME_BOTTOM_BAR}"></div>
		</div>
	</div>
`

class CutoutWindow extends HTMLElement {
	static get observedAttributes() {
		return Object.values(attributeNames)
	}

	constructor() {
		super()

		const shadowRoot = this.attachShadow({ mode: 'open' })
		shadowRoot.innerHTML = template

		this.container = shadowRoot.querySelector(`.${classNames.CONTAINER}`)
		this.frame = shadowRoot.querySelector(`.${classNames.CROP_FRAME}`)

		this.source = null
		this.cutout = null
		this.screenSpaceScale = 1
		this.cutoutScale = 1

		this.movementThreshold = getConfigValue('settings.ui.inputJitterCutoff') || 0
		console.log(`Initialized cutout window using movement threshold of ${this.movementThreshold}`)
	}

	connectedCallback() {
		this.setupEventListeners()
		this.updateCutoutFromAttribute()

		const resizeObserver = new ResizeObserver(() => {
			this.calcScreenspaceScale()
			this.setFrameSizeAndPosition()
		})
		resizeObserver.observe(this)
	}

	attributeChangedCallback(name) {
		switch (name) {
			case attributeNames.CUTOUT:
				this.updateCutoutFromAttribute()
				this.setFrameSizeAndPosition()
				break
		}
	}

	/**
	 * Calculate and update the scale for conversions between screenspace and
	 * video source coordinates.
	 */
	calcScreenspaceScale() {
		if (!this.source) {
			console.warn('Unable to calculate screenspace scale, source width not defined', this.source)
		}
		this.screenSpaceScale = getElementWidth(this) / this.source.width
	}

	updateCutoutFromAttribute() {
		const attributeValue = this.getAttribute(attributeNames.CUTOUT)
		try {
			const { width, height, x, y, source } = JSON.parse(attributeValue)
			const cutout = {
				width: Number(width),
				height: Number(height),
				x: Number(x),
				y: Number(y)
			}
			if (Object.values(cutout).find(Number.isNaN)) {
				throw new Error(`NaN value in input data`, attributeValue)
			}
			cutout.source = source // source isn't a Number
			this.cutout = cutout
			this.setSource()
			this.setFrameSizeAndPosition()
		} catch (error) {
			this.cutout = null
			this.source = null
			console.warn(`Unable to set cutout from attribute value ${attributeValue}`, error)
		}
	}

	setSource() {
		const source = getConfigValue(`sources.${this.cutout.source}`)
		if (source) {
			this.source = source
			this.calcScreenspaceScale()
			const cutoutScaleFactor = calcCutoutToSourceScale(this.cutout, source)
			this.scaleCutout(cutoutScaleFactor)
		} else {
			console.warn(`Can't get source ${this.cutout.source} from config`)
		}
	}

	scaleCutout(factor) {
		this.cutout.width *= factor
		this.cutout.height *= factor
	}

	setFrameSizeAndPosition() {
		if (!this.cutout) {
			this.frame.style.width = 0
			this.frame.style.height = 0
			this.container.classList.remove(...Object.values(containerArClassnames))
			return
		}
		this.setFrameSize()
		this.setFramePosition()
	}

	setFramePosition() {
		const { x, y } = this.cutout
		this.frame.style.left = `${x * this.screenSpaceScale}px`
		this.frame.style.top = `${y * this.screenSpaceScale}px`

		this.setPassepartoutPosition()
	}

	setPassepartoutPosition() {
		/* The passepartout backgrounds are constructed after the following rules:
			- the cutout is placed in the middle of the background and is fully transparent
			- on both sides of the cutout there is exactly the amount of non-transparent 
				space needed for the container to be fully covered when the cutout is placed
				on either edge.
			
			This means that for a 1:1 cutout for a 16:9 source the background is built up
			like this from left to right, all areas in full height:
				1: 7 units of non-transparent space
				2: 9 units of transparent space
				3: 7 units of non-transparent space

			For a 9:16 cutout from a 16:9 source the background is built up like this:
				1: 175 units of non-transparent space
				2: 81 units of transparent space
				3: 175 units of transparent space

			The background is scaled in CSS too 100% height of the container, which means 
			that the transparent area will be the same size as the cutout frame. To position 
			the transparent area at the same position as the cutout frame we therefore must
			set the background position property so that the edges line up.

			This background position can be calculated like this:
				x = scaled cutout frame x - distance from background left edge to left edge of transparent area
				y = scaled cutout frame y - distance from background top edge to top edge of transparent area

			Since the background is scaled to the container, it will have the same scale as this component's
			cutout frame. Considering the construction rules for the passepartouts we can therefore defer
			the following:
			- distance from left edge of background to left edge of transparent area equals container width - cutout frame width
			- distance from the top edge of background to top edge of transparent area equals container height - cutout frame height
		*/
		const backgroundOffsetX = getElementWidth(this.container) - getElementWidth(this.frame)
		const backgroundOffsetY = getElementHeight(this.container) - getElementHeight(this.frame)

		const xPos = this.cutout.x * this.screenSpaceScale - backgroundOffsetX
		const yPos = this.cutout.y * this.screenSpaceScale - backgroundOffsetY

		this.container.style.backgroundPosition = `${xPos}px ${yPos}px`
	}

	setFrameSize() {
		if (!this.cutout) {
			console.warn('Unable to set cutout frame size, cutout definition missing')
			return
		}

		const container = this.shadowRoot.querySelector(`.${classNames.CONTAINER}`)
		const cutoutFrame = this.shadowRoot.querySelector(`.${classNames.CROP_FRAME}`)
		const ar = calcAspectRatio(this.cutout)

		if (!ar) {
			console.warn('No aspect ratio set for cutout, unable to set frame size')
			return
		}

		switch (ar) {
			case aspectRatios['1_1']:
				container.classList.add(containerArClassnames.AR1_1_FROM_16_9)
				container.classList.remove(
					Object.values(containerArClassnames).filter(
						(className) => className !== containerArClassnames.AR1_1_FROM_16_9
					)
				)
				break
			case aspectRatios['9_16']:
				container.classList.add(containerArClassnames.AR9_16_FROM_16_9)
				container.classList.remove(
					Object.values(containerArClassnames).filter(
						(className) => className !== containerArClassnames.AR9_16_FROM_16_9
					)
				)
				break
			default:
				console.warn(
					`Unknown aspect ratio ${ar}, wanted one of ${Object.values(aspectRatios).join(',')}`
				)
		}

		const { width, height } = this.cutout
		cutoutFrame.style.width = `${width * this.screenSpaceScale}px`
		cutoutFrame.style.height = `${height * this.screenSpaceScale}px`
	}

	setupEventListeners() {
		document.addEventListener(applicationEvents.UPDATE_CONFIG, () => {
			this.movementThreshold = getConfigValue('settings.ui.inputJitterCutoff') || 0
			console.log(`Updated movement threshold after config change: ${this.movementThreshold}`)
		})

		this.frame.addEventListener('mousedown', (event) => {
			event.preventDefault()
			this.mouseDown = true
		})
		document.addEventListener('mouseup', (event) => {
			event.preventDefault()
			this.mouseDown = false
		})
		document.body.addEventListener('mousemove', (event) => {
			if (this.mouseDown) {
				this.moveCrop(event.movementX, event.movementY)
			}
		})

		this.shadowRoot.addEventListener('touchmove', (event) => {
			if (event.target.isSameNode(this.frame)) {
				this.moveCropFromTouch(event)
			}
		})

		this.shadowRoot.addEventListener('touchstart', (event) => {
			if (event.target.isSameNode(this.frame)) {
				this.moveCropFromTouch(event)
			}
		})

		this.shadowRoot.addEventListener('touchend', (event) => {
			if (event.target.isSameNode(this.frame)) {
				this.moveCropFromTouch(event)
			}
		})

		this.addEventListener(eventNames.UPDATE_FRAME_SIZE, () => {
			this.setFrameSizeAndPosition()
		})
	}

	moveCropFromTouch(event) {
		if (!event) {
			return
		}

		if (event.type === 'touchend') {
			delete this.activeTouch
			return
		}

		let touch
		if (this.activeTouch) {
			for (let i = 0; i < event.targetTouches.length; i++) {
				let t = event.targetTouches[i]
				if (t.identifier === this.activeTouch.identifier) {
					touch = t
					break
				}
			}
			if (!touch) {
				delete this.activeTouch
				touch = event.targetTouches[0]
			}
		} else {
			touch = event.targetTouches[0]
		}

		if (touch && this.activeTouch && event.type === 'touchmove') {
			this.moveCrop(touch.pageX - this.activeTouch.x, touch.pageY - this.activeTouch.y)
		}

		if (touch) {
			this.activeTouch = {
				identifier: touch.identifier,
				x: touch.pageX,
				y: touch.pageY
			}
		} else {
			delete this.activeTouch
		}
	}

	moveCrop(deltaX, deltaY) {
		// anti jitter measure
		deltaX = Math.abs(deltaX) > this.movementThreshold ? deltaX : 0
		deltaY = Math.abs(deltaY) > this.movementThreshold ? deltaY : 0
		if (deltaX === 0 && deltaY === 0) {
			// nothing to process
			return
		}

		// normalize screenspace coordinates
		const scaledDeltaX = deltaX / this.screenSpaceScale
		const scaledDeltaY = deltaY / this.screenSpaceScale

		// add delta to current coordinates
		const x = this.cutout.x + scaledDeltaX
		const y = this.cutout.y + scaledDeltaY

		// avoid cutout outside of source dimensions
		this.cutout.x = clamp(x, 0, this.source.width - this.cutout.width)
		this.cutout.y = clamp(y, 0, this.source.height - this.cutout.height)

		this.setFrameSizeAndPosition()
		this.emitMoveEvent()
	}

	emitMoveEvent() {
		if (!this.cutout) {
			return
		}
		const { width, height, x, y, source } = this.cutout

		this.dispatchEvent(
			new CustomEvent(eventNames.MOVE, {
				bubbles: true,
				composed: true,
				detail: { source, width, height, x, y }
			})
		)
	}
}
customElements.define(tagName, CutoutWindow)

function calcCutoutToSourceScale(cutout, source) {
	if (!source) {
		console.warn('Unable to calculate cutout to source scale, source data missing')
	}
	if (!cutout) {
		console.warn('Unable to calculate cutout to source scale, cutout data missing')
	}

	const yDiff = source.height - cutout.height
	const xDiff = source.width - cutout.width

	// We're doing greedy cutouts, meaning that we want as much image data as
	// possible. Therefore one of the cutout dimensions (either width or
	// height) should stretch to the corresponding boundary of the source.
	// We must however still ensure that the cutout doesn't exceed any
	// source boundary.
	// If the cutout is bigger than the source it must be scaled down
	// In that case we must use the highest negative diff to ensure
	// the cutout doesn't exceed source dimensions. This means using
	// the lowest value diff.
	// If the cutout is smaller than the source it must be scaled up.
	// In that case we use the closest distance to ensure that
	// the upscaled cutout ends up being bigger than the source

	// no matter the situation yDiff < xDiff means using height/height
	// so this can be simplified.

	return yDiff < xDiff ? source.height / cutout.height : source.width / cutout.width
}
