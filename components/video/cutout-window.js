import { clamp } from '../../lib/math.js';
import { getElementHeight, getElementWidth } from '../../lib/dimensions.js';
import { aspectRatios, calcAspectRatio } from '../../lib/aspect-ratios.js';

export { tagName, attributeNames, eventNames };

const tagName = 'cutout-window';

const classNames = {
	CONTAINER: 'cutout-window--container',
	CROP_FRAME: 'cutout-window--frame'
};

const containerArClassnames = {
	AR1_1_FROM_16_9: 'crop11src169',
	AR9_16_FROM_16_9: 'crop916src169'
};

const attributeNames = {
	SRC: 'data-source',
	CUTOUT: 'data-cutout'
};

const eventNames = {
	MOVE: 'cutout-move',
	UPDATE_FRAME_SIZE: 'update-frame-size'
};

const innerHtml = `
<link rel="stylesheet" href="./components/video/cutout-window.css" />
<div class="${classNames.CONTAINER}">
	<div class="${classNames.CROP_FRAME}"></div>
</div>
`;

class CutoutWindow extends HTMLElement {
	static get observedAttributes() {
		return Object.values(attributeNames);
	}

	constructor() {
		super();

		const shadowRoot = this.attachShadow({ mode: 'open' });
		shadowRoot.innerHTML = innerHtml;

		this.container = shadowRoot.querySelector(`.${classNames.CONTAINER}`);
		this.frame = shadowRoot.querySelector(`.${classNames.CROP_FRAME}`);

		this.source = null;
		this.cutout = null;
		this.scale = 1;
	}

	connectedCallback() {
		console.log(`<${tagName}> connected`, this);

		this.setupEventListeners();
		this.source = this.updateCutoutFromAttribute();
		this.setFrameSize();
		// this.moveCrop(this.cutout.x, this.cutout.y);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		console.log(`<${tagName}>.attributeChangedCallback()`, name, newValue);
		switch (name) {
			case attributeNames.CUTOUT:
				this.updateCutoutFromAttribute();
				this.calcScale();
				this.setFrameSize();
				break;
			case attributeNames.SRC:
				this.setSourceFromAttribute();
				this.calcScale();
				this.setFrameSize();
				break;
		}
	}

	/**
	 * Calculate and update the scale for conversions between screenspace and
	 * video source coordinates.
	 */
	calcScale() {
		if (!this.source || !this.source.width) {
			console.warn('Unable to calculate scale, source width not defined', this.source);
		}
		this.scale = getElementWidth(this) / this.source.width;
	}

	updateCutoutFromAttribute() {
		const attributeValue = this.getAttribute(attributeNames.CUTOUT);
		try {
			const { width, height, x, y, source } = JSON.parse(attributeValue);
			const cutout = {
				width: Number(width),
				height: Number(height),
				x: Number(x),
				y: Number(y)
			};
			if (Object.values(cutout).find(Number.isNaN)) {
				throw new Error(`NaN value in input data`, attributeValue);
			}
			cutout.source = source; // source isn't a Number
			this.cutout = cutout;
			console.log('Using cutout', this.cutout);
		} catch (error) {
			console.warn(`Unable to set cutout from attribute value ${attributeValue}`, error);
		}
	}

	setSourceFromAttribute() {
		const sourceString = this.getAttribute(attributeNames.SRC);
		try {
			this.source = JSON.parse(sourceString);
		} catch (error) {
			console.warn('Unable to update source from attribute', error, sourceString);
		}
	}

	setFramePosition() {
		const { x, y } = this.cutout;
		this.frame.style.left = `${x * this.scale}px`;
		this.frame.style.top = `${y * this.scale}px`;

		this.setPassepartoutPosition();
	}

	setPassepartoutPosition() {
		/**
		 * For now, this assumes that the src ar is equal to or wider than the cutout ar.
		 * In other words, this assumption is wrong if going from 9:16 to 1:1.
		 */
		/* The passepartout backgrounds are constructed after the following rules:
			- the cutout is placed in the middle of the background and is fully transparent
			- on both sides of the cutout there is exactly the amount of non-transparent 
				space needed for the container to be fully covered when the cutout is placed
				on either edge.
			
			This means that for a 1:1 cutout for a 16:9 source the background is built up
			like this:
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
			calculated scale. Considering the construction rules for the passepartouts we can therefore defer
			the following:
			- distance from left edge of background to left edge of transparent area equals container width - cutout width * scale
			- distance from the top edge of background to top edge of transparent area equals container height - cutout height * scale
		*/
		const backgroundOffsetX = getElementWidth(this.container) - getElementWidth(this.frame);
		const backgroundOffsetY = getElementHeight(this.container) - getElementHeight(this.frame);

		const xPos = this.cutout.x * this.scale - backgroundOffsetX;
		const yPos = this.cutout.y * this.scale - backgroundOffsetY;

		this.container.style.backgroundPositionX = `${xPos}px`;
		this.container.style.backgroundPositionY = `${yPos}px`;
	}

