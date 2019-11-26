const containerClassname = 'video-cropper--src'
const cropToolClassname = 'video-cropper--cutout-window'
const innerHTML = `<link rel="stylesheet" href="./components/video/video-cropper.css" />
<section class="video-cropper">
  <div class="${containerClassname}">
    <div class="${cropToolClassname}"></div>
  </div>
</section>`

class VideoCropper extends HTMLElement {
  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = innerHTML;

    this.srcContainer = shadowRoot.querySelector(`.${containerClassname}`)
    this.cropTool = shadowRoot.querySelector(`.${cropToolClassname}`)
  }

  moveCrop(x, y) {
    console.log(`moveCrop(${x}, ${y})`)
    const {width: cropWidth, height: cropHeight } = this.cropTool.getBoundingClientRect();
    // center movable at click
    const cx = x - cropWidth / 2;
    const cy = y - cropHeight / 2;
  
    // set bounds for movable to avoid placing it outside the container
    const maxX = this.containerRect.width - cropWidth;
    const maxY = this.containerRect.height - cropHeight;
    const calculatedLeft = clamp(cx, 0, maxX);
    const calculatedTop = clamp(cy, 0, maxY);
  
    this.cropTool.style.left = `${calculatedLeft}px`;
    this.cropTool.style.top = `${calculatedTop}px`;
  }

  moveCropFromTouch (touchEvent) {
    const {
      left,
      top,
      width,
      height
    } = this.srcContainer.getBoundingClientRect()
    this.containerRect = {left, top, width, height}

    const touch = touchEvent.touches[0];
    
    const x = touch.pageX + window.scrollX - this.containerRect.left;
    const y = touch.pageY + window.scrollY - this.containerRect.top;

    this.moveCrop(x, y);
}

  connectedCallback () {
    this.cropTool.addEventListener("touchmove", event => {
      console.log('touchmove')
      if (event.target.isSameNode(this.cropTool)) { // shadow dom da...
        console.table("mm", event);
      }
    });
    
    this.srcContainer.addEventListener("touchstart", event => {
      if (event.target.isSameNode(this.srcContainer)) {
        this.moveCropFromTouch(event)
      }
    });    
  }
}

customElements.define('video-cropper', VideoCropper);

function clamp(value, min, max) {
	return Math.min(max, Math.max(value, min));
}
