import {
	Conductor,
	DeviceContainer,
	DeviceOptionsAny,
	DeviceType,
	Mixer,
	TSRTimeline,
	TimelineContentTypeCasparCg
} from 'timeline-state-resolver'
import {
	Cutout,
	Cutouts,
	OutputAny,
	OutputType,
	Outputs,
	Source,
	Sources,
	Settings,
	SourceInputAny,
	FullConfig
} from './api'
import { Matrix, applyToPoint, compose, rotateDEG, scale, translate } from 'transformation-matrix'

import { CasparReferrer } from './CasparReferrer'
import _ from 'underscore'
import { getImageProviderLocation } from './imageProvider'
import axios from 'axios'

const CASPARCG_DEVICE_ID = 'casparcg0'

export class TSRController {
	private tsr: Conductor
	private _tsrDevices: { [deviceId: string]: DeviceContainer } = {}

	public timeline: TSRTimeline = []
	public mappings: any = {}

	public refer: CasparReferrer

	private _memorySources: { [channelLayer: string]: SourceInputAny } = {}
	private _updateTimelineRunning?: boolean
	private _nextUpdateTimeline?: {
		fullConfig: FullConfig
		runtimeData: RunTimeData
		resolve: (() => void)[]
		reject: ((e: any) => void)[]
	}

