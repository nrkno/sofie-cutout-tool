import { DataHandler } from './server/dataHandler';
import { TSRController } from './server/TSRController';

// Note: this is a temporary file, that
const dataHandler = new DataHandler('./');
const tsrController = new TSRController();

tsrController.init().catch(console.error);

dataHandler.onConfigChanged(() => {
	console.log('config changed, reloading..');

	dataHandler
		.requestConfig()
		.then((fullConfig) => {
			tsrController.updateTimeline(
				fullConfig.sources,
				fullConfig.cutouts, // TODO: tmp! this should come from the user instead
				fullConfig.outputs
			);
		})
		.catch(console.error);
});
