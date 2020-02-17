import { createVideoDisplayElement } from './video-display.js';

export { tagName, attributeNames };

const tagName = 'source-thumbnail';

const attributeNames = {
	SOURCE_ID: 'data-source-id'
};

const classNames = {
	VIDEO_DISPLAY: 'source-thumbnail--video'
};

//TODO: should come from config
// const pathToCasparCGImageProvider = 'http://127.0.0.1:5255';
const pathToCasparCGImageProvider = 'http://160.67.52.144:5255';

class SourceThumbnail extends HTMLElement {
	constructor() {
		super();

		this.attachShadow({ mode: 'open' });
		this.shadowRoot.innerHTML = `<link rel="stylesheet" href="./components/video/source-thumbnail.css">`;
	}

	connectedCallback() {
		const sourceId = this.getAttribute(attributeNames.SOURCE_ID);
		if (!isDefined(sourceId)) {
			console.warn(`No source id set, unable to display thumbnail.`);
			return;
		}

		const { channel, layer } = document.fullConfig.sourceReferenceLayers[sourceId];

		if (isDefined(channel) && isDefined(layer)) {
			const video = createVideoDisplayElement(pathToCasparCGImageProvider, channel, layer);
			video.classList.add(classNames.VIDEO_DISPLAY);
			this.shadowRoot.appendChild(video);
		} else {
			console.warn(`Channel and/or layer not found for source ${sourceId}`);
		}
	}
}
customElements.define(tagName, SourceThumbnail);

function isDefined(value) {
	return value !== null && value !== undefined;
}