	constructor() {
		this.refer = new CasparReferrer()
		this.tsr = new Conductor({
			initializeAsClear: true,
			multiThreadedResolver: false,
			proActiveResolve: true
		})

		this.tsr.on('error', (e, ...args) => {
			console.error('Error: TSR', e, ...args)
		})
		this.tsr.on('info', (msg, ...args) => {
			// console.log('TSR', msg, ...args)
		})
		this.tsr.on('warning', (msg, ...args) => {
			console.log('Warning: TSR', msg, ...args)
		})
		this.tsr.on('debug', (msg, ...args) => {
			// console.log('Debug: TSR', msg, ...args)
		})
		// this.tsr.on('setTimelineTriggerTime', (_r: TimelineTriggerTimeResult) => {})
		// this.tsr.on('timelineCallback', (_time, _objId, _callbackName, _data) => {})
	}
	async init(fullConfig: FullConfig): Promise<void> {
		console.log('Initializing TSR...')
		await this.tsr.init()
		let host = '127.0.0.1'
		let port = 5250

		if (fullConfig.settings && fullConfig.settings.casparCG) {
			host = fullConfig.settings.casparCG.hostname
			port = fullConfig.settings.casparCG.port
		}

		// TODO: Move info config file:
		this._addTSRDevice(CASPARCG_DEVICE_ID, {
			type: DeviceType.CASPARCG,
			options: {
				host,
				port
			},
			isMultiThreaded: false
		})

		// this.updateTimeline()
	}
	async destroy(): Promise<void> {
		await this.tsr.destroy()
	}
	/**
	 * Ensure there's only one updateTimeline running at the same time
	 * If an updateTimeline is already running, we'll use the newest parameters, and run updateTimeline later
	 * Returns a promise that will resolve after updateTimeline has run
	 * @param fullConfig
	 * @param runtimeData
	 */
	triggerUpdateTimeline(fullConfig: FullConfig, runtimeData: RunTimeData): Promise<void> {
		const checkRunUpdateTimeline = () => {
			if (!this._updateTimelineRunning && this._nextUpdateTimeline) {
				this._updateTimelineRunning = true

				const nextUpdateTimeline = this._nextUpdateTimeline
				delete this._nextUpdateTimeline

				this.updateTimeline(nextUpdateTimeline.fullConfig, nextUpdateTimeline.runtimeData)
					.then(() => {
						this._updateTimelineRunning = false
						_.each(nextUpdateTimeline.resolve, (resolve) => resolve())
						checkRunUpdateTimeline()
					})
					.catch((e) => {
						this._updateTimelineRunning = false
						_.each(nextUpdateTimeline.reject, (reject) => reject(e))
						checkRunUpdateTimeline()
					})
			}
		}

		return new Promise((resolve, reject) => {
			if (!this._nextUpdateTimeline)
				this._nextUpdateTimeline = {
					fullConfig: fullConfig,
					runtimeData: runtimeData,
					resolve: [],
					reject: []
				}

			// Set the latest parameters, as they are most recent:
			this._nextUpdateTimeline.fullConfig = fullConfig
			this._nextUpdateTimeline.runtimeData = runtimeData

			this._nextUpdateTimeline.resolve.push(resolve)
			this._nextUpdateTimeline.reject.push(reject)

			checkRunUpdateTimeline()
		})
	}
	/** Calculate new timeline and send it into TSR */
	private async updateTimeline(fullConfig: FullConfig, runtimeData: RunTimeData): Promise<void> {
		const sources: Sources = fullConfig.sources
		const cutouts: Cutouts = fullConfig.cutouts
		const outputs: Outputs = fullConfig.outputs
		const settings: Settings = fullConfig.settings

		this.mappings = {}
		this.timeline = []
		this.refer.reset()

		let routeLayer = settings.channelForRoutesStartLayer
		let routeChannel = settings.channelForRoutes
		const prepareContentRoute = async (source: Source, sourceId: string) => {
			const input: SourceInputAny = source.input

			const refId = this.refer.getSourceRef(input)

			const mixer: Mixer = {}

			if (settings.useImageProviderForRoutes) {
				const url = `${getImageProviderLocation(settings)}/custom/${sourceId}`

				const response = await axios.get(url)
				// console.log('response.data', response.data);
				// info.regions

				const data: any = response.data
				const region = _.find(data.regions as any[], (region) => region.contentId === sourceId)
				if (!region) throw new Error(`Region "${sourceId}" not found`)
				routeChannel = region.region.channel
				routeLayer = region.region.layer

				mixer.volume = 0
			} else {
				routeLayer++
				mixer.opacity = 0
				mixer.volume = 0
			}

			const layer = 'output' + routeLayer + '_content'

			if (
				!this.refer.getRef(refId, layer) // If there already is a reference, do nothing as the source is already playing in Caspar
			) {
				this.mappings[layer] = {
					device: DeviceType.CASPARCG,
					deviceId: CASPARCG_DEVICE_ID,
					channel: routeChannel,
					layer: routeLayer
				}
				this.timeline.push(this.refer.getSource(input, layer, mixer))
			}
		}
		const shouldUseTransition = (layer: string, source: Source): boolean => {
			const mapping = this.mappings[layer]
			const channelLayerId = 'oldSource_' + mapping.channel * 1000 + mapping.layer

			if (_.isEqual(this._memorySources[channelLayerId], source.input)) {
				return true
			} else {
				this._memorySources[channelLayerId] = source.input
				return false
			}
		}

		for (const sourceId in sources) {
			const source = sources[sourceId]
			await prepareContentRoute(source, sourceId)
		}

		_.each(outputs, (output: OutputAny, outputi: number) => {
			if (!output.options) output.options = {}
			if (output.type === OutputType.CUTOUT) {
				const activeCutoutId: string | undefined = runtimeData.pgmCutout || output.cutout.cutoutId

				let cutouti = 0
				_.each(cutouts, (cutout, cutoutId) => {
					cutouti++

					const layer = 'output' + outputi + '_cutout' + cutoutId
					this.mappings[layer] = {
						device: DeviceType.CASPARCG,
						deviceId: CASPARCG_DEVICE_ID,
						channel: output.casparChannel,
						layer: 200 + cutouti * 10
					}

					const cutoutIsActive = cutoutId === activeCutoutId

					const useCutout = cutoutIsActive || output.options.audio

					if (useCutout) {
						// const cutoutId = output.cutout.cutoutId
						// const cutout = cutouts[cutoutId]
						// if (!cutout) throw Error(`cutout "${cutoutId} not found!`)
						const source = sources[cutout.source]
						if (!source) throw Error(`source "${cutout.source} not found!`)

						const useTransition = shouldUseTransition(layer, source)

						const cutoutInOutput = output.cutout

						const sourceTransform = this._sourceTransform(source)
						const cutoutTransform = this._cutoutTransform(source, sourceTransform, cutout)

						const matrix0 = compose(rotateDEG(cutout.outputRotation, 0, 0))
						const rotatedCutout = applyToPoint(matrix0, { x: cutout.width, y: cutout.height })
						const scaleToFill =
							cutoutInOutput.scale ||
							Math.min(
								output.width / Math.abs(rotatedCutout['x']),
								output.height / Math.abs(rotatedCutout['y'])
							)

						const viewportTransform = compose(
							translate(0.5, 0.5),
							scale(1 / output.width, 1 / output.height),
							translate(cutoutInOutput.x, cutoutInOutput.y),
							rotateDEG(cutout.outputRotation, 0.5, 0.5),
							scale(scaleToFill)
						)
						const outputTransform = compose(viewportTransform, cutoutTransform)

						const mixerPosition = this._casparTransformPosition(
							source,
							outputTransform,
							useTransition
						)
						const mixerClipping = this._casparTransformClip(
							cutout,
							viewportTransform,
							useTransition
						)

						const mixerActive: Mixer = {
							opacity: cutoutIsActive ? 1 : 0
						}
						if (output.options.audio && output.options.audio.enable) {
							// ONLY touch the volume settings if this is set
							const audioOn: boolean =
								cutout.audioAlwaysOn || (cutoutIsActive && cutout.audioFollowVideo) || false

							mixerActive.volume = audioOn
								? cutout.audioVolume === undefined
									? 1
									: cutout.audioVolume
								: 0
						}

						this.timeline.push(
							this.refer.getSource(source.input, layer, {
								...mixerPosition,
								...mixerClipping,
								...mixerActive
							})
						)
					}
				})
			} else if (output.type === OutputType.MULTIVIEW) {
				if (output.background) {
					const layerMultiviewBg = 'output' + outputi + '_mvbg'
					this.mappings[layerMultiviewBg] = {
						device: DeviceType.CASPARCG,
						deviceId: CASPARCG_DEVICE_ID,
						channel: output.casparChannel,
						layer: 10
					}
					this.timeline.push(this.refer.media(layerMultiviewBg, output.background))
				}

				if (output.cutouts.length) {
					_.each(output.cutouts, (cutoutOutput, i) => {
						const layerBase = 100 + 10 * i
						const layer = 'output' + outputi + '_mv_' + cutoutOutput.cutoutId
						const layerBg = 'output' + outputi + '_mvbg_' + cutoutOutput.cutoutId
						this.mappings[layerBg] = {
							device: DeviceType.CASPARCG,
							deviceId: CASPARCG_DEVICE_ID,
							channel: output.casparChannel,
							layer: layerBase + 0
						}
						this.mappings[layer] = {
							device: DeviceType.CASPARCG,
							deviceId: CASPARCG_DEVICE_ID,
							channel: output.casparChannel,
							layer: layerBase + 1
						}

						const cutout = cutouts[cutoutOutput.cutoutId]
						if (!cutout) throw Error(`cutout "${cutoutOutput.cutoutId} not found!`)
						const source = sources[cutout.source]
						if (!source) throw Error(`source "${cutout.source} not found!`)

						const useTransition = shouldUseTransition(layer, source)

						const sourceTransform = this._sourceTransform(source)
						const cutoutTransform = this._cutoutTransform(source, sourceTransform, cutout)

						const viewportTransform = compose(
							translate(0.5, 0.5),
							scale(1 / output.width, 1 / output.height),
							translate(cutoutOutput.x, cutoutOutput.y),
							scale(cutoutOutput.scale)
						)
						const outputTransform = compose(viewportTransform, cutoutTransform)

						const mixerPosition = this._casparTransformPosition(
							source,
							outputTransform,
							useTransition
						)
						const mixerClipping = this._casparTransformClip(
							cutout,
							viewportTransform,
							useTransition
						)
						const mixerClippingBg = this._casparTransformClip(
							cutout,
							viewportTransform,
							useTransition
						)

						// Black background behind clip:
						this.timeline.push(this.refer.media(layerBg, 'black', mixerClippingBg))
						this.timeline.push(
							this.refer.getSource(source.input, layer, {
								...mixerPosition,
								...mixerClipping
							})
						)
					})
				}
			} else if (output.type === OutputType.CHANNEL_ROUTE) {
				const layer = 'output' + outputi + '_channelroute'
				this.mappings[layer] = {
					device: DeviceType.CASPARCG,
					deviceId: CASPARCG_DEVICE_ID,
					channel: output.casparChannel,
					layer: 300
				}

				let mixer: Mixer = {}
				if (output.options && output.options.mixer) mixer = output.options.mixer
				this.timeline.push({
					id: '',
					layer: layer,
					enable: { while: 1 },
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.ROUTE,
						channel: output.routeFromChannel,
						mixer: mixer
					}
				})
			}
		})

