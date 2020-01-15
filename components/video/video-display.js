export { createVideoDisplayElement, attributeNames };

const tagName = 'video-display';
const attributeNames = {
	STREAM_BASE_URL: 'data-stream-base-url',
	STREAM_CHANNEL: 'data-stream-channel'
};

/*
  WARNING: These class names are also used in the stylesheet, and so they must
  be changed there if they are changed here.
*/
const classNames = {
	IMG: 'img',
	STREAM_CONTAINER: 'stream-container'
};

/**
 * Creates an HTML element for displaying a video stream provided by an instance
 * of {@link https://github.com/SuperFlyTV/casparCG-image-provider Casparcg Image Provider}.
 *
 * @param {string} streamBaseUrl - base url for the video stream service
 * @param {*} streamChannel - which channel to use for the video stream service
 *
 * @returns {VideoDisplay} - the created <video-display> element
 */
function createVideoDisplayElement(streamBaseUrl, streamChannel) {
	const element = document.createElement(tagName);
	if (streamBaseUrl) {
		element.setAttribute(attributeNames.STREAM_BASE_URL, streamBaseUrl);
	}
	if (streamChannel) {
		element.setAttribute(attributeNames.STREAM_CHANNEL, streamChannel);
	}

	return element;
}

const innerHtml = `
<link rel="stylesheet" href="./components/video/video-display.css" />
<img class="${classNames.IMG}" />
<div class="${classNames.STREAM_CONTAINER}"></div>
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
					break;
				}
		}
	}

	connectedCallback() {
		if (this.streamUrlBase) {
			this.loadStream();
		}
	}

	/*
export interface StreamInfoRegion {
	channel: number
	layer?: number

	streamId: string

	x: number
	y: number
	width: number
	height: number
}
export interface StreamInfoStream {
	id: string

	url: string

	channel: number
	layer: number

	width: number
	height: number
}
*/
	loadStream() {
		if (!this.streamUrlBase || !this.streamChannel) {
			console.warn(
				`Unable to load stream, missing data: Base URL: ${this.streamUrlBase}, channel: ${this.streamChannel}`
			);
			return;
		}

		const img = this.shadowRoot.querySelector(`img.${classNames.IMG}`);
		const streamUrl = `${this.streamUrlBase}/channel/${this.streamChannel}/stream`;

		fetch(streamUrl)
			.then((response) => response.json())
			.then((streamInfo) => {
				// Find the region:
				const region = streamInfo.regions.find((r) => r.channel == this.streamChannel);
				if (!region)
					throw new Error(`Region for channel ${this.streamChannel} not found using ${streamUrl}`);

				// Find the stream that the region uses:
				const stream = streamInfo.streams.find((s) => s.id == region.streamId);
				if (!region) throw new Error(`Stream ${region.streamId} not found`);

				const w = stream.width / region.width;
				const y = region.y / region.height;
				const x = region.x / region.width;

				img.addEventListener('load', function(e) {
					console.log('load', e);
				});
				img.addEventListener('error', function(e) {
					console.log('error', e);
				});

				img.style.width = w * 100 + '%';
				img.style.top = -y * 100 + '%';
				img.style.left = -x * 100 + '%';
				img.src = this.streamUrlBase + stream.url;
			})
			.catch(console.error);
	}
}

customElements.define(tagName, VideoDisplay);
