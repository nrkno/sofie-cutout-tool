import { get as getConfigValue } from './config.js';

export { createCutoutFromSource, findCutoutIdFromSourceId, getCutoutSourceId };

function createCutoutFromSource(sourceId, logger) {
	const sources = getConfigValue('sources');
	if (!sources) {
		return undefined;
	}

	const source = sources[sourceId];
	if (!source) {
		logger.error('Cant create cutout for unknown source', sourceId);
		return undefined;
	}

	return {
		width: 720,
		height: 720,
		outputRotation: 0,
		source: sourceId,
		x: 0,
		y: 0
	};
}

function findCutoutIdFromSourceId(sourceId, logger) {
	const cutouts = getConfigValue('cutouts');
	if (cutouts) {
		return Object.keys(cutouts).find((cutoutId) => cutouts[cutoutId].source === sourceId);
	} else {
		logger.log('No cutout found for ', sourceId);
	}

	return undefined;
}

function getCutoutSourceId(cutoutId) {
	const cutout = getConfigValue(`cutouts.${cutoutId}`);

	return cutout ? cutout.source : null;
}
