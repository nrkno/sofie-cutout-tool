const tagName = 'source-selector';

const classNames = {
	SOURCES_LIST: 'input-source-list'
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
		this.updateSources();
	}

	updateSources() {
		this.sources = document.fullConfig.sources;
		this.renderSourceSelectors();
	}

	/*
    "sources": {
        "source_A": {
            "title": "Source A",
            "width": 1280,
            "height": 720,
            "rotation": 0,
            "input": {
                "type": "media",
                "file": "amb",
                "loop": true
            }
        },
        "source_B": {
            "title": "Source B",
            "width": 1280,
            "height": 720,
            "rotation": 90,
            "input": {
                "type": "media",
                "file": "amb",
                "loop": true
            }
        }
    }
*/
	renderSourceSelectors() {
		this.sourceListElement.innerHTML = '';
		const ids = Object.keys(this.sources);
		ids.forEach((id) => {
			const source = this.sources[id];
			const listElement = document.createElement('li');
			listElement.textContent = source.title;
			this.sourceListElement.appendChild(listElement);
		});
	}
}

customElements.define(tagName, SourceSelector);
