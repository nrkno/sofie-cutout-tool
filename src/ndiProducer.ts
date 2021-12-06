import Beamcoder = require('beamcoder')
import * as Grandiose from 'grandiose'
import { end, Generator, isValue, Valve } from 'redioactive'

let receiver: Grandiose.Receiver

async function getReceiver () {
    if (!receiver) {
        const sources: { name: string; urlAddress: any }[] = await (Grandiose as any).find()
        // const found = sources.find((s) => s.name.match(/monitor 1/i))
        // const found = sources.find((s) => s.name.match(/ccg1/i))
        const found = sources.find((s) => s.name.match(/OBS/i))
        if (!found) throw new Error('Could not find NDI source for CCG1')
        receiver = await Grandiose.receive({ source: found, colorFormat: Grandiose.ColorFormat.BGRX_BGRA })
    }

    return receiver
}

export const provideFrame: Generator<Grandiose.VideoFrame> = async () => {
    const frame = await (await getReceiver()).video()
    // console.log(frame.fourCC)
    return frame
}

export const ndiFrameToFFmpegFrame: Valve<Grandiose.VideoFrame, Beamcoder.Frame> = (frame) => {
    if (isValue(frame)) {
        const data = Buffer.alloc(frame.lineStrideBytes * frame.yres)
        frame.data.copy(data)
        const beamFrame = Beamcoder.frame({
            linesize: [frame.lineStrideBytes],
            width: frame.xres,
            height: frame.yres,
            sampleAspectRatio: [1, 1],
            data: [data],
            format: 'bgra',
        })
        // console.log(JSON.stringify(beamFrame, undefined, 2))
        // console.log(beamFrame.format)
        return beamFrame
    } else {
        return end
    }
}