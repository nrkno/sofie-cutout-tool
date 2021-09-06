import * as tf from '@tensorflow/tfjs-node'
import * as blazeface from '@tensorflow-models/blazeface'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
// import { promises as fs } from 'fs'
import { isMainThread, parentPort, Worker } from 'worker_threads'

// let isMainThread = false

interface Message {
	fn: string
	args?: any[]
}

let models = {} as {
	faceModel?: blazeface.BlazeFaceModel
	objModel?: cocoSsd.ObjectDetection
}
let worker: Worker

if (isMainThread) {
	worker = new Worker(__filename)
} else {
	parentPort?.on('message', async (message: Message) => {
		if (message.fn === 'initModels') {
			await initModels()
			parentPort?.postMessage({ fn: 'initModels' })
		} else if (message.fn === 'analyse') {
			const res = await analyse(message.args?.[0], message.args?.[1])
			parentPort?.postMessage({ fn: 'analyse', args: [res] })
		}
	})
}

export async function initModels() {
	if (isMainThread && worker) {
		worker.postMessage({ fn: 'initModels' })
		await new Promise<void>((r) => {
			worker.once('message', (m: Message) => {
				if (m.fn === 'initModels') {
					r()
				}
			})
		})
	} else {
		models.faceModel = await blazeface.load()
		models.objModel = await cocoSsd.load()
	}
}

export type AnalyseResult = {
	classesCount: Record<AnalysisResultClass, number>
	regions: Array<{
		topLeft: [number, number]
		bottomRight: [number, number]
		conf: number
		class: AnalysisResultClass
	}>
}
export enum AnalysisResultClass {
	Face = 'FACE',
	PartialFace = 'PARTIAL_FACE',
	Person = 'PERSON',
	Animal = 'ANIMAL',
	Transport = 'TRANSPORT',
	Object = 'OBJECT',
}

const classificationToClass = {
	person: AnalysisResultClass.Person,

	bicycle: AnalysisResultClass.Transport,
	car: AnalysisResultClass.Transport,
	motorcycle: AnalysisResultClass.Transport,
	airplane: AnalysisResultClass.Transport,
	bus: AnalysisResultClass.Transport,
	train: AnalysisResultClass.Transport,
	truck: AnalysisResultClass.Transport,
	boat: AnalysisResultClass.Transport,

	bird: AnalysisResultClass.Animal,
	cat: AnalysisResultClass.Animal,
	dog: AnalysisResultClass.Animal,
	horse: AnalysisResultClass.Animal,
	sheep: AnalysisResultClass.Animal,
	cow: AnalysisResultClass.Animal,
	elephant: AnalysisResultClass.Animal,
	bear: AnalysisResultClass.Animal,
	zebra: AnalysisResultClass.Animal,
	giraffe: AnalysisResultClass.Animal,
}

