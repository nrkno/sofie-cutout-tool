import { CasparCG, Command } from 'casparcg-connection'
import { DataHandler } from './dataHandler'

export class StreamController {
	private host: string = '127.0.0.1'
	private port: number = 5250
	private channel: number = 2
	private streamId: number = 99
	private streamUri: string = ''
	private streamParams: string = '-f flv'
	private connection: CasparCG
	private connected: boolean = false
	private checkInterval: number = 10000
	private watchdog: NodeJS.Timer

	constructor(private dataHandler: DataHandler) { }

	init(): StreamController {
		let fullConfig = this.dataHandler.getConfig()
		if (fullConfig.settings && fullConfig.settings.casparCG) {
			this.host = fullConfig.settings.casparCG.hostname
			this.port = fullConfig.settings.casparCG.port
		}
		if (fullConfig.settings && fullConfig.settings.stream) {
			this.channel = fullConfig.settings.stream.channel
			this.streamUri = fullConfig.settings.stream.streamUri
			this.streamParams = fullConfig.settings.stream.streamParams
			this.streamId = fullConfig.settings.stream.streamId
			this.checkInterval = fullConfig.settings.stream.checkInterval || 1000
		}
		this.connection = new CasparCG(this.host, this.port)
		return this
	}

	private makeConnection () {
		return this.connection.addStream(this.channel, this.streamUri, this.streamParams, this.streamId)
	}

	async connect(): Promise<Command.IAMCPCommand> {
		console.log('Requesting connection')
		this.connected = true
		this.watchdog = setInterval(async () => {
			let currentlyConnected = await this.isConnected()
			if (this.connected && !currentlyConnected) {
				console.log('Found RTMP stream disconnected when it should be connected. Attempting reconnect.')
				this.makeConnection().then(
					() => { console.log('Stream reconnected.') },
					e => { console.error('Failed to reconnect stream.', e) }
				)
			}
		}, this.checkInterval)
		return this.makeConnection()
	}

	async disconnect(): Promise<Command.IAMCPCommand> {
		console.log('Requesting disconnection')
		this.connected = false
		clearInterval(this.watchdog)
		return this.connection.remove(this.channel, this.streamId)
	}

	async isConnected(): Promise<boolean> {
		let channelInfo = await this.connection.info(this.channel)
		return (
			typeof channelInfo.response.data.output !== 'string' &&
			channelInfo.response.data.output.consumers.consumer.some(x => x.index === this.streamId)
		)
	}
}
