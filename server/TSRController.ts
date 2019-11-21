import * as fs from 'fs'
import * as _ from 'underscore'
import * as path from 'path'
import {
	Mappings,
	TSRTimeline,
	DeviceOptionsAny,
	DeviceType,
	Conductor,
	DeviceContainer,
	TimelineContentTypeCasparCg
} from 'timeline-state-resolver'


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

		this.mappings = {
			'video0': {
				device: DeviceType.CASPARCG,
				deviceId: 'casparcg0',
				channel: 1,
    			layer: 10
			}
		}

		this.timeline = [
			{
				id: 'amb0',
				layer: 'video0',
				enable: { while: 0 },
				content: {
					deviceType: DeviceType.CASPARCG,
					type: TimelineContentTypeCasparCg.MEDIA,
					file: 'AMB'
				}
			}
		]

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
}
