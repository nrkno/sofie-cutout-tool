export { tagName, classNames, eventNames };

const tagName = 'source-selector';

const classNames = {
	SOURCES_LIST: 'input-source-list'
};

const attributeNames = {
	SOURCE_ID: 'data-source-id'
};

const eventNames = {
	SOURCE_SELECTED: 'source-selected'
};

const innerHtml = `
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
		const { fullConfig } = document;
		if (fullConfig) {
			this.sources = document.fullConfig.sources;
			this.renderSourceSelectors();
		}
	}

	renderSourceSelectors() {
		this.sourceListElement.innerHTML = '';
		const ids = Object.keys(this.sources);
		ids.forEach((id) => {
			const source = this.sources[id];

			const listElement = document.createElement('li');
			this.sourceListElement.appendChild(listElement);

			const link = document.createElement('a');
			link.setAttribute(attributeNames.SOURCE_ID, id);
			link.href = '#';
			link.textContent = source.title;
			listElement.appendChild(link);
		});
	}
}

customElements.define(tagName, SourceSelector);