		_.each(this.timeline, (tlObj, i) => {
			if (!tlObj.id) tlObj.id = 'Unnamed' + i
		})

		// Send mappings and timeline to TSR:
		this.tsr.setMapping(this.mappings)
		this.tsr.timeline = this.timeline
	}

	private _addTSRDevice(deviceId: string, options: DeviceOptionsAny): void {
		if (!options.limitSlowSentCommand) options.limitSlowSentCommand = 40
		if (!options.limitSlowFulfilledCommand) options.limitSlowFulfilledCommand = 100

		this.tsr
			.addDevice(deviceId, options)
			.then(async (device: DeviceContainer) => {
				this._tsrDevices[deviceId] = device

				await device.device.on('connectionChanged', (v: any) => {
					console.log(`Device ${device.deviceId}: Connection changed: ${v}`)
				})
				await device.device.on('connectionChanged', (status: any) => {
					console.log(`Device ${device.deviceId}: status changed: ${status}`)
				})
				await device.device.on('slowCommand', (msg: string) => {
					// console.log(`Device ${device.deviceId}: slow command: ${msg}`)
				})

				console.log(`Device ${device.deviceId}: status`, await device.device.getStatus())
			})
			.catch((e) => {
				console.error(`Error when adding device "${deviceId}"`, e)
			})
	}
	private _removeTSRDevice(deviceId: string): void {
		if (this._tsrDevices[deviceId]) {
			this._tsrDevices[deviceId].device.terminate().catch((e) => {
				console.error('Error when removing device: ' + e)
			})
		}
		delete this._tsrDevices[deviceId]
	}
	private _sourceTransform(source: Source): Matrix {
		// Transform from source to view-space:
		return compose(rotateDEG(-source.rotation))
	}
	private _cutoutTransform(source: Source, sourceTransform: Matrix, cutout: Cutout): Matrix {
		return compose(translate(-cutout.x, -cutout.y), sourceTransform)
	}
	private _casparTransformPosition(
		source: { width: number; height: number },
		outputTransform: Matrix,
		useTransition: boolean
	): Mixer {
		// Apply coordinates to CasparCG coordinate system:
		const x0 = -source.width / 2
		const y0 = -source.height / 2
		const x1 = source.width / 2
		const y1 = source.height / 2

		const topLeft = applyToPoint(outputTransform, { x: x0, y: y0 })
		const topRight = applyToPoint(outputTransform, { x: x1, y: y0 })
		const bottomLeft = applyToPoint(outputTransform, { x: x0, y: y1 })
		const bottomRight = applyToPoint(outputTransform, { x: x1, y: y1 })

		const mixer: Mixer = {
			...this._casparTransformTransition(useTransition),
			perspective: {
				topLeftX: topLeft['x'],
				topLeftY: topLeft['y'],
				topRightX: topRight['x'],
				topRightY: topRight['y'],
				bottomRightX: bottomRight['x'],
				bottomRightY: bottomRight['y'],
				bottomLeftX: bottomLeft['x'],
				bottomLeftY: bottomLeft['y']
			}
		}
		return mixer
	}
	private _casparTransformClip(
		clipDimensions: { width: number; height: number },
		transform: Matrix,
		useTransition: boolean
	): Mixer {
		// Apply coordinates to CasparCG coordinate system:

		const x0 = -clipDimensions.width / 2
		const y0 = -clipDimensions.height / 2
		const x1 = clipDimensions.width / 2
		const y1 = clipDimensions.height / 2

		const u0 = applyToPoint(transform, { x: x0, y: y0 })
		const u1 = applyToPoint(transform, { x: x1, y: y1 })

		const topLeft = {
			x: Math.min(u0['x'], u1['x']),
			y: Math.min(u0['y'], u1['y'])
		}
		const bottomRight = {
			x: Math.max(u0['x'], u1['x']),
			y: Math.max(u0['y'], u1['y'])
		}

		const mixer: Mixer = {
			...this._casparTransformTransition(useTransition),
			clip: {
				x: topLeft.x,
				y: topLeft.y,
				width: bottomRight.x - topLeft.x,
				height: bottomRight.y - topLeft.y
			}
		}
		return mixer
	}
	private _casparTransformTransition(useTransition: boolean): Mixer {
		if (!useTransition) return {}
		// tmp: disable transition
		return {}
		/*
		return {
			inTransition: {
				easing: 'EASEINOUTQUAD',
				duration: 500
			},
			changeTransition: {
				easing: 'EASEINOUTQUAD',
				duration: 500
			}
		};
		*/
	}
}

export interface DecklinkInputRefs {
	[refId: string]: string
}
export interface RunTimeData {
	pvwCutout?: string
	pgmCutout?: string
}
