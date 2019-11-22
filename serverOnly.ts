import { TSRController } from './server/TSRController'

// Note: this is a temporary file, that

const tsrController = new TSRController()

tsrController.init().catch(console.error)
