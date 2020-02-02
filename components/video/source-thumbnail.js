import { arrayBufferToBase64 } from '../../lib/conversion.js';

export { tagName, attributeNames };

const tagName = 'source-thumbnail';

const attributeNames = {
	SOURCE_ID: 'data-source-id'
};

const classNames = {
	IMAGE: 'source-thumbnail--img'
};

//TODO: should come from config
const pathToCasparCGImageProvider = 'http://127.0.0.1:3020';

const innerHtml = `
	<link rel="stylesheet" href="./components/video/source-thumbnail.css" />
	<img class="${classNames.IMAGE}"/>
`;

class SourceThumbnail extends HTMLElement {
	constructor() {
		super();

		const shadowRoot = this.attachShadow({ mode: 'open' });
		shadowRoot.innerHTML = innerHtml;

		this.img = shadowRoot.querySelector(`.${classNames.IMAGE}`);
	}

	connectedCallback() {
		const sourceId = this.getAttribute(attributeNames.SOURCE_ID);
		if (!isDefined(sourceId)) {
			console.warn(`No source id set, unable to display thumbnail.`);
		}

		const { channel, layer } = document.fullConfig.sourceReferenceLayers[sourceId];

		if (isDefined(channel) && isDefined(layer)) {
			this.imageUrl = `${pathToCasparCGImageProvider}/channel/${channel}/${layer}/image`;
			this.updateImage();
		} else {
			console.warn(`Channel and/or layer not found for source ${sourceId}`);
		}
	}

	updateImage() {
		const url = `${this.imageUrl}?hash=${Date.now()}`;

		fetch(url)
			.then((response) => {
				const { status } = response;
				switch (status) {
					case 404:
						console.error(`HTTP 404: ${url}`);
						break; // no retries for not found
					case 200:
						response.arrayBuffer().then((buffer) => {
							if (this.hasBeenRemoved) return;

							var base64Flag = 'data:image/jpeg;base64,';
							var imageStr = arrayBufferToBase64(buffer);

							this.img.src = base64Flag + imageStr;
							setTimeout(() => {
								this.updateImage();
							}, 100);
						});
						break;
					default:
						console.error(`HTTP ${status} for ${url}: ${response.statusText}`);
						break;
				}
			})
			.catch((e) => {
				console.error(e);
				setTimeout(() => {
					this.updateImage();
				}, 5000);
			});
	}
}
customElements.define(tagName, SourceThumbnail);

function isDefined(value) {
	return value !== null && value !== undefined;
}
