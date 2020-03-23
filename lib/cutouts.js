import { get as getConfigValue } from './config.js'

export { createCutoutFromSource, findCutoutIdFromSourceId, getCutoutSourceId }

function createCutoutFromSource(sourceId) {
	const sources = getConfigValue('sources')
	if (!sources) {
		return undefined
	}

	const source = sources[sourceId]
	if (!source) {
		return undefined
	}

	return {
		width: 720,
		height: 720,
		outputRotation: 0,
		source: sourceId,
		x: 0,
		y: 0
	}
}

function findCutoutIdFromSourceId(sourceId) {
	const cutouts = getConfigValue('cutouts')
	if (cutouts) {
		return Object.keys(cutouts).find((cutoutId) => cutouts[cutoutId].source === sourceId)
	}

	return undefined
}

function getCutoutSourceId(cutoutId) {
	const cutout = getConfigValue(`cutouts.${cutoutId}`)

	return cutout ? cutout.source : null
}