	setFrameSize() {
		if (!this.cutout) {
			console.warn('Unable to set cutout frame size, cutout definition missing');
			return;
		}

		const container = this.shadowRoot.querySelector(`.${classNames.CONTAINER}`);
		const cutoutFrame = this.shadowRoot.querySelector(`.${classNames.CROP_FRAME}`);
		const ar = calcAspectRatio(this.cutout);

		if (!ar) {
			console.log('No aspect ratio set for cutout, unable to set frame size');
			return;
		}
		console.log('Using AR', ar);
		switch (ar) {
			case aspectRatios['1_1']:
				container.classList.add(containerArClassnames.AR1_1_FROM_16_9);
				container.classList.remove(
					Object.values(containerArClassnames).filter(
						(className) => className !== containerArClassnames.AR1_1_FROM_16_9
					)
				);
				break;
			case aspectRatios['9_16']:
				container.classList.add(containerArClassnames.AR9_16_FROM_16_9);
				container.classList.remove(
					Object.values(containerArClassnames).filter(
						(className) => className !== containerArClassnames.AR9_16_FROM_16_9
					)
				);
				break;
			default:
				console.log(
					`Unknown aspect ratio ${ar}, wanted one of ${Object.values(aspectRatios).join(',')}`
				);
		}

		const height = getElementHeight(cutoutFrame);
		const width = ar * height;
		console.log(`Cutout frame: ${width}x${height}`);

		cutoutFrame.style.width = `${width}px`;
		this.setFramePosition();
	}

	setupEventListeners() {
		this.addEventListener('drag', (event) => {
			// console.log(event)
		});
		this.addEventListener('mousedown', (event) => {
			event.preventDefault();
			// console.log('mousedown')
			this.mouseDown = true;
		});
		document.addEventListener('mouseup', (event) => {
			event.preventDefault();
			this.mouseDown = false;
		});
		document.body.addEventListener('mousemove', (event) => {
			if (this.mouseDown) {
				this.moveCrop(event.movementX, event.movementY);
			}
		});

		this.addEventListener('touchmove', (event) => {
			// console.log('touchmove')
			if (event.target.isSameNode(this.frame)) {
				this.moveCropFromTouch(event);
			}
		});

		this.addEventListener('touchstart', (event) => {
			// console.log('touchstart')
			if (event.target.isSameNode(this.frame)) {
				this.moveCropFromTouch(event);
			}
		});

		this.addEventListener('touchend', (event) => {
			// console.log('touchend')
			if (event.target.isSameNode(this.frame)) {
				this.moveCropFromTouch(event);
			}
		});

		this.addEventListener(eventNames.UPDATE_FRAME_SIZE, () => {
			console.log(`<${tagName}>`, eventNames.UPDATE_FRAME_SIZE);
			this.setFrameSize();
		});
	}

	moveCropFromTouch(event) {
		if (!event) {
			return;
		}

		if (event.type === 'touchend') {
			delete this.activeTouch;
			return;
		}

		let touch;
		if (this.activeTouch) {
			console.log('event.targetTouches', event.targetTouches);
			for (let i = 0; i < event.targetTouches.length; i++) {
				let t = event.targetTouches[i];
				if (t.identifier === this.activeTouch.identifier) {
					touch = t;
					break;
				}
			}
			if (!touch) {
				delete this.activeTouch;
				touch = event.targetTouches[0];
			}
		} else {
			touch = event.targetTouches[0];
		}
		console.log('touch', touch.clientX, touch.clientY);

		if (touch && this.activeTouch && event.type === 'touchmove') {
			this.moveCrop(touch.pageX - this.activeTouch.x, touch.pageY - this.activeTouch.y);
		}

		if (touch) {
			this.activeTouch = {
				identifier: touch.identifier,
				x: touch.pageX,
				y: touch.pageY
			};
		} else {
			delete this.activeTouch;
		}
	}

	moveCrop(deltaX, deltaY) {
		console.log('moveCrop', deltaX, deltaY);

		const sourceDimensions = {};
		sourceDimensions.width = getElementWidth(this.container);
		sourceDimensions.width = getElementHeight(this.container);

		// set bounds for movable to avoid placing it outside the container
		const minX = -(sourceDimensions.width - this.cutout.width) / 2;
		const minY = -(sourceDimensions.height - this.cutout.height) / 2;
		const maxX = (sourceDimensions.width - this.cutout.width) / 2;
		const maxY = (sourceDimensions.height - this.cutout.height) / 2;

		// cutout values must be normalized according to src size
		this.cutout.x += deltaX / this.scale;
		this.cutout.y += deltaY / this.scale;

		this.cutout.x = clamp(this.cutout.x, minX, maxX);
		this.cutout.y = clamp(this.cutout.y, minY, maxY);

		this.emitMoveEvent();
	}

	emitMoveEvent() {
		const { width, height, x, y } = this.cutout;

		document.dispatchEvent(
			new CustomEvent(eventNames.MOVE, {
				bubbles: true,
				composed: true,
				detail: { source: null, width, height, x, y }
			})
		);
	}
}

customElements.define(tagName, CutoutWindow);
