export { get };

function get(path) {
	console.log(`Config.get(${path})`);
	let value = null;

	const parts = path.split('.');
	if (parts.length) {
		const config = document.fullConfig;
		console.log('Using config from document', config);
		value = parts.reduce((value, propName) => {
			return value !== null && value !== undefined ? value[propName] : null;
		}, config);
	}

	console.log('Returning', value);
	return value;
}
