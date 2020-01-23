export { calcAspectRatio, aspectRatios };

const aspectRatios = {
	'16_9': 16 / 9,
	'1_1': 1,
	'9_16': 9 / 16
};

function calcAspectRatio({ width, height }) {
	return width / height;
}
