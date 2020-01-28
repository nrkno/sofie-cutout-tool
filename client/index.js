import { init as cutoutManagerInit } from './scripts/cutout-manager.js';

/* using console.log from inside init for some reason doesn't work,
so here's this monstrosity */
const logger = {
	log: (args) => {
		console.log('logger.log()', args);
		console.log(args);
	},
	warn: (args) => console.warn(args),
	error: (args) => console.error(args),
	info: (args) => console.info(args)
};

console.log('document', document);

console.log('Client scripts loaded.');
console.log(cutoutManagerInit(logger, document));
console.log('Client scripts init executed');
