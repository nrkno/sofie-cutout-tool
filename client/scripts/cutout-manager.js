const { ipcRenderer } = require('electron');

import {
	attributeNames as videoCropperAttributeNames,
	tagName as videoCropperTagName,
	eventNames as videoCropperEventNames
} from '../../components/video/video-cropper.js';

import {
	tagName as sourceSelectorTagName,
	eventNames as sourceSelectorEventNames,
	attributeNames as sourceSelectorAttributeNames
} from '../../components/video/source-selector.js';
import { get as getConfigValue } from '../../lib/config.js';

export { init };

function init(logger, document) {
	logger.log('cutout-manager init starting...', document);
	document.addEventListener('cutout-move', (event) => {
		const { source, x, y, width, height } = event.detail;

		ipcRenderer.send('cutout-move', { source, x, y, width, height });
	});

	ipcRenderer.on('new-config', (event, newFullConfig) => {
		// A new config is received from the backend.
		document.fullConfig = newFullConfig;

		logger.log('newFullConfig received', newFullConfig);

		document.dispatchEvent(new CustomEvent('new-config'));
	});

	document.addEventListener(sourceSelectorEventNames.SOURCE_SELECTED, ({ detail }) => {
		if (detail) {
			const { id } = detail;
			let cutoutId = findCutoutIdFromSourceId(id);

			if (!cutoutId) {
				logger.log(`No existing cutout found for source with id ${id}, creating new cutout`);
				const cutout = createCutoutFromSource(id, logger);
				if (cutout) {
					logger.log('Created cutout', cutout);
					cutoutId = `cutout_${id}`;
					ipcRenderer.send('update-cutout', cutoutId, cutout);
				} else {
					logger.error('No cutout created');
				}
			}

			if (cutoutId) {
				const preview = document.querySelector(`${videoCropperTagName}.preview`);
				preview.setAttribute(videoCropperAttributeNames.CUTOUT_ID, cutoutId);

				document.querySelectorAll(sourceSelectorTagName).forEach((sourceSelector) => {
					sourceSelector.setAttribute(sourceSelectorAttributeNames.PREVIEW_ID, id);
				});

				ipcRenderer.send('preview', cutoutId);
			} else {
				logger.warn('Unable to find or create a cutout for source', id);
			}
		}
	});

	document.addEventListener(videoCropperEventNames.CROP_MOVE, ({ detail }) => {
		if (detail) {
			const { cutoutId, cutout } = detail;
			if (cutoutId && cutout) {
				triggerSendUpdate(cutoutId, cutout);
				document.fullConfig.cutouts[cutoutId] = cutout;
			}
		}
	});

	document.addEventListener('click', ({ target }) => {
		if (target.classList.contains('take-control--button')) {
			const preview = document.querySelector(`${videoCropperTagName}.preview`);
			const program = document.querySelector(`${videoCropperTagName}.program`);
			const cutoutOnPreviewId = preview.getAttribute(videoCropperAttributeNames.CUTOUT_ID);
			const cutoutOnProgramId = program.getAttribute(videoCropperAttributeNames.CUTOUT_ID);

			const cutouts = getConfigValue('cutouts');
			if (cutoutOnPreviewId && cutouts[cutoutOnPreviewId]) {
				program.setAttribute(videoCropperAttributeNames.CUTOUT_ID, cutoutOnPreviewId);
				preview.setAttribute(videoCropperAttributeNames.CUTOUT_ID, cutoutOnProgramId);

				const programSourceId = getCutoutSourceId(cutoutOnPreviewId);
				const previewSourceId = getCutoutSourceId(cutoutOnProgramId);

				document.querySelectorAll(sourceSelectorTagName).forEach((sourceSelector) => {
					sourceSelector.setAttribute(sourceSelectorAttributeNames.PREVIEW_ID, previewSourceId);
					sourceSelector.setAttribute(sourceSelectorAttributeNames.PROGRAM_ID, programSourceId);
				});

				ipcRenderer.send('take', cutoutOnPreviewId);
			}
		}
	});

	ipcRenderer.send('initialize');
	return;
}

let sendUpdateTimeout = null;

function triggerSendUpdate(cutoutId, cutout) {
	if (!sendUpdateTimeout) {
		sendUpdateTimeout = setTimeout(() => {
			sendUpdateTimeout = null;

			ipcRenderer.send('update-cutout', cutoutId, cutout);
		}, 40);
	}
}

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
