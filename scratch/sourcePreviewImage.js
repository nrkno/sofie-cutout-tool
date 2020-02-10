// const pathToCasparCGImageProvider = 'http://127.0.0.1:5255';
const pathToCasparCGImageProvider = 'http://160.67.48.165:5255';

updateImage(sourceReferenceLayer, img) {
  if (sourceReferenceLayer) {
    fetch(
      pathToCasparCGImageProvider +
        `/layer/${sourceReferenceLayer.channel}/${
          sourceReferenceLayer.layer
        }/image?hash=${Date.now()}`
    )
      .then((response) => {
        if (response.status !== 200) {
          throw new Error(`Response ${response.status}: ${statusText}`);
        }
        response.arrayBuffer().then((buffer) => {
          if (this.hasBeenRemoved) return;

          var base64Flag = 'data:image/jpeg;base64,';
          var imageStr = arrayBufferToBase64(buffer);

          img.src = base64Flag + imageStr;
          setTimeout(() => {
            updateImage(sourceReferenceLayer, img);
          }, 50);
        });
      })
      .catch((e) => {
        console.error(e);
        setTimeout(() => {
          updateImage(sourceReferenceLayer, img);
        }, 5000);
      });
  } else {
    setTimeout(() => {
      updateImage(sourceReferenceLayer, img);
    }, 1000);
  }
}

function arrayBufferToBase64(buffer) {
	var binary = '';
	var bytes = [].slice.call(new Uint8Array(buffer));

	bytes.forEach((b) => (binary += String.fromCharCode(b)));

	return window.btoa(binary);
}
