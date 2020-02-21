export { get, getImageProviderLocation, set, write };

let config = {};

/**
 * Get a property value from the config
 *
 * @param {string} path - path to the property, use . to access properties of properties
 *
 * @return {*|undefined} the value requested or undefined if not existing in config
 */
function get(path) {
	let value = undefined;

	const parts = path.split('.');
	if (parts.length) {
		value = parts.reduce((value, propName) => {
			return value !== null && value !== undefined ? value[propName] : null;
		}, config);
	}

	return value;
}

/**
 * Set a property value in the config
 *
 * @param {string} path - path to property, use . to set properties of properties
 * @param {*} value - value to set
 */
function set(path, value) {
	const parts = path.split('.');
	let current = config;
	parts.forEach((propName, idx) => {
		if (idx === parts.length - 1) {
			current[propName] = value;
			return;
		}

		current[propName] = {};
		current = current[propName];
	});
	return;
}

/**
 * Convenience function to get the image provider location from the config.
 *
 * @returns {string} - string representation of the location for the image provider service
 */
function getImageProviderLocation() {
	const imageProvider = get('settings.imageProvider');
	const protocol = imageProvider.protocol ? `${imageProvider.protocol}://` : '';
	const port = imageProvider.port ? `:${imageProvider.port}` : '';

	return `${protocol}${imageProvider.hostname}${port}`;
}

/**
 * Completely replaces the configuration.
 *
 * @param {object} newConfig - the new config
 */
function write(newConfig) {
	config = newConfig;
}
