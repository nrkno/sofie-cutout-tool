import { Cutouts, Outputs, Sources, Settings, SourceInputType, OutputType } from './api'
import { ChannelFormat } from 'timeline-state-resolver'

/*
	This file contains the default configuration that is used to create the initial config files.
*/

interface CutoutFile {
	note: string
	cutouts: Cutouts
}
interface OutputsFile {
	note: string
	outputs: Outputs
}
interface SettingsFile {
	// note: string,
	settings: Settings
}
interface SourcesFile {
	// note: string,
	sources: Sources
}
export const defaultCutouts: CutoutFile = {
	note:
		'This file is not intended to be manually edited, it will update when the user makes changes in the UI',
	cutouts: {
		cutoutA: {
			width: 1080,
			height: 1080,
			outputRotation: 0,
			source: 'sourceA',
			x: 0,
			y: 0
		},
		cutoutB: {
			width: 1080,
			height: 1080,
			outputRotation: 0,
			source: 'sourceB',
			x: 0,
			y: 0
		}
	}
}
export const defaultOutputs: OutputsFile = {
	note:
		'This file is not intended to be manually edited, it will update when the user makes changes in the UI',
	outputs: [
		{
			type: OutputType.CUTOUT,
			casparChannel: 1,
			width: 1280,
			height: 720,
			cutout: {
				cutoutId: null,
				x: 0,
				y: 0,
				scale: 0
			}
		}
	]
}
export const defaultSettings: SettingsFile = {
	// note: 'This file is not intended to be manually edited, it will update when the user makes changes in the UI',
	settings: {
		useImageProviderForRoutes: true,
		channelForRoutes: 1,
		channelForRoutesStartLayer: 900,

		casparCG: {
			hostname: '127.0.0.1',
			port: 5250
		},
		imageProvider: {
			hostname: '127.0.0.1',
			port: 5255,
			protocol: 'http'
		},

		ui: {
			inputJitterCutoff: 2
		}
	}
}
export const defaultSources: SourcesFile = {
	// note: 'This file is not intended to be manually edited, it will update when the user makes changes in the UI',
	sources: {
		sourceA: {
			title: 'Media AMB',
			width: 1920,
			height: 1080,
			rotation: 0,
			input: {
				type: SourceInputType.MEDIA,
				file: 'AMB',
				loop: true
			}
		},
		sourceB: {
			title: 'Decklink input 1',
			width: 1920,
			height: 1080,
			rotation: 0,
			input: {
				type: SourceInputType.DECKLINK,
				device: 1,
				format: ChannelFormat.HD_1080I5000
			}
		}
	}
}
