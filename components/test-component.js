const innerHTML = `<link rel="stylesheet" href="./components/test-component.css" />
<section class="test-component">
  <p>This is a custom component</p>
</section>`

class TestComponent extends HTMLElement {
  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = innerHTML;
  }
}

customElements.define('test-component', TestComponent);
