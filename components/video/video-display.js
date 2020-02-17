import { getElementWidth } from '../../lib/dimensions.js';
import { get as getConfigValue } from '../../lib/config.js';

export { tagName, attributeNames, eventNames };

const tagName = 'video-display';

const attributeNames = {
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

const innerHtml = `
<link rel="stylesheet" href="./components/video/video-display.css" />
<div class="${classNames.CONTAINER}">
<div class="${classNames.AR_PLACEHOLDER}"></div>
<img class="${classNames.IMG}" />
</div>
`;

/**
 * A custom element for displaying a video stream provided by an instance
 * of {@link https://github.com/SuperFlyTV/casparCG-image-provider Casparcg Image Provider}.
 *
 */
class VideoDisplay extends HTMLElement {
	static get observedAttributes() {
		return Object.values(attributeNames);
	}

	constructor() {
		super();

		const shadowRoot = this.attachShadow({ mode: 'open' });
		shadowRoot.innerHTML = innerHtml;

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
		if (!this.streamChannel || !this.streamLayer) {
			console.warn(
				`Unable to load stream, missing data: channel: ${this.streamChannel}, layer: ${this.streamLayer}`
			);
			return;
		}

		const imageProviderLocation = getConfigValue('settings.resources.imageProvider.url');
		const img = this.shadowRoot.querySelector(`img.${classNames.IMG}`);
		const container = this.shadowRoot.querySelector(`.${classNames.CONTAINER}`);
		const arPlaceholder = this.shadowRoot.querySelector(`.${classNames.AR_PLACEHOLDER}`);
		const streamUrl = `${imageProviderLocation}/channel/${this.streamChannel}/${this.streamLayer}/stream`;

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

				const srcUrl = imageProviderLocation + stream.url;
				console.log('shadowroot host', this.shadowRoot.host);
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
	console.log('container width', width, container);
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
