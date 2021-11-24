import redio, { isValue, Valve } from 'redioactive'

import { provideFrame as provideSDIFrame, sdiFrameToFFmpegFrame } from './sdiProducer'
import { analyseFrames, cropAndBuffer, MAX_FRAMES } from './reframer'
import { ffmpegFrameToNDI, frameConsumer } from './ndiConsumer'

let lastFrame: Beamcoder.Frame
const pairFrames: Valve<Beamcoder.Frame, Beamcoder.Frame[]> = async (frame) => {
	if (isValue(frame)) {
		let frames = []
		if (lastFrame) frames.push(lastFrame)
		frames.push(frame)
		lastFrame = frame
		return frames
	} else {
		return frame
	}
}

redio(provideSDIFrame)
	.valve(sdiFrameToFFmpegFrame)
	.valve(pairFrames)
	.valve(analyseFrames, { bufferSizeMax: 2 * 5 })
	.valve(cropAndBuffer, { oneToMany: true })
	// .valve((res) => {
    //     return {
    //         cropped: res.frame,
    //         cropValues: {
    //             x: 0,
    //             w: 1920,
    //         },
    //         orig: res.frame,
    //     }
    // })
	.valve(ffmpegFrameToNDI, { bufferSizeMax: 2 * MAX_FRAMES })
	.spout(frameConsumer)
