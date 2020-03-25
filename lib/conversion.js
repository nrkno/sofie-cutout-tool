export { arrayBufferToBase64 }

function arrayBufferToBase64(buffer) {
	var binary = ''
	var bytes = [].slice.call(new Uint8Array(buffer))

	bytes.forEach((b) => (binary += String.fromCharCode(b)))

	return window.btoa(binary)
}
