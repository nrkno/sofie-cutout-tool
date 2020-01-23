import { clamp } from '../../lib/math.js';

export { tagName };

const tagName = 'cutout-window';

const classNames = {
	CONTAINER: 'cutout-window--container',
	CROP_FRAME: 'cutout-window--frame'
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

	connectedCallback() {
		console.log(`<${tagName}> connected`, this);
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
			if (event.target.isSameNode(this.cropTool)) {
				this.moveCropFromTouch(event);
			}
		});

		this.addEventListener('touchstart', (event) => {
			// console.log('touchstart')
			if (event.target.isSameNode(this.cropTool)) {
				this.moveCropFromTouch(event);
			}
		});

		this.addEventListener('touchend', (event) => {
			// console.log('touchend')
			if (event.target.isSameNode(this.cropTool)) {
				this.moveCropFromTouch(event);
			}
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
			// console.log('event.targetTouches', event.targetTouches)
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
		// console.log('touch', touch.clientX, touch.clientY)

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
		// console.log('moveCrop', deltaX, deltaY)

		const sourceDimensions = this.getSourceDimensions();

		// set bounds for movable to avoid placing it outside the container
		const minX = -(sourceDimensions.width - this.cutout.width) / 2;
		const minY = -(sourceDimensions.height - this.cutout.height) / 2;
		const maxX = (sourceDimensions.width - this.cutout.width) / 2;
		const maxY = (sourceDimensions.height - this.cutout.height) / 2;

		this.cutout.x += deltaX / this.scale;
		this.cutout.y += deltaY / this.scale;

		this.cutout.x = clamp(this.cutout.x, minX, maxX);
		this.cutout.y = clamp(this.cutout.y, minY, maxY);

		this.triggerSendUpdate();
	}
}

customElements.define(tagName, CutoutWindow);
console.log(`<${tagName}> defined.`);
