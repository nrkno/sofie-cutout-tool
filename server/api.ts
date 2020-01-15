import { ChannelFormat } from 'timeline-state-resolver';

export interface FullConfig {
	cutouts: Cutouts;
	outputs: Outputs;
	sources: Sources;
}
export interface FullConfigClient extends FullConfig {
	sourceReferenceLayers: {
		[sourceId: string]: {
			channel: number;
			layer: number;
		};
	};
}

export interface Sources {
	[sourceId: string]: Source;
}
/**
 * The Source describes what's coming in
 */
export interface Source {
	/** Title/Name, to be used in GUI  */
	title: string;

	/** Rotation, in degrees. For example, if source input has been rotated CW, this should be set to 90 */
	rotation: number;

	/** Width, in px, oriented as "after having fixed the rotation" */
	width: number;
	/** Height, in px, oriented as "after having fixed the rotation" */
	height: number;

	/** Input properites, used in Caspar */
	input: SourceInputAny;
}

export type SourceInputAny = SourceInputDecklink | SourceInputMedia | SourceInputHtmlPage;
export interface SourceInputBase {
	type: SourceInputType;
}
export enum SourceInputType {
	DECKLINK = 'decklink',
	MEDIA = 'media',
	HTML_PAGE = 'html_page'
}
export interface SourceInputDecklink extends SourceInputBase {
	type: SourceInputType.DECKLINK;
	format: ChannelFormat;
	device: number;
}
export interface SourceInputMedia extends SourceInputBase {
	type: SourceInputType.MEDIA;
	file: string;
}
export interface SourceInputHtmlPage extends SourceInputBase {
	type: SourceInputType.HTML_PAGE;
	url: string;
}

export interface Cutouts {
	[cutoutId: string]: Cutout;
}
export interface Cutout {
	source: string;
	/** Cutout position, (relative to the Source coordinate-space) */
	x: number;
	/** Cutout position, (relative to the Source coordinate-space) */
	y: number;
	/** Cutout width, (relative to the Source coordinate-space) */
	width: number;
	/** Cutout height, (relative to the Source coordinate-space) */
	height: number;
	/** Scaling of cutout in output */
	scale?: number;

	/** How the Cutout will be oriented in the output */
	outputRotation: number;
}

export interface CutoutInOutput {
	cutoutId: string;
	/** Position of cutout in Output, in screen coordinates */
	x: number;
	/** Position of cutout in Output, in screen coordinates */
	y: number;
	/** Scaling of cutout in output. Omit to automatically scale to fill */
	scale: number;
}
export type Outputs = OutputAny[];

export type OutputAny = OutputCutout | OutputMultiview;
export interface OutputBase {
	type: OutputType;
	casparChannel: number;
	/** Width of the CasparCG Channel */
	width: number;
	/** Height of the CasparCG Channel */
	height: number;
}
export enum OutputType {
	CUTOUT = 'cutout',
	MULTIVIEW = 'multiview'
}
export interface OutputCutout extends OutputBase {
	type: OutputType.CUTOUT;
	cutout: CutoutInOutput;
}
export interface OutputMultiview extends OutputBase {
	type: OutputType.MULTIVIEW;
	cutouts: CutoutInOutput[];

	/** Background to put behind the multiview */
	background?: string;
}
