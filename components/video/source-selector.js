import {
	tagName as thumbnailTagName,
	attributeNames as thumbnailAttributeNames
} from './source-thumbnail.js';
import { get as getConfigValue } from '../../lib/config.js';

export { tagName, classNames, eventNames };

const tagName = 'source-selector';

const classNames = {
	SOURCES_LIST: 'input-source-list',
	SOURCES_LIST_ITEM: 'input-source-list--item',
	SRC_THUMB: 'input-source-list--item--thumbnail',
	SRC_TITLE: 'input-source-list--item--title'
};

const attributeNames = {
	SOURCE_ID: 'data-source-id'
};

const eventNames = {
	SOURCE_SELECTED: 'source-selected'
};

const innerHtml = `
<link rel="stylesheet" href="./components/video/source-selector.css">
<ul class="${classNames.SOURCES_LIST}"></ul>
`;

class SourceSelector extends HTMLElement {
	constructor() {
		super();

		this.sources = {};

		const shadowRoot = this.attachShadow({ mode: 'open' });
		shadowRoot.innerHTML = innerHtml;
		this.sourceListElement = shadowRoot.querySelector(`.${classNames.SOURCES_LIST}`);
	}

	connectedCallback() {
		document.addEventListener('new-config', () => {
			this.updateSources();
		});

		this.shadowRoot.addEventListener('click', ({ target }) => {
			const id = target.getAttribute(attributeNames.SOURCE_ID);
			if (!id) {
				return;
			}

			const event = new CustomEvent(eventNames.SOURCE_SELECTED, {
				bubbles: true,
				composed: true,
				detail: { id }
			});
			this.dispatchEvent(event);
		});

		this.updateSources();
	}

	updateSources() {
		const sources = getConfigValue('sources');
		if (sources) {
			this.sources = sources;
			this.renderSourceSelectors();
		}
	}

	renderSourceSelectors() {
		this.sourceListElement.innerHTML = '';
		const ids = Object.keys(this.sources);
		ids.forEach((id) => {
			const source = this.sources[id];

			console.log('Creating source preview', source);
			try {
				const listElement = createListItem(source, id);
				this.sourceListElement.appendChild(listElement);
				console.log('Success!', listElement);
			} catch (error) {
				console.log('FAIL!', error);
			}
		});
	}
}

customElements.define(tagName, SourceSelector);

function createListItem(source, sourceId) {
	const listItem = document.createElement('li');
	listItem.classList.add(classNames.SOURCES_LIST_ITEM);

	const thumbnail = document.createElement(thumbnailTagName);
	thumbnail.setAttribute(thumbnailAttributeNames.SOURCE_ID, sourceId);
	thumbnail.classList.add(classNames.SRC_THUMB);
	listItem.appendChild(thumbnail);

	const link = document.createElement('a');
	link.classList.add(classNames.SRC_TITLE);
	link.setAttribute(attributeNames.SOURCE_ID, sourceId);
	link.href = '#';
	link.title = source.title;
	link.textContent = source.title;
	listItem.appendChild(link);

	return listItem;
}
