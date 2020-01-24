import {
	ChannelFormat,
	DeviceType,
	Mixer,
	TSRTimelineObj,
	TimelineContentTypeCasparCg,
	TimelineObjCCGHTMLPage,
	TimelineObjCCGInput,
	TimelineObjCCGMedia,
	TimelineObjCCGRoute
} from 'timeline-state-resolver';
import { SourceInputAny, SourceInputType } from './api';

import { DecklinkInputRefs } from './TSRController';

export class CasparReferrer {
	decklingInputRefs: DecklinkInputRefs = {};
	reset(): void {
		this.decklingInputRefs = {};
	}
	getSourceRef(input: SourceInputAny): string {
		if (input.type === SourceInputType.MEDIA) {
			return this.mediaRef(input.file);
		} else if (input.type === SourceInputType.DECKLINK) {
			return this.inputRef('decklink', input.device, input.format);
		} else if (input.type === SourceInputType.HTML_PAGE) {
			return this.htmlPageRef(input.url);
		} else {
			const { type } = input;
			throw new Error(`Unknown input.type "${type}"`);
		}
	}
	getSource(input: SourceInputAny, layer: string, mixer: Mixer): TSRTimelineObj {
		if (input.type === SourceInputType.MEDIA) {
			return this.media(layer, input.file, mixer);
		} else if (input.type === SourceInputType.DECKLINK) {
			return this.input(layer, 'decklink', input.device, input.format, mixer);
		} else if (input.type === SourceInputType.HTML_PAGE) {
			return this.htmlPage(layer, input.url, mixer);
		} else {
			const { type } = input;
			throw new Error(`Unknown input.type "${type}"`);
		}
	}
	mediaRef(file: string): string {
		return 'media_' + file;
	}
	media(layer: string, file: string, mixer?: Mixer): TimelineObjCCGMedia | TimelineObjCCGRoute {
		const refId = this.mediaRef(file);
		const ref = this.getRef(refId, layer, mixer);
		if (ref) return ref;
		const o: TimelineObjCCGMedia = {
			id: '',
			layer: layer,
			enable: { while: 1 },
			content: {
				deviceType: DeviceType.CASPARCG,
				type: TimelineContentTypeCasparCg.MEDIA,
				file: file,
				loop: true,
				mixer: mixer
			}
		};
		this.setRef(refId, layer);
		return o;
	}
	inputRef(inputType: string, device: number, deviceFormat: ChannelFormat): string {
		return 'input_' + inputType + '_' + device + '_' + deviceFormat;
	}
	input(
		layer: string,
		inputType: string,
		device: number,
		deviceFormat: ChannelFormat,
		mixer?: Mixer
	): TimelineObjCCGInput | TimelineObjCCGRoute {
		const refId = this.inputRef(inputType, device, deviceFormat);
		const ref = this.getRef(refId, layer, mixer);
		if (ref) return ref;
		const o: TimelineObjCCGInput = {
			id: '',
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
		};
		this.setRef(refId, layer);
		return o;
	}
	htmlPageRef(url: string): string {
		return 'htmlpage_' + url;
	}
	htmlPage(
		layer: string,
		url: string,
		mixer?: Mixer
	): TimelineObjCCGHTMLPage | TimelineObjCCGRoute {
		const refId = this.htmlPageRef(url);
		const ref = this.getRef(refId, layer, mixer);
		if (ref) return ref;
		const o: TimelineObjCCGHTMLPage = {
			id: '',
			layer: layer,
			enable: { while: 1 },
			content: {
				deviceType: DeviceType.CASPARCG,
				type: TimelineContentTypeCasparCg.HTMLPAGE,
				url: url,
				mixer: mixer
			}
		};
		this.setRef(refId, layer);
		return o;
	}
	getRef(refId: string, layer: string, mixer?: Mixer): TimelineObjCCGRoute | undefined {
		const ref = this.decklingInputRefs[refId];
		if (ref) {
			return {
				id: '',
				layer: layer,
				enable: { while: 1 },
				content: {
					deviceType: DeviceType.CASPARCG,
					type: TimelineContentTypeCasparCg.ROUTE,
					mappedLayer: ref,
					mixer: mixer
				}
			};
		}
	}
	private setRef(refId, layer): void {
		this.decklingInputRefs[refId] = layer;
	}
}
