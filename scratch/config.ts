import {
    Sources,
    SourceInputType,
    Cutouts,
    Outputs,
    OutputType,
    Settings
} from '../server/api'

const sources: Sources = {
    'caspar': {
        title: 'Source A',
        width: 1280,
        height: 720,
        rotation: 0,
        input: {
            type: SourceInputType.MEDIA,
            file: 'amb'
        }
    },
    'head': {
        title: 'Source B',
        width: 1280,
        height: 720,
        rotation: 90,
        input: {
            type: SourceInputType.MEDIA,
            file: 'go1080p25'
        }
    }
}

const cutouts: Cutouts = {
    'casparfull': {
        source: 'caspar',
        x: 0,
        y: 0,
        width: 1280,
        height: 720,
        outputRotation: 0,
    },
    'casparzoom': {
        source: 'caspar',
        x: 250,
        y: 150,
        width: 720,
        height: 405,
        outputRotation: 0,
    },
    'head': {
        source: 'head',
        x: 0,
        y: 0,
        width: 1280,
        height: 720,
        outputRotation: 90,
    },
    'headsquare': {
        source: 'head',
        x: 0,
        y: 0,
        width: 1280,
        height: 720,
        outputRotation: 0,
    }
}

const outputs: Outputs = [
    {
        type: OutputType.CUTOUT,
        casparChannel: 0,
        width: 1280,
        height: 720,
        cutout: {
            cutoutId: 'head',
            x: 0,
            y: 0,
            scale: 1
        }
    },
    {
        type: OutputType.MULTIVIEW,
        cutouts: [
            {
                cutoutId: 'casparfull',
                x: -400,
                y: -200,
                scale: 0.25
            },
            {
                cutoutId: 'casparzoom',
                x: 0,
                y: -200,
                scale: 0.25
            },
            {
                cutoutId: 'head',
                x: -400,
                y: 100,
                scale: 0.25
            },
            {
                cutoutId: 'headsquare',
                x: 0,
                y: 100,
                scale: 0.25
            }
        ],
        casparChannel: 2,
        width: 1280,
        height: 720
    }
]
const settings: Settings = {
    channelForRoutes: 1,
    channelForRoutesStartLayer: 900,
    casparCGHost: '127.0.0.1'
}
