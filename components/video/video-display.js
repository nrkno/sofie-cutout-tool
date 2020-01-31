import { getElementWidth } from '../../lib/dimensions.js';

export { createVideoDisplayElement, attributeNames, eventNames };

const tagName = 'video-display';
const attributeNames = {
	STREAM_BASE_URL: 'data-stream-base-url',
	STREAM_CHANNEL: 'data-stream-channel',
	STREAM_LAYER: 'data-stream-layer'
};

/*
  WARNING: These class names are also used in the stylesheet, and so they must
  be changed there if they are changed here.
*/
const classNames = {
	CONTAINER: 'video-display--container',
	AR_PLACEHOLDER: 'ar-placeholder',
	IMG: 'img'
};

const eventNames = {
	STREAM_PLAYING: 'stream-playing'
};

/**
 * Creates an HTML element for displaying a video stream provided by an instance
 * of {@link https://github.com/SuperFlyTV/casparCG-image-provider Casparcg Image Provider}.
 *
 * @param {string} streamBaseUrl - base url for the video stream service
 * @param {*} streamChannel - which channel to use for the video stream service
 * @param {*} streamLayer - which layer to use for the video stream service
 *
 * @returns {VideoDisplay} - the created <video-display> element
 */
function createVideoDisplayElement(streamBaseUrl, streamChannel, streamLayer) {
	const element = document.createElement(tagName);
	if (streamBaseUrl) {
		element.setAttribute(attributeNames.STREAM_BASE_URL, streamBaseUrl);
	}
	if (streamChannel) {
		element.setAttribute(attributeNames.STREAM_CHANNEL, streamChannel);
	}
	if (streamLayer) {
		element.setAttribute(attributeNames.STREAM_LAYER, streamLayer);
	}

	return element;
}

const innerHtml = `
<link rel="stylesheet" href="./components/video/video-display.css" />
<div class="${classNames.CONTAINER}">
	<div class="${classNames.AR_PLACEHOLDER}"></div>
	<img class="${classNames.IMG}" />
</div>
`;

class VideoDisplay extends HTMLElement {
	static get observedAttributes() {
		return Object.values(attributeNames);
	}

	constructor() {
		super();

		const shadowRoot = this.attachShadow({ mode: 'open' });
		shadowRoot.innerHTML = innerHtml;

		this.streamUrlBase = this.getAttribute(attributeNames.STREAM_BASE_URL);
		this.streamChannel = this.getAttribute(attributeNames.STREAM_CHANNEL);
		this.streamLayer = this.getAttribute(attributeNames.STREAM_LAYER);
	}

	connectedCallback() {
		this.loadStream();

		const img = this.shadowRoot.querySelector(`img.${classNames.IMG}`);
		img.addEventListener('load', () => {
			this.dispatchStreamPlaying();
		});
		img.addEventListener('error', function(e) {
			console.log('Error loading video stream', e);
		});
	}

	attributeChangedCallback(name, oldValue, currentValue) {
		switch (name) {
			case attributeNames.STREAM_BASE_URL:
				if (this.streamUrlBase !== currentValue) {
					this.streamUrlBase = currentValue;
					this.loadStream();
				}
				break;
			case attributeNames.STREAM_CHANNEL:
				if (this.streamChannel !== currentValue) {
					this.streamChannel = currentValue;
					this.loadStream();
				}
				break;
			case attributeNames.STREAM_LAYER:
				if (this.streamLayer !== currentValue) {
					this.streamLayer = currentValue;
					this.loadStream();
				}
				break;
		}
	}

	dispatchStreamPlaying() {
		const event = new CustomEvent(eventNames.STREAM_PLAYING, { bubbles: true, composed: true });
		this.dispatchEvent(event);
	}

	loadStream() {
		if (!this.streamUrlBase || !this.streamChannel || !this.streamLayer) {
			console.warn(
				`Unable to load stream, missing data: Base URL: ${this.streamUrlBase}, channel: ${this.streamChannel}, layer: ${this.streamLayer}`
			);
			return;
		}

		const img = this.shadowRoot.querySelector(`img.${classNames.IMG}`);
		const container = this.shadowRoot.querySelector(`.${classNames.CONTAINER}`);
		const arPlaceholder = this.shadowRoot.querySelector(`.${classNames.AR_PLACEHOLDER}`);
		const streamUrl = `${this.streamUrlBase}/channel/${this.streamChannel}/${this.streamLayer}/stream`;

		fetch(streamUrl)
			.then((response) => response.json())
			.then((streamInfo) => {
				const region = streamInfo.regions.find(
					(r) => r.layer === this.streamLayer && r.channel === this.streamChannel
				);
				if (!region) {
					throw new Error(`Region for channel ${this.streamChannel} not found using ${streamUrl}`);
				}

				const stream = streamInfo.streams.find((s) => s.id == region.streamId);
				if (!stream) {
					throw new Error(`Stream ${region.streamId} not found`);
				}

				const srcUrl = this.streamUrlBase + stream.url;
				const scale = calcTransformScale(this.shadowRoot.host, region);

				const containerDimensions = {
					width: Math.round(region.width * scale),
					height: Math.round(region.height * scale)
				};

				container.style.width = containerDimensions.width;
				arPlaceholder.style.paddingBottom = `${containerDimensions.height}px`;

				if (img.src !== srcUrl) {
					img.src = srcUrl;
				} else {
					this.dispatchStreamPlaying();
				}

				img.style.transform = getCSSTransformString(scale, region);
			})
			.catch(console.error);
	}
}

customElements.define(tagName, VideoDisplay);

function calcTransformScale(container, region) {
	const width = getElementWidth(container);
	return width / region.width;
}

function getCSSTransformString(scale, region) {
	/* Note that the transforms depend on transform-origin: top left, which is
	set in the component stylesheet */
	const transforms = [];

	transforms.push(`scale3d(${scale},${scale}, 1)`);
	transforms.push(`translate3d(${-region.x}px, ${-region.y}px, 0)`);

	return transforms.join(' ');
}
