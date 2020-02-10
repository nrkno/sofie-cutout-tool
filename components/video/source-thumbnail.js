import { arrayBufferToBase64 } from '../../lib/conversion.js';

export { tagNames, attributeNames };

const tagNames = {
	CUSTOM: 'source-thumbnail',
	BASE: 'img'
};

const attributeNames = {
	SOURCE_ID: 'data-source-id'
};

//TODO: should come from config
// const pathToCasparCGImageProvider = 'http://127.0.0.1:5255';
const pathToCasparCGImageProvider = 'http://160.67.48.165:5255';

class SourceThumbnail extends HTMLImageElement {
	constructor() {
		super();
	}

	connectedCallback() {
		const sourceId = this.getAttribute(attributeNames.SOURCE_ID);
		if (!isDefined(sourceId)) {
			console.warn(`No source id set, unable to display thumbnail.`);
			return;
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
							if (this.hasBeenRemoved) {
								console.log('Element removed, not setting image src');
								return;
							}

							const dataPrefix = 'data:image/png;base64,';
							const imageData = arrayBufferToBase64(buffer);
							this.src = `${dataPrefix}${imageData}`;
							setTimeout(() => {
								this.updateImage();
							}, 20000);
						});
						break;
					default:
						console.error(`HTTP ${status} for ${url}: ${response.statusText}`);
						setTimeout(() => {
							this.updateImage();
						}, 5000);
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
customElements.define(tagNames.CUSTOM, SourceThumbnail, { extends: tagNames.BASE });

function isDefined(value) {
	return value !== null && value !== undefined;
}
