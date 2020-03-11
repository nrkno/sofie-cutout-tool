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

import {
	createCutoutFromSource,
	findCutoutIdFromSourceId,
	getCutoutSourceId
} from '../../lib/cutouts.js';

import { EventNames as applicationEvents } from '../../shared/events.js';

import * as config from '../../lib/config.js';
import { eventNames as directTakeToggleEvents } from '../../components/ui/direct-take-toggle.js';

export default class CutoutManager {
	constructor(ipcRenderer) {
		this.ipcRenderer = ipcRenderer;

		this.setupEventListeners();

		this.ipcRenderer.on(applicationEvents.BACKEND_READY, () => {
			const sourceIds = Object.keys(config.get('sources'));
			if (sourceIds[0]) {
				this.selectSource(sourceIds[0]);
			}
		});

		this.ipcRenderer.send(applicationEvents.BACKEND_INITIALIZE);

		this.directTakeMode = false;
	}

	setupEventListeners() {
		document.addEventListener(sourceSelectorEventNames.SOURCE_SELECTED, ({ detail }) => {
			this.selectSource(detail.id);
		});

		document.addEventListener(videoCropperEventNames.CROP_MOVE, ({ detail }) => {
			if (detail) {
				this.moveCrop(detail);
			}
		});

		document.addEventListener('click', ({ target }) => {
			if (target.classList.contains('take-controls--button') && target.classList.contains('take')) {
				this.take();
			}
		});

		document.addEventListener(directTakeToggleEvents.ACTIVATE, () => {
			this.directTakeMode = true;
		});

		document.addEventListener(directTakeToggleEvents.DEACTIVATE, () => {
			this.directTakeMode = false;
		});
	}

	moveCrop({ cutoutId, cutout }) {
		if (cutoutId && cutout) {
			this.triggerSendUpdate(cutoutId, cutout);

			config.set(`cutouts.${cutoutId}`, cutout);
		}
	}

	selectSource(id) {
		let cutoutId = findCutoutIdFromSourceId(id);

		if (!cutoutId) {
			const cutout = createCutoutFromSource(id);
			if (cutout) {
				cutoutId = `cutout_${id}`;
				this.ipcRenderer.send(applicationEvents.UPDATE_CUTOUT, cutoutId, cutout);
			}
		}

		if (cutoutId) {
			if (this.directTakeMode === true) {
				this.setProgram(cutoutId);
			} else {
				this.setPreview(cutoutId);
			}
		}
	}

	take() {
		const preview = document.querySelector(`${videoCropperTagName}.preview`);
		const program = document.querySelector(`${videoCropperTagName}.program`);

		const cutoutOnPreviewId = preview.getAttribute(videoCropperAttributeNames.CUTOUT_ID);
		const cutoutOnProgramId = program.getAttribute(videoCropperAttributeNames.CUTOUT_ID);

		const cutouts = config.get('cutouts');
		if (cutoutOnPreviewId && cutouts[cutoutOnPreviewId]) {
			this.setProgram(cutoutOnPreviewId);
			this.setPreview(cutoutOnProgramId);
		}
	}

	setPreview(cutoutId) {
		const preview = document.querySelector(`${videoCropperTagName}.preview`);
		const sourceId = getCutoutSourceId(cutoutId);

		preview.setAttribute(videoCropperAttributeNames.CUTOUT_ID, cutoutId);
		document.querySelectorAll(sourceSelectorTagName).forEach((sourceSelector) => {
			sourceSelector.setAttribute(sourceSelectorAttributeNames.PREVIEW_ID, sourceId);
		});

		this.ipcRenderer.send(applicationEvents.SET_PREVIEW, cutoutId);
	}

	setProgram(cutoutId) {
		const program = document.querySelector(`${videoCropperTagName}.program`);
		const sourceId = getCutoutSourceId(cutoutId);

		program.setAttribute(videoCropperAttributeNames.CUTOUT_ID, cutoutId);
		document.querySelectorAll(sourceSelectorTagName).forEach((sourceSelector) => {
			sourceSelector.setAttribute(sourceSelectorAttributeNames.PROGRAM_ID, sourceId);
		});

		this.ipcRenderer.send(applicationEvents.TAKE, cutoutId);
	}

	triggerSendUpdate(cutoutId, cutout) {
		if (!this.sendUpdateTimeout) {
			this.sendUpdateTimeout = setTimeout(() => {
				this.sendUpdateTimeout = null;

				this.ipcRenderer.send(applicationEvents.UPDATE_CUTOUT, cutoutId, cutout);
			}, 40);
		}
	}
}
