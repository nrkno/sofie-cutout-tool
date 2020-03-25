import { ChannelFormat, Mixer } from 'timeline-state-resolver'

export interface FullConfig {
	cutouts: Cutouts
	outputs: Outputs
	sources: Sources
	settings: Settings
}
export interface FullConfigClient extends FullConfig {
	sourceReferenceLayers: {
		[sourceId: string]: {
			contentId: string
		}
	}
}

export interface Sources {
	[sourceId: string]: Source
}
/**
 * The Source describes what's coming in
 */
export interface Source {
	/** Title/Name, to be used in GUI  */
	title: string

	/** Rotation, in degrees. For example, if source input has been rotated CW, this should be set to 90 */
	rotation: number

	/** Width, in px, oriented as "after having fixed the rotation" */
	width: number
	/** Height, in px, oriented as "after having fixed the rotation" */
	height: number

	/** Input properites, used in Caspar */
	input: SourceInputAny
}

export type SourceInputAny = SourceInputDecklink | SourceInputMedia | SourceInputHtmlPage
export interface SourceInputBase {
	type: SourceInputType
}
export enum SourceInputType {
	DECKLINK = 'decklink',
	MEDIA = 'media',
	HTML_PAGE = 'html_page'
}
export interface SourceInputDecklink extends SourceInputBase {
	type: SourceInputType.DECKLINK
	format: ChannelFormat
	filter?: string
	device: number
}
export interface SourceInputMedia extends SourceInputBase {
	type: SourceInputType.MEDIA
	file: string
	loop?: boolean
}
export interface SourceInputHtmlPage extends SourceInputBase {
	type: SourceInputType.HTML_PAGE
	url: string
}

export interface Cutouts {
	[cutoutId: string]: Cutout
}
export interface Cutout {
	source: string
	/** Cutout position, (relative to the Source coordinate-space) */
	x: number
	/** Cutout position, (relative to the Source coordinate-space) */
	y: number
	/** Cutout width, (relative to the Source coordinate-space) */
	width: number
	/** Cutout height, (relative to the Source coordinate-space) */
	height: number
	/** Scaling of cutout in output */
	scale?: number

	/** How the Cutout will be oriented in the output */
	outputRotation: number

	/** If true, enables audio follow video on this cutout */
	audioFollowVideo?: boolean
	/** If true, keep the sound on for this cutout */
	audioAlwaysOn?: boolean
	/** If set, sets the volume for this cutout (1 = 100% = 0dB). Defaults to 1 */
	audioVolume?: number
}

export interface CutoutInOutput {
	cutoutId?: string
	/** Position of cutout in Output, in screen coordinates */
	x: number
	/** Position of cutout in Output, in screen coordinates */
	y: number
	/** Scaling of cutout in output. Omit to automatically scale to fill */
	scale: number
}
export type Outputs = OutputAny[]

export type OutputAny = OutputCutout | OutputMultiview | OutputChannelRoute
export interface OutputBase {
	type: OutputType
	casparChannel: number
	/** Width of the CasparCG Channel */
	width: number
	/** Height of the CasparCG Channel */
	height: number
}
export enum OutputType {
	CUTOUT = 'cutout',
	MULTIVIEW = 'multiview',
	CHANNEL_ROUTE = 'channel_route'
}
export interface OutputCutout extends OutputBase {
	type: OutputType.CUTOUT
	cutout: CutoutInOutput
	options?: {
		routeAllCutouts?: boolean
		audio?: {
			/** Needs to be true for Cutout tool to handle any audio. Set to false if audio is handled by Sisyfos */
			enable?: boolean
		}
	}
}
export interface OutputMultiview extends OutputBase {
	type: OutputType.MULTIVIEW
	cutouts: CutoutInOutput[]

	/** Background to put behind the multiview */
	background?: string

	options?: {}
}
export interface OutputChannelRoute extends OutputBase {
	type: OutputType.CHANNEL_ROUTE
	casparChannel: number
	routeFromChannel: number
	options?: {
		mixer?: Mixer
	}
}

export interface Settings {
	useImageProviderForRoutes?: boolean

	/** The channel to use for putting inputs on (and route the content from there) */
	channelForRoutes: number
	/** What layer to start on */
	channelForRoutesStartLayer: number

	casparCG: NetworkResource
	imageProvider: NetworkResource

	ui: {
		inputJitterCutoff: number
	}
}

export interface NetworkResource {
	hostname: string
	port: number
	protocol?: string
}
