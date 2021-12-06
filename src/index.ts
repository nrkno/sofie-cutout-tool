import redio, { isValue, Valve } from 'redioactive'

import { provideFrame as provideSDIFrame, sdiFrameToFFmpegFrame } from './sdiProducer'
import { analyseFrames, cropAndBuffer, MAX_FRAMES } from './reframer'
import { ffmpegFrameToNDI, frameConsumer } from './ndiConsumer'
import { ndiFrameToFFmpegFrame, provideFrame as provideNDIFrame } from './ndiProducer'
import { audioFork } from './sdiProducer'
import { bmdAudioToNDI } from './ndiConsumer'
import { audioConsumer } from './ndiConsumer'

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

const provider = redio(provideSDIFrame)

provider
    .fork()
    .valve(audioFork)
    .valve(bmdAudioToNDI)
    .spout(audioConsumer)

provider
    .fork()
	.valve(sdiFrameToFFmpegFrame, { bufferSizeMax: 1 })
// redio(provideNDIFrame)
// 	.valve(ndiFrameToFFmpegFrame)
	.valve(pairFrames, { bufferSizeMax: 0 })
	.valve(analyseFrames, { bufferSizeMax: 2 * 5 })
	.valve(cropAndBuffer, { oneToMany: true, bufferSizeMax: 1 })
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
	.spout(frameConsumer, { bufferSizeMax: 1 })
