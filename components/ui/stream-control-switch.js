export { tagName, eventNames, classNames };

const tagName = 'stream-control-switch';

const eventNames = {
	CONNECT: 'stream-control-connect',
	DISCONNECT: 'stream-control-disconnect'
};

const classNames = {
	CONNECTED: 'connected'
};

class StreamControlSwitch extends HTMLInputElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.addEventListener('input', () => {
			this.handleInput();
		});
	}

	handleInput() {
		if (this.classList.contains(classNames.CONNECTED)) {
			this.disconnect();
		} else {
			this.connect();
		}
	}

	connect() {
		this.classList.add(classNames.CONNECTED);
		this.dispatchEvent(new CustomEvent(eventNames.CONNECT, { composed: true, bubbles: true }));
	}

	disconnect() {
		this.classList.remove(classNames.CONNECTED);
		this.dispatchEvent(new CustomEvent(eventNames.DISCONNECT, { composed: true, bubbles: true }));
	}
}
customElements.define(tagName, StreamControlSwitch, { extends: 'input' });
