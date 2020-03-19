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
		}
		this.connection = new CasparCG(this.host, this.port)
		return this
	}

	async connect(): Promise<Command.IAMCPCommand> {
		return this.connection.addStream(this.channel, this.streamUri, this.streamParams, this.streamId)
	}

	async disconnect(): Promise<Command.IAMCPCommand> {
		return this.connection.remove(this.channel, this.streamId)
	}

	async isConnected(): Promise<boolean> {
		let channelInfo = await this.connection.info(this.channel)
		return channelInfo.response.raw.indexOf(`<index>${this.streamId}</index>`) >= 0
	}
}

let connection = new CasparCG()
let streamAdd = connection.addStream(
	2,
	'rtmp://NRK_RTMP20:Z4e6Mkmmxg2dWN@nrkhd-rtmp-in1.netwerk.no:1934/live/stream-159586_1',
	' -codec:v libx264 -filter:v "scale=out_range=full,fps=25,format=yuv420p,setsar=1:1,setdar=1:1" -profile:v high -level:v 3.2 -g 50 -preset fast -tune fastdecode -crf 18 -maxrate 2.5M -bufsize 1.5M -codec:a aac -b:a 160k -f flv',
	99)

connection.remove(2, 99)

streamAdd.then(console.log, console.error)
