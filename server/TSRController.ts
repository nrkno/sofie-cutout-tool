import * as _ from 'underscore'
import {
	scale,
	translate,
	// @ts-ignore
	compose,
	applyToPoint,
	rotateDEG,
	Matrix
} from 'transformation-matrix'
import {
	Mappings,
	TSRTimeline,
	DeviceOptionsAny,
	DeviceType,
	Conductor,
	DeviceContainer,
	TimelineContentTypeCasparCg,
	Mixer,
	TimelineObjCasparCGAny,
	TimelineObjCCGMedia,
	TimelineObjCCGInput,
	ChannelFormat,
	TimelineObjCCGRoute,
	TSRTimelineObj,
	TimelineObjCCGHTMLPage
} from 'timeline-state-resolver'
import {
	Sources,
	SourceInputType,
	Cutouts,
	Outputs,
	OutputType,
	OutputAny,
	Source,
	Cutout,
	SourceInputAny
} from './api'

export class TSRController {

	private tsr: Conductor
	private _tsrDevices: {[deviceId: string]: DeviceContainer} = {}

	public timeline: TSRTimeline = []
	public mappings: any = {}

	public refer: CasparReferrer

	constructor () {

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
	async init () {
		console.log('TSR init')
		await this.tsr.init()

		// TODO: Move info config file:
		this._addTSRDevice('casparcg0', {
			type: DeviceType.CASPARCG,
			options: {
				host: '127.0.0.1',
				port: 5250
			},
			isMultiThreaded: false

		})


		// this.updateTimeline()
	}
	async destroy () {
		await this.tsr.destroy()
	}
	/** Calculate new timeline and send it into TSR */
	updateTimeline(
		sources: Sources,
		cutouts: Cutouts,
		outputs: Outputs
	) {

		this.mappings = {}
		this.timeline = []
		this.refer.reset()

		// Sort the outputs, to make sure we're processing the multiview first, since we want that to host the inputs,
		// which are then routed to other places
		outputs.sort((a,b) => {
			if (a.type === OutputType.MULTIVIEW && b.type !== OutputType.MULTIVIEW) return -1
			if (a.type !== OutputType.MULTIVIEW && b.type === OutputType.MULTIVIEW) return 1
		})

		_.each(outputs, (output: OutputAny, outputi: number) => {

			if (output.type === OutputType.CUTOUT) {

				const layer = 'output' + outputi + '_source'
				this.mappings[layer] = {
					device: DeviceType.CASPARCG,
					deviceId: 'casparcg0',
					channel: output.casparChannel,
					layer: 10
				}

				const cutout = cutouts[output.cutout.cutoutId]
				if (!cutout) throw Error(`cutout "${output.cutout.cutoutId} not found!`)
				const source = sources[cutout.source]
				if (!source) throw Error(`source "${cutout.source} not found!`)

				const cutoutInOutput = output.cutout

				let sourceTransform = this._sourceTransform(source)
				let cutoutTransform = this._cutoutTransform(source, sourceTransform, cutout)
				
				let matrix0 = compose(
					rotateDEG(cutout.outputRotation, 0, 0),
				)
				const rotatedCutout = applyToPoint(matrix0, { x: cutout.width, y: cutout.height })
				let scaleToFill = (
					cutoutInOutput.scale ||
					Math.min(
						output.width  / Math.abs(rotatedCutout.x),
						output.height / Math.abs(rotatedCutout.y)
					)
				)
				
				let viewportTransform = compose(
					translate(0.5, 0.5),
					scale( 1 / output.width, 1 / output.height ),
					translate( cutoutInOutput.x, cutoutInOutput.y ),
					rotateDEG(cutout.outputRotation, 0.5, 0.5),
					scale( scaleToFill ),
				)
				let outputTransform = compose(
					viewportTransform,
					cutoutTransform
				)

				const mixerPosition = this._casparTransformPosition(
					source,
					outputTransform
				)
				const mixerClipping = this._casparTransformClip(
					cutout,
					viewportTransform
				)

				this.timeline.push(
					this.refer.getSource(
						source.input,
						layer,
						{
							...mixerPosition,
							...mixerClipping
						}
					)
				)
			} else if (output.type === OutputType.MULTIVIEW) {

				if (output.background) {

					const layerMultiviewBg = 'output' + outputi + '_mvbg'
					this.mappings[layerMultiviewBg] = {
						device: DeviceType.CASPARCG,
						deviceId: 'casparcg0',
						channel: output.casparChannel,
						layer: 10
					}
					this.timeline.push(this.refer.media(
						layerMultiviewBg,
						output.background
					))
				}

				if (output.cutouts.length) {

					_.each(output.cutouts, (cutoutOutput, i) => {
						const layerBase = 100 + 10 * i
						const layer = 'output' + outputi + '_mv_' + cutoutOutput.cutoutId
						const layerBg = 'output' + outputi + '_mvbg_' + cutoutOutput.cutoutId
						this.mappings[layerBg] = {
							device: DeviceType.CASPARCG,
							deviceId: 'casparcg0',
							channel: output.casparChannel,
							layer: layerBase + 0
						}
						this.mappings[layer] = {
							device: DeviceType.CASPARCG,
							deviceId: 'casparcg0',
							channel: output.casparChannel,
							layer: layerBase + 1
						}

						const cutout = cutouts[cutoutOutput.cutoutId]
						if (!cutout) throw Error(`cutout "${cutoutOutput.cutoutId} not found!`)
						const source = sources[cutout.source]
						if (!source) throw Error(`source "${cutout.source} not found!`)

						let sourceTransform = this._sourceTransform(source)
						let cutoutTransform = this._cutoutTransform(source, sourceTransform, cutout)

						let viewportTransform = compose(
							translate(0.5, 0.5),
							scale( 1 / output.width, 1 / output.height ),
							translate( cutoutOutput.x, cutoutOutput.y ),
							scale( cutoutOutput.scale )
						)
						let outputTransform = compose(
							viewportTransform,
							cutoutTransform
						)

						const mixerPosition = this._casparTransformPosition(
							source,
							outputTransform
						)
						const mixerClipping = this._casparTransformClip(
							cutout,
							viewportTransform
						)
						const mixerClippingBg = this._casparTransformClip(
							cutout,
							viewportTransform
						)

						// Black background behind clip:
						this.timeline.push(
							this.refer.media(
								layerBg,
								'black',
								mixerClippingBg
							)
						)
						this.timeline.push(
							this.refer.getSource(
								source.input,
								layer,
								{
									...mixerPosition,
									...mixerClipping
								}
							)
						)
					})
				}
			}
		})

		_.each(this.timeline, (tlObj, i) => {
			if (!tlObj.id) tlObj.id = 'Unnamed' + i
		})

		// Send mappings and timeline to TSR:
		this.tsr.setMapping(this.mappings)
		this.tsr.timeline = this.timeline
	}

	private _addTSRDevice (deviceId: string, options: DeviceOptionsAny): void {
		// console.log('Adding device ' + deviceId)

		if (!options.limitSlowSentCommand)		options.limitSlowSentCommand = 40
		if (!options.limitSlowFulfilledCommand)	options.limitSlowFulfilledCommand = 100

		this.tsr.addDevice(deviceId, options)
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
	private _removeTSRDevice (deviceId: string) {
		if (this._tsrDevices[deviceId]) {
			this._tsrDevices[deviceId].device.terminate()
			.catch(e => {
				console.error('Error when removing device: ' + e)
			})
		}
		delete this._tsrDevices[deviceId]
	}
	private _sourceTransform (source: Source): Matrix {
		// Transform from source to view-space:
		return compose(
			rotateDEG(-source.rotation)
		)
	}
	private _cutoutTransform (
		source: Source,
		sourceTransform: Matrix,
		cutout: Cutout
	): Matrix {
		// Transform from view-space, via cutout to Output
		const u1 = applyToPoint(sourceTransform, {x: source.width, y: source.height})
		const sourceDimensions = { // In view-space
			width: Math.abs(u1.x),
			height: Math.abs(u1.y)
		}
		return compose(
			translate(-cutout.x, -cutout.y),
			sourceTransform,
		)
	}
	private _casparTransformPosition (
		source: { width: number, height: number},
		outputTransform: Matrix,
	): Mixer {

		// Apply coordinates to CasparCG coordinate system:
		const x0 = -source.width/2
		const y0 = -source.height/2
		const x1 = source.width/2
		const y1 = source.height/2

		const topLeft		= applyToPoint(outputTransform, {x: x0,	y: y0})
		const topRight		= applyToPoint(outputTransform, {x: x1,	y: y0})
		const bottomLeft	= applyToPoint(outputTransform, {x: x0,	y: y1})
		const bottomRight	= applyToPoint(outputTransform, {x: x1,	y: y1})

		const mixer: Mixer = {
			...this._casparTransformTransition(),
			perspective: {
				topLeftX: topLeft.x,
				topLeftY: topLeft.y,
				topRightX: topRight.x,
				topRightY: topRight.y,
				bottomRightX: bottomRight.x,
				bottomRightY: bottomRight.y,
				bottomLeftX: bottomLeft.x,
				bottomLeftY: bottomLeft.y,
			}
		}
		return mixer
	}
	private _casparTransformClip (
		clipDimensions: {width: number, height: number},
		transform: Matrix,
	): Mixer {
		// Apply coordinates to CasparCG coordinate system:

		const x0 = -clipDimensions.width/2
		const y0 = -clipDimensions.height/2
		const x1 = clipDimensions.width/2
		const y1 = clipDimensions.height/2

		const u0	= applyToPoint(transform, {x: x0,	y: y0})
		const u1	= applyToPoint(transform, {x: x1,	y: y1})

		const topLeft = {
			x: Math.min(u0.x, u1.x),
			y: Math.min(u0.y, u1.y)
		}
		const bottomRight = {
			x: Math.max(u0.x, u1.x),
			y: Math.max(u0.y, u1.y)
		}

		const mixer: Mixer = {
			...this._casparTransformTransition(),
			clip: {
				x: topLeft.x,
				y: topLeft.y,
				width: bottomRight.x - topLeft.x,
				height: bottomRight.y - topLeft.y
			}
		}
		return mixer
	}
	private _casparTransformTransition (): Mixer {
		return {
			inTransition: {
				easing: 'EASEINOUTQUAD',
				duration: 500
			},
			changeTransition: {
				easing: 'EASEINOUTQUAD',
				duration: 500
			},
		}
	}
}

class CasparReferrer {
	decklingInputRefs: DecklinkInputRefs = {}

	reset () {
		this.decklingInputRefs = {}
	}
	
	getSourceRef (input: SourceInputAny): string {
		if (input.type === SourceInputType.MEDIA) {
			return this.mediaRef(input.file)
		} else if (input.type === SourceInputType.DECKLINK) {
			return this.inputRef('decklink',input.device,input.format)
		} else if (input.type === SourceInputType.HTML_PAGE) {
			return this.htmlPageRef(input.url)
		} else {
			// @ts-ignore never
			throw new Error(`Unknown input.type "${input.type}"`)
		}
	}
	getSource (input: SourceInputAny, layer: string, mixer: Mixer): TSRTimelineObj {
		if (input.type === SourceInputType.MEDIA) {
			return this.media(
				layer,
				input.file,
				mixer
			)
		} else if (input.type === SourceInputType.DECKLINK) {
			return this.input(
				layer,
				'decklink',
				input.device,
				input.format,
				mixer
			)
		} else if (input.type === SourceInputType.HTML_PAGE) {
			return this.htmlPage(
				layer,
				input.url,
				mixer
			)
		} else {
			// @ts-ignore never
			throw new Error(`Unknown input.type "${input.type}"`)
		}
	}

	mediaRef (file: string): string {
		return 'media_' + file
	}
	media (layer: string, file: string, mixer?: Mixer): TimelineObjCCGMedia | TimelineObjCCGRoute {

		const refId = this.mediaRef(file)
		const ref = this.getRef(refId, layer, mixer)
		if (ref) return ref
		const o: TimelineObjCCGMedia = {
			id:  '',
			layer: layer,
			enable: { while: 1 },
			content: {
				deviceType: DeviceType.CASPARCG,
				type: TimelineContentTypeCasparCg.MEDIA,
				file: file,
				loop: true,
				mixer: mixer
			}
		}
		this.setRef(refId, layer)
		return o
	}
	inputRef (inputType: string, device: number, deviceFormat: ChannelFormat): string {
		return 'input_' + inputType + '_' + device + '_' + deviceFormat
	}
	input (layer: string, inputType: string, device: number, deviceFormat: ChannelFormat, mixer?: Mixer): TimelineObjCCGInput | TimelineObjCCGRoute {
		const refId = this.inputRef (inputType, device, deviceFormat)
		const ref = this.getRef(refId, layer, mixer)
		if (ref) return ref
		const o: TimelineObjCCGInput = {
			id:  '',
			layer: layer,
			enable: { while: 1 },
			content: {
				deviceType: DeviceType.CASPARCG,
				type: TimelineContentTypeCasparCg.INPUT,
				device: device,
				deviceFormat: deviceFormat,
				inputType: inputType,

				mixer: mixer
			}
		}
		this.setRef(refId, layer)
		return o
	}
	htmlPageRef (url: string): string {
		return 'htmlpage_' + url
	}
	htmlPage (layer: string, url: string, mixer?: Mixer): TimelineObjCCGHTMLPage | TimelineObjCCGRoute {
		const refId = this.htmlPageRef(url)
		const ref = this.getRef(refId, layer, mixer)
		if (ref) return ref
		const o: TimelineObjCCGHTMLPage = {
			id:  '',
			layer: layer,
			enable: { while: 1 },
			content: {
				deviceType: DeviceType.CASPARCG,
				type: TimelineContentTypeCasparCg.HTMLPAGE,
				url: url,
				mixer: mixer
			}
		}
		this.setRef(refId, layer)
		return o
	}
	getRef (refId: string, layer: string, mixer?: Mixer): TimelineObjCCGRoute | null {
		const ref = this.decklingInputRefs[refId]
		if (ref) {
			return {
				id:  '',
				layer: layer,
				enable: { while: 1 },
				content: {
					deviceType: DeviceType.CASPARCG,
					type: TimelineContentTypeCasparCg.ROUTE,
					mappedLayer: ref,

					mixer: mixer
				}
			}
		}
	}
	private setRef(refId, layer) {
		this.decklingInputRefs[refId] = layer
	}
}
interface DecklinkInputRefs {
	[refId: string]: string
}
