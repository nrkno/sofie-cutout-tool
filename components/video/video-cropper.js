const { ipcRenderer } = require('electron');

import {
	createVideoDisplayElement,
	attributeNames as videoDisplayAttributeNames
} from './video-display.js';

import { tagName as cropToolTagName } from './cutout-window.js';

const tagName = 'video-cropper';

const classNames = {
	CONTAINER: `video-cropper--container`
};

const innerHTML = `<link rel="stylesheet" href="./components/video/video-cropper.css" />
<div class="${classNames.CONTAINER}"></div>
`;

const pathToCasparCGImageProvider = 'http://127.0.0.1:3020';

class VideoCropper extends HTMLElement {
	constructor() {
		super();

		this.scale = 0.5; // This is a hack, make something better later

		const shadowRoot = this.attachShadow({ mode: 'open' });
		shadowRoot.innerHTML = innerHTML;

		this.videoDisplay = createVideoDisplayElement(pathToCasparCGImageProvider);
		shadowRoot.appendChild(this.videoDisplay);

		this.cropTool = document.createElement(cropToolTagName);
		shadowRoot.appendChild(this.cropTool);
	}

	static get observedAttributes() {
		return ['id'];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		console.log(`<${tagName}>.attributeChangedCallback`, name, oldValue, newValue);
		if (name === 'id' && newValue) {
			this.updateId(newValue);
		}
		this.updateStyle();
	}

	connectedCallback() {
		console.log(`<${tagName}> connected`, this);
		if (this.hasAttribute('id')) {
			this.updateId(this.getAttribute('id'));
		}
	}

	updateId(id) {
		this.cutoutId = id;
		this.cutout = Object.assign({}, document.fullConfig.cutouts[id]); // shallow clone
		this.source = document.fullConfig.sources[this.cutout.source];
		const { channel, layer } = document.fullConfig.sourceReferenceLayers[this.cutout.source];
		this.videoDisplay.setAttribute(videoDisplayAttributeNames.STREAM_CHANNEL, channel);
		this.videoDisplay.setAttribute(videoDisplayAttributeNames.STREAM_LAYER, layer);
		console.log('<${tagName}>.updateId()');
	}

	emitMoveEvent({ width, height, x, y }) {
		document.dispatchEvent(
			new CustomEvent('cutout-move', {
				detail: { source: null, width, height, x, y }
			})
		);
	}

	updateStyle() {
		if (this.cutout) {
			const sourceDimensions = this.getSourceDimensions();

			// this.srcContainer.style.width = `${sourceDimensions.width * this.scale}px`;
			// this.srcContainer.style.height = `${sourceDimensions.height * this.scale}px`;

			// this.img.style.backgroundColor = `#333`; // the png:s have opacity, make them black instead
			// this.img.style.width = `${this.source.width * this.scale}px`;
			// this.img.style.height = `${this.source.height * this.scale}px`;
			// const wImg = (this.source.width * this.scale) / 2;
			// this.img.style.transformOrigin = `${wImg}px ${wImg}px`;
			// this.img.style.transform = `rotate(${-this.source.rotation}deg)`;

			const x = this.cutout.x * this.scale;
			const y = this.cutout.y * this.scale;
			const width = this.cutout.width * this.scale;
			const height = this.cutout.height * this.scale;

			this.cropTool.style.left = `${x - width / 2}px`;
			this.cropTool.style.top = `${y - height / 2}px`;
			this.cropTool.style.width = `${width}px`;
			this.cropTool.style.height = `${height}px`;
		}
	}

	getSourceDimensions() {
		// TODO: This could be considered a hack, and only supports rotation of 0, 90, 180 etc..
		const flip = this.source.rotation % 180 !== 0;
		return {
			width: !flip ? this.source.width : this.source.height,
			height: !flip ? this.source.height : this.source.width
		};
	}

	triggerSendUpdate() {
		if (!this.sendUpdateTimeout) {
			this.sendUpdateTimeout = setTimeout(() => {
				this.sendUpdateTimeout = null;

				this.sendUpdate();
			}, 500);
		}
	}

	sendUpdate() {
		ipcRenderer.send('update-cutout', this.cutoutId, this.cutout);
	}
}

customElements.define(tagName, VideoCropper);
console.log(`<${tagName}> defined.`);
