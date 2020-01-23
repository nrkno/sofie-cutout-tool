const { ipcRenderer } = require('electron');

import {
	createVideoDisplayElement,
	attributeNames as videoDisplayAttributeNames
} from './video-display.js';

import { tagName as cropToolTagName } from './cutout-window.js';

export { tagName, attributeNames };

const tagName = 'video-cropper';

/* These must be kept in sync with this element's stylesheet */
const classNames = {
	CONTAINER: 'video-cropper--container',
	CONTENT: 'video-cropper--content'
};

const attributeNames = {
	SOURCE_ID: 'data-source-id'
};

const innerHTML = `<link rel="stylesheet" href="./components/video/video-cropper.css" />
<div class="${classNames.CONTAINER}"></div>
`;

const pathToCasparCGImageProvider = 'http://127.0.0.1:3020';

class VideoCropper extends HTMLElement {
	constructor() {
		super();

		const shadowRoot = this.attachShadow({ mode: 'open' });
		shadowRoot.innerHTML = innerHTML;

		this.container = shadowRoot.querySelector(`.${classNames.CONTAINER}`);

		this.videoDisplay = createVideoDisplayElement(pathToCasparCGImageProvider);
		this.videoDisplay.classList.add(classNames.CONTENT);
		this.container.appendChild(this.videoDisplay);

		this.cropTool = document.createElement(cropToolTagName);
		this.cropTool.classList.add(classNames.CONTENT);
		this.container.appendChild(this.cropTool);
	}

	static get observedAttributes() {
		return Object.values(attributeNames);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case attributeNames.SOURCE_ID:
				if (newValue) {
					this.updateId(newValue);
				}
				break;
		}
	}

	connectedCallback() {
		console.log(`<${tagName}> connected`, this);
		if (this.hasAttribute(attributeNames.SOURCE_ID)) {
			this.updateId(this.getAttribute(attributeNames.SOURCE_ID));
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
