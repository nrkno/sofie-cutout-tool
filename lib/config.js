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
 * Set a property value in the config. Note that changes are completely destructive,
 * and that overwriting a property that is an object with a single value will replace
 * the entire object and all of its properties and sub-objects.
 *
 * @param {string} path - path to property, use . to set properties of properties
 * @param {*} value - value to set. null or undefined is allowed.
 */
function set(path, value) {
	const parts = path.split('.');
	let current = config;
	parts.forEach((propName, idx) => {
		if (idx === parts.length - 1) {
			current[propName] = value;
			return;
		}

		if (current[propName] === undefined) {
			current[propName] = {};
		}
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
 * Completely replaces the configuration with the object passed as input.
 *
 * NOTE: For the time being, JSON.stringify/parse is
 * used to clone the input (to avoid side effects on the original object being passed in),
 * and thus advanced data types not supported by JSON will not work properly.
 *
 * @param {object} newConfig - the new config
 */
function write(newConfig) {
	config = JSON.parse(JSON.stringify(newConfig));
}
