import { clamp } from '../../lib/math.js';
import { getElementHeight, getElementWidth } from '../../lib/dimensions.js';
import { aspectRatios } from '../../lib/aspect-ratios.js';

export { tagName, attributeNames, eventNames };

const tagName = 'cutout-window';

const classNames = {
	CONTAINER: 'cutout-window--container',
	CROP_FRAME: 'cutout-window--frame',
	AR1_1_FROM_16_9: 'crop11src169',
	AR9_16_FROM_16_9: 'crop916src169'
};

const attributeNames = {
	SRC: 'data-source',
	CUTOUT_AR: 'data-cutout-ar'
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
	constructor() {
		super();

		const shadowRoot = this.attachShadow({ mode: 'open' });
		shadowRoot.innerHTML = innerHtml;

		this.container = shadowRoot.querySelector(`.${classNames.CONTAINER}`);
		this.frame = shadowRoot.querySelector(`.${classNames.CROP_FRAME}`);

		this.cutout = { x: 0, y: 0 };
	}

	static get observedAttributes() {
		return Object.values(attributeNames);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		console.log(`<${tagName}>.attributeChangedCallback()`, name, newValue);
		switch (name) {
			case attributeNames.CUTOUT_AR:
				this.setFrameSize();
				break;
		}
	}

	connectedCallback() {
		console.log(`<${tagName}> connected`, this);

		this.setFrameSize();

		this.setupEventListeners();
	}

	setFrameSize() {
		const container = this.shadowRoot.querySelector(`.${classNames.CONTAINER}`);
		const cutoutFrame = this.shadowRoot.querySelector(`.${classNames.CROP_FRAME}`);
		const ar = Number(this.getAttribute(attributeNames.CUTOUT_AR));

		if (!ar) {
			console.log('No aspect ratio set for cutout, unable to set frame size');
			return;
		}

		switch (ar) {
			case aspectRatios['1_1']:
				container.classList.add(classNames.AR1_1_FROM_16_9);
				break;
			case aspectRatios['9_16']:
				container.classList.add(classNames.AR9_16_FROM_16_9);
				break;
			default:
				console.log(
					`Unknown aspect ratio ${ar}, wanted one of ${Object.values(aspectRatios).join(',')}`
				);
		}

		// calc x position for cutout frame
		// calc offset for background frame edge => background-position-x

		const height = getElementHeight(cutoutFrame);
		const width = (1 / ar) * height;
		console.log(`Cutout frame: ${width}x${height}`);

		cutoutFrame.style.width = width;
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
