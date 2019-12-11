const {ipcRenderer} = require('electron')
const containerClassname = 'video-cropper--src'
const cropToolClassname = 'video-cropper--cutout-window'
const imgClassname = 'video-cropper--img'
const innerHTML = `<link rel="stylesheet" href="./components/video/video-cropper.css" />
<section class="video-cropper">
  <div class="${containerClassname}">
    <img class="${imgClassname}" />
    <div class="video-cropper--center">
      <div class="${cropToolClassname}"></div>
    </div>
  </div>
</section>`

class VideoCropper extends HTMLElement {
  constructor() {
    super();


    this.scale = 0.5 // This is a hack, make something better later

    // console.log('new VideoCropper', this.getAttribute('id'))



    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = innerHTML;

    this.srcContainer = shadowRoot.querySelector(`.${containerClassname}`)
    this.cropTool = shadowRoot.querySelector(`.${cropToolClassname}`)
    this.img = shadowRoot.querySelector(`.${imgClassname}`)

    this.updateImage()

  }
  static get observedAttributes() {
    return ['id'];
  }
  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'id') {
      this.cutoutId = newValue
      this.cutout = Object.assign({}, document.fullConfig.cutouts[newValue]) // shallow clone
      this.source = document.fullConfig.sources[this.cutout.source]
      this.sourceReferenceLayer = document.fullConfig.sourceReferenceLayers[this.cutout.source]
    }
    this.updateStyle()
  }

  emitMoveEvent ({width, height, x, y}) {
    document.dispatchEvent(new CustomEvent('cutout-move', {
      detail: {source: null, width, height, x, y}
    }))
  }

  updateStyle() {

    if (
      this.cutout
    ) {

      const sourceDimensions = this.getSourceDimensions()

      this.srcContainer.style.width = `${sourceDimensions.width * this.scale}px`
      this.srcContainer.style.height = `${sourceDimensions.height * this.scale}px`

      this.img.style.backgroundColor = `#333` // the png:s have opacity, make them black instead
      this.img.style.width = `${this.source.width * this.scale}px`
      this.img.style.height = `${this.source.height * this.scale}px`
      const wImg = this.source.width * this.scale / 2
      this.img.style.transformOrigin = `${wImg}px ${wImg}px`
      this.img.style.transform = `rotate(${-this.source.rotation}deg)`

      const x = this.cutout.x * this.scale
      const y = this.cutout.y * this.scale
      const width = this.cutout.width * this.scale
      const height = this.cutout.height * this.scale

      this.cropTool.style.left   = `${x - width / 2}px`;
      this.cropTool.style.top    = `${y - height / 2}px`;
      this.cropTool.style.width  = `${width}px`;
      this.cropTool.style.height = `${height}px`;
    }

  }
  updateImage () {
    if (this.hasBeenRemoved) return

    if (this.sourceReferenceLayer) {
      const pathToCasparCGImageProvider = 'http://127.0.0.1:3020'
      fetch(pathToCasparCGImageProvider + `/layer/${this.sourceReferenceLayer.channel}/${this.sourceReferenceLayer.layer}/image?hash=${Date.now()}`)
      .then((response) => {
        if (response.status !== 200) {
          throw new Error(`Response ${response.status}: ${statusText}`)
        }
        response.arrayBuffer().then((buffer) => {
          if (this.hasBeenRemoved) return

          var base64Flag = 'data:image/jpeg;base64,';
          var imageStr = arrayBufferToBase64(buffer);


          // this.img.setAttribute('src', base64Flag + imageStr)
          this.img.src = base64Flag + imageStr
          setTimeout(() => {
            this.updateImage()
          }, 50)
        });
      })
      .catch((e) => {
        console.error(e)
        setTimeout(() => {
          this.updateImage()
        }, 5000)
      })
    } else {
      setTimeout(() => {
        this.updateImage()
      }, 1000)
    }

  }
  getSourceDimensions() {
    // TODO: This could be considered a hack, and only supports rotation of 0, 90, 180 etc..
    const flip = (this.source.rotation % 180) !== 0
    return {
      width: !flip ? this.source.width  : this.source.height,
      height: !flip ? this.source.height : this.source.width
    }
  }
  moveCrop(deltaX, deltaY) {
    // console.log('moveCrop', deltaX, deltaY)

    const sourceDimensions = this.getSourceDimensions()

    // set bounds for movable to avoid placing it outside the container
    const minX = -(sourceDimensions.width - this.cutout.width) / 2
    const minY = -(sourceDimensions.height - this.cutout.height) / 2
    const maxX = (sourceDimensions.width  - this.cutout.width) / 2
    const maxY = (sourceDimensions.height - this.cutout.height) / 2

    this.cutout.x += deltaX / this.scale
    this.cutout.y += deltaY / this.scale

    this.cutout.x = clamp(this.cutout.x, minX, maxX )
    this.cutout.y = clamp(this.cutout.y, minY, maxY )

    this.updateStyle()

    this.triggerSendUpdate()
  }

  moveCropFromTouch (event) {
    if (!event) {
      return
    }


    if (event.type === "touchend") {
      delete this.activeTouch
      return
    }

    let touch
    if (this.activeTouch) {
      // console.log('event.targetTouches', event.targetTouches)
      for (let i=0; i< event.targetTouches.length; i++) {
          let t = event.targetTouches[i]
          if (t.identifier === this.activeTouch.identifier) {
            touch = t
            break
          }
      }
      if (!touch) {
        delete this.activeTouch
        touch = event.targetTouches[0]
      }
    } else {
      touch = event.targetTouches[0]
    }
    // console.log('touch', touch.clientX, touch.clientY)

    if (touch && this.activeTouch && event.type === "touchmove") {

      this.moveCrop(
        touch.pageX - this.activeTouch.x,
        touch.pageY - this.activeTouch.y
      )
    }

    if (touch) {
      this.activeTouch = {
        identifier: touch.identifier,
        x: touch.pageX,
        y: touch.pageY
      }
    } else {
      delete this.activeTouch
    }
  }

  connectedCallback () {
    this.cropTool.addEventListener("drag", event => {
      // console.log(event)
    });
    this.cropTool.addEventListener("mousedown", event => {
      event.preventDefault()
      // console.log('mousedown')
      this.mouseDown = true
    })
    document.addEventListener("mouseup", event => {
      event.preventDefault()
      this.mouseDown = false
    })
    document.body.addEventListener("mousemove", event => {
      if (this.mouseDown) {
        this.moveCrop(event.movementX, event.movementY)

      }
    });

    this.cropTool.addEventListener("touchmove", event => {
      // console.log('touchmove')
      if (event.target.isSameNode(this.cropTool)) {
        this.moveCropFromTouch(event)
      }
    });

    this.cropTool.addEventListener("touchstart", event => {
      // console.log('touchstart')
      if (event.target.isSameNode(this.cropTool)) {
        this.moveCropFromTouch(event)
      }
    });

    this.cropTool.addEventListener("touchend", event => {
      // console.log('touchend')
      if (event.target.isSameNode(this.cropTool)) {
        this.moveCropFromTouch(event)
      }
    });
  }
  disconnectedCallback() {
    this.hasBeenRemoved = true
  }
  triggerSendUpdate () {
    if (!this.sendUpdateTimeout) {
      this.sendUpdateTimeout = setTimeout(() => {
        this.sendUpdateTimeout = null

        this.sendUpdate()
      }, 500)
    }
  }
  sendUpdate () {
    ipcRenderer.send('update-cutout', this.cutoutId, this.cutout)
  }
}

customElements.define('video-cropper', VideoCropper);

function clamp(value, min, max) {
	return Math.min(max, Math.max(value, min));
}

function arrayBufferToBase64(buffer) {
  var binary = ''
  var bytes = [].slice.call(new Uint8Array(buffer))

  bytes.forEach((b) => binary += String.fromCharCode(b))

  return window.btoa(binary)
}
