import { bmdAudioSampleRate48kHz, bmdAudioSampleType32bitInteger, bmdFormat8BitYUV, bmdModeHD1080i50, capture, CaptureFrame } from 'macadam'
import { Valve, isValue, end, Generator } from 'redioactive'
import * as Beamcoder from 'beamcoder'
import { filterer } from 'beamcoder'

// capture on decklink 1
const captureChannel = capture({
    deviceIndex: 0,
    channels: 2,
    sampleRate: bmdAudioSampleRate48kHz,
    sampleType: bmdAudioSampleType32bitInteger,
    displayMode: bmdModeHD1080i50,
    pixelFormat: bmdFormat8BitYUV
})

export const provideFrame: Generator<CaptureFrame> = async () => {
    const frame = await (await captureChannel).frame()

    if (frame.video.width !== 1920 || frame.video.height !== 1080) {
        throw new Error('Unexpected capture frame size')
    }

    return frame
}

const vidFilterer = filterer({
    filterType: 'video',
    inputParams: [
        {
            timeBase: [1,1000],
            width: 1920,
            height: 1080,
            pixelFormat: 'uyvy422',
            pixelAspect: [1,1]
        }
    ],
    outputParams: [
        {
            pixelFormat: 'bgra'
        }
    ],
    filterSpec: `fps=25`
})

export const sdiFrameToFFmpegFrame: Valve<CaptureFrame, Beamcoder.Frame> = async (frame) => {
    if (isValue(frame)) {
        const data = Buffer.alloc(frame.video.rowBytes * frame.video.height)
        frame.video.data.copy(data)

        const beamFrame = Beamcoder.frame({
            linesize: [frame.video.rowBytes],
            width: frame.video.width,
            height: frame.video.height,
            sampleAspectRatio: [1, 1],
            data: [data],
            format: 'uyvy422',
            // pts: frameNo++ * 1000,
            pts: frame.video.frameTime,
            // interlaced_frame: true,
            // top_field_first: true,
        })
        
        const filtered = await (await vidFilterer).filter([beamFrame])
        const filteredFrame = filtered[0].frames[0]
        if (!filteredFrame) {
            console.log('skip')
            return Beamcoder.frame({
                linesize: [frame.video.rowBytes],
                width: frame.video.width,
                height: frame.video.height,
                sampleAspectRatio: [1, 1],
                data: [Buffer.alloc(1920 * 1080 * 4).fill(0x00)],
                format: 'bgra',
            })
        }

        return filteredFrame
    } else {
        return end
    }
}
