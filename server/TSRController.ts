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
	TimelineObjCasparCGAny
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
	OutputMultiview,
	CutoutInOutput
} from './api'

export class TSRController {

	private tsr: Conductor
	private _tsrDevices: {[deviceId: string]: DeviceContainer} = {}

	private timeline: TSRTimeline = []
	private mappings: any = {}

	constructor () {


		this.tsr = new Conductor({
			initializeAsClear: true,
			multiThreadedResolver: true,
			proActiveResolve: true
		})

		this.tsr.on('error', (e, ...args) => {
			console.error('Error: TSR', e, ...args)
		})
		this.tsr.on('info', (msg, ...args) => {
			console.log('TSR', msg, ...args)
		})
		this.tsr.on('warning', (msg, ...args) => {
			console.log('Warning: TSR', msg, ...args)
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
			}

		})


		this.updateTimeline()
	}
	/** Calculate new timeline and send it into TSR */
	updateTimeline() {

		// Note: these hard-coded values are temporary, and will later be provided by the user or config files.
		const tmpSources: Sources = {
			'caspar': {
				title: 'Source A',
				width: 1280,
				height: 720,
				rotation: 0,
				input: {
					type: SourceInputType.MEDIA,
					file: 'amb2'
				}
			},
			'head': {
				title: 'Source B',
				width: 1280,
				height: 720,
				rotation: 90,
				input: {
					type: SourceInputType.MEDIA,
					file: 'head0'
				}
			}
		}

		const tmpCutouts: Cutouts = {
			'casparfull': {
				source: 'caspar',
				x: 0,
				y: 0,
				width: 1280,
				height: 720,
				outputRotation: 0,
			},
			'casparzoom': {
				source: 'caspar',
				x: 250,
				y: 150,
				width: 720,
				height: 405,
				outputRotation: 0,
			},
			'head': {
				source: 'head',
				x: 0,
				y: 0,
				width: 1280,
				height: 720,
				outputRotation: 90,
			},
			'headsquare': {
				source: 'head',
				x: 0,
				y: 0,
				width: 1280,
				height: 720,
				outputRotation: 0,
			}
		}

		const tmpOutputs: Outputs = [
			{
				type: OutputType.CUTOUT,
				casparChannel: 0,
				width: 1280,
				height: 720,
				cutout: {
					cutoutId: 'head',
					x: 0,
					y: 0,
					scale: 1
				}
			},
			{
				type: OutputType.CUTOUT,
				casparChannel: 3,
				width: 1280,
				height: 720,
				cutout: {
					cutoutId: 'casparzoom',
					x: 0,
					y: 0,
					scale: 1
				}
			},
			{
				type: OutputType.MULTIVIEW,
				cutouts: [
					{
						cutoutId: 'casparfull',
						x: -400,
						y: -200,
						scale: 0.25
					},
					{
						cutoutId: 'casparzoom',
						x: 0,
						y: -200,
						scale: 0.25
					},
					{
						cutoutId: 'head',
						x: -400,
						y: 100,
						scale: 0.25
					},
					{
						cutoutId: 'headsquare',
						x: 0,
						y: 100,
						scale: 0.25
					}
				],
				casparChannel: 2,
				width: 1280,
				height: 720
			}
		]

		this.mappings = {}
		this.timeline = []

		_.each(tmpOutputs, (output: OutputAny, outputi: number) => {

			if (output.type === OutputType.CUTOUT) {

				const layer = 'output' + outputi + '_source'
				this.mappings[layer] = {
					device: DeviceType.CASPARCG,
					deviceId: 'casparcg0',
					channel: output.casparChannel,
					layer: 10
				}

				const cutout = tmpCutouts[output.cutout.cutoutId]
				if (!cutout) throw Error(`cutout "${output.cutout.cutoutId} not found!`)
				const source = tmpSources[cutout.source]
				if (!source) throw Error(`source "${cutout.source} not found!`)

				let sourceTransform = this._sourceTransform(source)
				let cutoutTransform = this._cutoutTransform(source, sourceTransform, cutout)

				let outputTransform = compose(
					translate(0.5, 0.5),
					scale( 1 / output.width, 1 / output.height ),
					cutoutTransform,
					rotateDEG(cutout.outputRotation, 0.5, 0.5),
				)

				const mixer = this._casparTransform(
					source,
					outputTransform
				)

				if (source.input.type === SourceInputType.MEDIA) {
					this.timeline.push(Caspar.media(
						layer,
						source.input.file,
						mixer
					))

				} else if (source.input.type === SourceInputType.DECKLINK) {
					throw new Error('Not implemented yet')
				} else {
					// @ts-ignore never
					throw new Error(`Unknown source.input.type "${source.input.type}"`)
				}
			} else if (output.type === OutputType.MULTIVIEW) {

				const layerMultiviewBg = 'output' + outputi + '_mvbg'
				this.mappings[layerMultiviewBg] = {
					device: DeviceType.CASPARCG,
					deviceId: 'casparcg0',
					channel: output.casparChannel,
					layer: 10
				}
				this.timeline.push(Caspar.media(
					layerMultiviewBg,
					'multiview_bg'
				))

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

						const cutout = tmpCutouts[cutoutOutput.cutoutId]
						if (!cutout) throw Error(`cutout "${cutoutOutput.cutoutId} not found!`)
						const source = tmpSources[cutout.source]
						if (!source) throw Error(`source "${cutout.source} not found!`)

						let sourceTransform = this._sourceTransform(source)
						let cutoutTransform = this._cutoutTransform(source, sourceTransform, cutout)

						let outputTransform = compose(
							translate(0.5, 0.5),
							scale( 1 / output.width, 1 / output.height ),
							translate( cutoutOutput.x, cutoutOutput.y ),
							scale( cutoutOutput.scale ),
							cutoutTransform
						)
						let viewportTransform = compose(
							translate(0.5, 0.5),
							scale( 1 / output.width, 1 / output.height ),
							translate( cutoutOutput.x, cutoutOutput.y ),
							scale( cutoutOutput.scale )
						)

						const mixer = this._casparTransform(
							source,
							outputTransform
						)
						const mixerClip = this._casparClip(
							output,
							cutout,
							viewportTransform
						)

						// Black background behind clip:
						this.timeline.push(
							Caspar.media(
								layerBg,
								'black',
								mixerClip
							)
						)

						if (source.input.type === SourceInputType.MEDIA) {
							// The clip in multiviewer
							this.timeline.push(
								Caspar.media(
									layer,
									source.input.file,
									{
										...mixer,
										...mixerClip
									}
								)
							)


						} else if (source.input.type === SourceInputType.DECKLINK) {
							throw new Error('Not implemented yet')
						} else {
							// @ts-ignore
							throw new Error(`Unknown source.input.type "${source.input.type}"`)
						}
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
		console.log('Adding device ' + deviceId)

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
				console.log(`Device ${device.deviceId}: slow command: ${msg}`)
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
			scale(source.width / cutout.width, source.height / cutout.height),
			translate(-cutout.x, -cutout.y),
			sourceTransform,
		)
	}
	private _casparTransform (
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
	private _casparClip (
		output: OutputMultiview,
		cutout: Cutout,
		outputTransform: Matrix,
	): Mixer {
		// Apply coordinates to CasparCG coordinate system:

		const x0 = -output.width/2
		const y0 = -output.height/2
		const x1 = output.width/2
		const y1 = output.height/2

		const matrix = compose(
			outputTransform,
			rotateDEG(cutout.outputRotation),
		)

		const u0	= applyToPoint(matrix, {x: x0,	y: y0})
		const u1	= applyToPoint(matrix, {x: x1,	y: y1})

		const topLeft = {
			x: Math.min(u0.x, u1.x),
			y: Math.min(u0.y, u1.y)
		}
		const bottomRight = {
			x: Math.max(u0.x, u1.x),
			y: Math.max(u0.y, u1.y)
		}

		const mixer: Mixer = {
			clip: {
				x: topLeft.x,
				y: topLeft.y,
				width: bottomRight.x - topLeft.x,
				height: bottomRight.y - topLeft.y
			}
		}
		return mixer
	}
}

namespace Caspar {
	export function media (layer: string, file: string, mixer?: Mixer): TimelineObjCasparCGAny {
		return {
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
	}
}
