import {
	tagName as videoDisplayTagName,
	attributeNames as videoDisplayAttributeNames
} from './video-display.js';
import { get as getConfigValue } from '../../lib/config.js';

const html = String.raw;

export { tagName, attributeNames };

const tagName = 'source-thumbnail';

const attributeNames = {
	SOURCE_ID: 'data-source-id'
};

const classNames = {
	VIDEO_DISPLAY: 'source-thumbnail--video'
};

const template = html`
	<link rel="stylesheet" href="./components/video/source-thumbnail.css" />
`;

class SourceThumbnail extends HTMLElement {
	constructor() {
		super();

		this.attachShadow({ mode: 'open' });
		this.shadowRoot.innerHTML = template;
	}

	connectedCallback() {
		const sourceId = this.getAttribute(attributeNames.SOURCE_ID);
		if (!isDefined(sourceId)) {
			console.warn(`No source id set, unable to display thumbnail.`);
			return;
		}

		const sourceReferenceLayers = getConfigValue('sourceReferenceLayers');
		const { channel, layer } = sourceReferenceLayers[sourceId];

		if (isDefined(channel) && isDefined(layer)) {
			const video = document.createElement(videoDisplayTagName);
			video.setAttribute(videoDisplayAttributeNames.STREAM_CHANNEL, channel);
			video.setAttribute(videoDisplayAttributeNames.STREAM_LAYER, layer);
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
