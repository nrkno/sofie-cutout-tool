export { get, getImageProviderLocation };

function get(path) {
	let value = null;

	const parts = path.split('.');
	if (parts.length) {
		const config = document.fullConfig;
		value = parts.reduce((value, propName) => {
			return value !== null && value !== undefined ? value[propName] : null;
		}, config);
	}

	return value;
}

function getImageProviderLocation() {
	const imageProvider = get('settings.imageProvider');
	const protocol = imageProvider.protocol ? `${imageProvider.protocol}://` : '';
	const port = imageProvider.port ? `:${imageProvider.port}` : '';

	return `${protocol}${imageProvider.hostname}${port}`;
}
