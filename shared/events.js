export { EventNames };

/**
 * Application event names used for communication between the back and front ends.
 * @readonly
 * @enum {string}
 */
const EventNames = {
	/** Back end initialize signal */
	BACKEND_INITIALIZE: 'initialize',

	/** Back end initialized and ready */
	BACKEND_READY: 'backend-ready',

	/** Set preview source */
	SET_PREVIEW: 'preview',

	/** Set current preview source to program (also sets current program to preview) */
	TAKE: 'take',

	/** Configuration has been updated and should be refreshed */
	UPDATE_CONFIG: 'new-config',

	/** Update cutout size and position */
	UPDATE_CUTOUT: 'update-cutout'
};
