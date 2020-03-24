import { DataHandler } from './server/dataHandler'
import { TSRController } from './server/TSRController'

// Note: this is a temporary file, that
const dataHandler = new DataHandler('./')
const tsrController = new TSRController()

dataHandler
	.updateConfig()
	.then(() => {
		return tsrController.init(dataHandler.getConfig())
	})
	.catch(console.error)

dataHandler.onConfigChanged(() => {
	console.log('config changed, reloading..')

	tsrController.triggerUpdateTimeline(dataHandler.getConfig(), {})
})