export async function analyse(rawData?: Buffer, png?: Buffer) {
	if (isMainThread && worker) {
		// console.log([rawData, png].filter((i): i is Buffer => i !== undefined))
		worker.postMessage({ fn: 'analyse', args: [rawData, png] })
		const res = await new Promise<AnalyseResult>((r) => {
			worker.once('message', (m: Message) => {
				if (m.fn === 'analyse') {
					r(m.args?.[0] as any)
				}
			})
		})
		return res
	} else {
		// console.log('worker', rawData, png)
		const tensor = png
			? tf.node.decodePng(Uint8Array.from(png), 3)
			: rawData
			? tf.tensor3d(rawData, [1080, 1920, 3])
			: undefined
		if (!tensor) throw new Error('No input data')

		// Load the models
		const faceModel = models.faceModel || (models.faceModel = await blazeface.load())
		const objModel = models.objModel || (models.objModel = await cocoSsd.load())

		// do predictions
		const faceModelPredictions = await faceModel.estimateFaces(tensor, false, false, true)
		const objModelPredictions = await objModel.detect(tensor, 10, 0.4)

		const results: AnalyseResult = {
			classesCount: {
				[AnalysisResultClass.Face]: 0,
				[AnalysisResultClass.PartialFace]: 0,
				[AnalysisResultClass.Person]: 0,
				[AnalysisResultClass.Animal]: 0,
				[AnalysisResultClass.Transport]: 0,
				[AnalysisResultClass.Object]: 0,
			},
			regions: [],
		}

		for (const pred of faceModelPredictions) {
			const start = pred.topLeft as [number, number]
			const end = pred.bottomRight as [number, number]
			const landmarks = (pred.landmarks as number[][]).filter((p) => p !== undefined).length

			if (landmarks === 6) {
				results.regions.push({
					topLeft: start,
					bottomRight: end,
					class: AnalysisResultClass.Face,
					conf: pred.probability as number,
				})
				results.classesCount[AnalysisResultClass.Face]++
			} else {
				results.regions.push({
					topLeft: start,
					bottomRight: end,
					class: AnalysisResultClass.PartialFace,
					conf: pred.probability as number,
				})
				results.classesCount[AnalysisResultClass.PartialFace]++
			}
		}

		for (const pred of objModelPredictions) {
			const start: [number, number] = [pred.bbox[0], pred.bbox[1]]
			const end: [number, number] = [pred.bbox[0] + pred.bbox[2], pred.bbox[1] + pred.bbox[3]]

			const classification: AnalysisResultClass | undefined =
				classificationToClass[pred.class as keyof typeof classificationToClass]

			results.regions.push({
				topLeft: start,
				bottomRight: end,
				class: classification || AnalysisResultClass.Object,
				conf: pred.score as number,
			})
			results.classesCount[classification || AnalysisResultClass.Object]++
		}

		tf.dispose(tensor)

		return results

		// // find a box from the predictions
		// const adjustBox = (box: [number, number], coordinates: [number, number]) => {
		// 	if (box[0] === -1) {
		// 		box[0] = coordinates[0]
		// 		box[1] = coordinates[1]
		// 	}
		// 	if (coordinates[0] < box[0]) {
		// 		box[0] = coordinates[0]
		// 	}
		// 	if (coordinates[1] > box[1]) {
		// 		box[1] = coordinates[1]
		// 	}
		// }
		// let boundingBox = [-1, -1] as [number, number]
		// let facesBoundingBox = [-1, -1] as [number, number]

		// for (let i = 0; i < objModelPredictions.length; i++) {
		// 	const bbox = objModelPredictions[i].bbox
		// 	const start = [bbox[0], bbox[1]]
		// 	const size = [bbox[2], bbox[3]]

		// 	adjustBox(boundingBox, [start[0], start[0] + size[0]])
		// }

		// for (let i = 0; i < faceModelPredictions.length; i++) {
		// 	const start = faceModelPredictions[i].topLeft as [number, number]
		// 	const end = faceModelPredictions[i].bottomRight as [number, number]
		// 	const size = [end[0] - start[0], end[1] - start[1]]

		// 	adjustBox(boundingBox, [start[0], start[0] + size[0]])
		// 	adjustBox(facesBoundingBox, [start[0], start[0] + size[0]])
		// }

		// let x = 420
		// let w = 1080
		// if (boundingBox[0] === -1) {
		// 	// no objects/faces found so just center it
		// } else if (facesBoundingBox[0] === -1) {
		// 	// only objects
		// 	const w = boundingBox[1] - boundingBox[0]
		// 	const center = boundingBox[0] + w / 2

		// 	if (w < 1080) {
		// 		// shift towards middle
		// 		const dx = (center - 960) / 960 // offset from the middle
		// 		x = center - 480 * dx - 560
		// 	} else {
		// 		// center between boundingBox borders
		// 		x = center - 560
		// 	}
		// } else {
		// 	const facesW = facesBoundingBox[1] - facesBoundingBox[0]
		// 	const objW = boundingBox[1] - boundingBox[0]
		// 	const facesCenter = facesBoundingBox[0] + facesW / 2
		// 	const objCenter = boundingBox[0] + objW / 2

		// 	if (facesCenter === objCenter) {
		// 		// center between boundingBox borders
		// 		x = objCenter - 560
		// 	} else {
		// 		if (faceModelPredictions.length === 1) {
		// 			// single face must be important
		// 			x = facesCenter - 560
		// 			// shift towards middle
		// 			const dx = (facesCenter - 960) / 960 // offset from the middle
		// 			x = facesCenter - 480 * dx - 560
		// 		} else {
		// 			if (facesW < 1080) {
		// 				// in between centers I guess?
		// 				x = (facesCenter + objCenter) / 2 - 560
		// 			} else {
		// 				// can't maintain 1:1
		// 				x = facesBoundingBox[0]
		// 				w = facesW
		// 			}
		// 		}
		// 	}
		// }

		// // clamp x
		// x = Math.min(Math.max(x, 0), 840)

		// tf.dispose(tensor)

		// return { x, w }
	}
}
