import * as Beamcoder from 'beamcoder'
import * as Grandiose from 'grandiose'
import * as Macadam from 'macadam'
import { Valve, isValue, Spout, isEnd } from 'redioactive'
import { cropFrame, override } from './reframer'
import { endTrace, startTrace } from './trace'

const sender = Grandiose.send({ name: 'REFRAME' })

const filter2 = Beamcoder.filterer({
    filterType: 'video',
    inputParams: [
        {
            width: 1920,
            height: 1080,
            pixelFormat: 'bgra',
            timeBase: [25, 1],
            pixelAspect: [1, 1],
        },
    ],
    outputParams: [
        {
            pixelFormat: 'bgra',
        },
    ],
    // filterSpec: `crop=w=1080:h=1080:x=420:y=0`,
    filterSpec: `crop=w=1080:h=1080:x=420:y=0,scale=1080:-1,pad=1080:1080:0:(oh-ih)/2:eval=frame:color=#00000000`,
    // filterSpec: `crop=w=1080:h=1080:x=420:y=0:out_w=1080,drawtext=text='x ? k ${controller.k_p} i ${controller.k_i} d ${controller.k_d}':fontcolor=white:fontsize=24:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=h-th`,
})
const enc2 = Beamcoder.encoder({
    name: 'rawvideo',
    width: 1080,
    height: 1080,
    pix_fmt: 'bgra',
    time_base: [1, 1],
})

export const ffmpegFrameToNDI: Valve<
    { cropped: Beamcoder.Frame; cropValues: { x: number; w: number }; orig: Beamcoder.Frame } | undefined,
    Grandiose.VideoFrame | undefined
> = async (frame) => {
    if (isValue(frame) && frame !== undefined) {
        let newFrame: Beamcoder.Frame | undefined
        if (override.x ?? override.w ?? false) {
            newFrame = await cropFrame(
                frame.orig,
                {
                    x: override.x ?? frame.cropValues.x ?? 420,
                    w: override.w ?? frame.cropValues.w ?? 1080,
                },
                await filter2,
                enc2
            )
        }
        const ndiFrame: Grandiose.VideoFrame = {
            type: 'video',
            xres: 1080,
            yres: 1080,
            frameRateN: 25,
            frameRateD: 1,
            pictureAspectRatio: 1,
            timestamp: [0, 0],
            fourCC: 1096178005,
            frameFormatType: 1,
            timecode: [0, 0],
            lineStrideBytes: 1080 * 2,
            data: Buffer.alloc(frame.cropped.data[0].length),
        }
        if (newFrame && newFrame.width === 1080) {
            // console.log(newFrame.width, newFrame.height)
            newFrame.data[0].copy(ndiFrame.data)
        } else {
            frame.cropped.data[0].copy(ndiFrame.data)
        }

        return ndiFrame
    } else {
        return frame
    }
}

export const frameConsumer: Spout<Grandiose.VideoFrame | undefined> = async (frame) => {
    // const wait = new Promise<void>((resolve) => setTimeout(() => resolve(), 40))
    let t = startTrace('NDI transmit')

    const w = 1080
    // const w = 1920
    const sendFrame: Grandiose.VideoFrame = {
        type: 'video',
        xres: w,
        yres: 1080,
        frameRateN: 25,
        frameRateD: 1,
        pictureAspectRatio: 0,
        timestamp: [0, 0],
        frameFormatType: Grandiose.FrameType.Progressive,
        timecode: [0, 0],
        lineStrideBytes: w * 4,
        data: Buffer.alloc(w * 1080 * 4),
        fourCC: Grandiose.FourCC.BGRA,
    }

    // console.log(frame === undefined)
    if (!isEnd(frame) && frame !== undefined) {
        frame.data.copy(sendFrame.data)
        sendFrame.data = frame.data
    } else {
        console.log('send black')
        sendFrame.data.fill(0)
    }

    await (await sender).video(sendFrame)
    endTrace(t)
    // console.log('send')
    // await wait
}

export const bmdAudioToNDI: Valve<Macadam.CaptureFrame['audio'], Grandiose.AudioFrame> = (frame) => {
    if (isValue(frame)) {
        const sendFrame: Grandiose.AudioFrame = {
            type: 'audio',
            audioFormat: Grandiose.AudioFormat.Int16Interleaved,
            referenceLevel: 0,
            sampleRate: 48000, // Hz
            channels: 2,
            samples: 48000 / 25,
            channelStrideInBytes: 4,
            timestamp: [0, 0], // PTP timestamp
            timecode: [0, 0], // timecode as PTP value
            data: Buffer.alloc(48000 / 25 * 4)
        }
        frame.data.copy(sendFrame.data)

        return sendFrame
    } else {
        return frame
    }
}

export const audioConsumer: Spout<Grandiose.AudioFrame | undefined> = async (frame) => {
    const sendFrame: Grandiose.AudioFrame = {
        type: 'audio',
        audioFormat: Grandiose.AudioFormat.Int16Interleaved,
        referenceLevel: 0,
        sampleRate: 48000, // Hz
        channels: 2,
        samples: 48000 / 25,
        channelStrideInBytes: 4,
        timestamp: [0, 0], // PTP timestamp
        timecode: [0, 0], // timecode as PTP value
        data: Buffer.alloc(48000 / 25 * 4)
    }

    if (!isEnd(frame) && frame !== undefined) {
        frame.data.copy(sendFrame.data)
        sendFrame.data = frame.data
    } else {
        console.log('send black')
        sendFrame.data.fill(0)
    }

    await (await sender).video(sendFrame as any)
}
