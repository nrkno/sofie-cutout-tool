import redio, { Generator, Spout, Valve, isEnd, isValue, end } from 'redioactive'
import * as Grandiose from 'grandiose'
import * as Beamcoder from 'beamcoder'
import { analyse, AnalyseResult, AnalysisResultClass } from './analyse'
import { OSCServer, OSCType } from 'ts-osc'

const MAX_FRAMES = 6 // 2 secs at 25fps

interface AnalysisResult {
	frame: Beamcoder.Frame
	analysis?: Analysis
}
interface Analysis {
	sceneChange: boolean
	machineVision: AnalyseResult
}

async function main() {
	const sources: { name: string; urlAddress: any }[] = await (Grandiose as any).find()
	// const found = sources.find((s) => s.name.match(/monitor 1/i))
	// const found = sources.find((s) => s.name.match(/ccg1/i))
	const found = sources.find((s) => s.name.match(/OBS/i))
	console.log(sources)
	if (!found) throw new Error('Could not find NDI source for CCG1')
	const receiver = await Grandiose.receive({ source: found, colorFormat: Grandiose.ColorFormat.BGRX_BGRA })
	const sender = await Grandiose.send({ name: 'REFRAME' })
	console.log(sender)
	const oscServer = new OSCServer('0.0.0.0', 10024)
	const override = {
		x: undefined as number | undefined,
		w: undefined as number | undefined,
	}

	oscServer.on('error', console.error)
	oscServer.on('listening', () => console.log(`OSC listening on port 10024`))
	oscServer.on('message', (oscMessage) => {
		const control = oscMessage.address
		const type = oscMessage.type
		const value = oscMessage.value
		console.log(`OSC message: '${control}' type: ${type} value: ${value}`)

		if (type !== OSCType.Float && type !== OSCType.Integer && type !== OSCType.String) return

		if (control === '/oscControl/slider1') {
			// controller.k_p = parseFloat(value as string)
			// console.log('controller.k_p', controller.k_p)
			override.x = parseFloat(value as string) * (1920 - 1080)
			// controller.reset()
		} else if (control === '/oscControl/slider2') {
			override.w = 1080 + parseFloat(value as string) * (1920 - 1080)
			// controller.k_i = parseFloat(value as string)
			// console.log('controller.k_i', controller.k_i)
			// controller.reset()
		} else if (control === '/oscControl/slider3') {
			// controller.reset()
		} else if (control === '/oscControl/slider4') {
			// controller.k_p = parseFloat(value)
		}
		// console.log(gain)
	})
	oscServer.on('close', oscServer.close)

	let frameNo = 0
	const detectFilter = await Beamcoder.filterer({
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
				pixelFormat: 'rgb',
			},
		],
		filterSpec: 'scdet=t=100,format=pix_fmts=rgb24',
	})
	console.log(detectFilter)

	let inCount = 0
	let inT = Date.now()
	const frameGenerator: Generator<Grandiose.VideoFrame> = async () => {
		inCount++
		if (inCount % 250 === 0) {
			console.log('avg input time is ' + (Date.now() - inT) / 250)
			inT = Date.now()
		}
		const frame = await receiver.video()
		// console.log(frame.fourCC)
		return frame
	}
	const ndiFrameToFFmpegFrame: Valve<Grandiose.VideoFrame, Beamcoder.Frame> = (frame) => {
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
	const analyseFrames: Valve<Beamcoder.Frame[], AnalysisResult> = async (frames) => {
		if (isValue(frames)) {
			// console.log(frames.length)
			let filt_frames = await detectFilter.filter(frames)
			const result: AnalysisResult = {
				frame: frames[1] || frames[0],
			}

			if (filt_frames[0].frames[1]) {
				const f = filt_frames[0].frames[1]
				const analysis = {} as Exclude<AnalysisResult['analysis'], undefined>

				const score = f.metadata['lavfi.scd.score'] && parseFloat(f.metadata['lavfi.scd.score'])
				if (score && score > 14) {
					analysis.sceneChange = true
					frameNo = 0 // force new detection sequence
				}

				if (frameNo % 5 === 0) {
					try {
						// const { x, w } = { x: 420, w: 0 }
						// await new Promise<void>((r) => setTimeout(() => r(), 180))
						const regions = await analyse(f.data[0].slice(0, 1920 * 1080 * 3))
						// console.log(x, f.pts / vidStream.time_base[1])
						analysis.machineVision = regions
					} catch (e) {
						console.log('detection failed', e)
						frameNo -= 1 // retry next frame
					}
				}

				result.analysis = analysis
				frameNo++
			}

			return result
		} else {
			return frames
		}
	}
	const filter2 = await Beamcoder.filterer({
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
	const frameBuffer: Beamcoder.Frame[] = []
	const ffmpegFrameToNDI: Valve<
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
					filter2,
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
	let count = 0
	let t = Date.now()
	const frameConsumer: Spout<Grandiose.VideoFrame | undefined> = async (frame) => {
		count++
		if (count % 250 === 0) {
			console.log('avg frametime is ' + (Date.now() - t) / 250)
			t = Date.now()
		}
		const wait = new Promise<void>((resolve) => setTimeout(() => resolve(), 40))

		const w = 1080
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

		await sender.video(sendFrame)
		await wait
	}

	const encoder = Beamcoder.encoder({
		name: 'rawvideo',
		width: 1080,
		height: 1080,
		pix_fmt: 'bgra',
		time_base: [1, 1],
	})
	// create cropping filter
	const filter = await Beamcoder.filterer({
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
	const maxDdx = 2 // max acceleration
	const maxNegDdx = 3 // max deceleration
	const getMaxAccel = (
		target: number,
		accelObj: { x?: number; dx?: number },
		debug = false
	): { x: number; dx?: number } => {
		if (Number.isNaN(target)) console.log('x is nan')
		if (accelObj.x === undefined) {
			// console.log(accelObj)
			return {
				x: target,
			}
		} else if (accelObj.dx === undefined || target === accelObj.x) {
			// console.log(target, accelObj)
			return {
				x: target,
				dx: target - accelObj.x,
			}
		}
		// console.log(accelObj)

		const direction = Math.abs(target - accelObj.x) / (target - accelObj.x) // 1 or -1
		const attemptedDx = Math.abs(target - accelObj.x) // amount of movement between frames
		const attemptedDeltaDx = attemptedDx - accelObj.dx // change in speed
		let allowedDx = accelObj.dx + Math.min(0 + maxDdx, Math.max(0 - maxNegDdx, attemptedDeltaDx))
		let dx = direction * allowedDx

		if (debug) console.log(direction, attemptedDx, attemptedDeltaDx, allowedDx)

		const stepsToStop = allowedDx / maxNegDdx
		const stepsLeft = attemptedDx / allowedDx // assuming no further acceleration
		if (allowedDx >= 0 && stepsToStop > stepsLeft && accelObj.x + dx !== target) {
			// implies an overshoot is imminent so start to slow down
			// console.log('slow down', stepsLeft, stepsToStop, dx, accelObj.x + direction * (accelObj.dx - maxNegDdx))
			allowedDx = accelObj.dx - maxNegDdx
			dx = direction * allowedDx
		} else {
			// console.log('speed up', dx, accelObj.x + dx)
		}

		return {
			x: accelObj.x + dx,
			dx: allowedDx,
		}
	}
	let lastAccelX: { x?: number; dx?: number } = {}
	let lastAccelW: { x?: number; dx?: number } = {}
	let current: undefined | [number, number]
	const cropFrameFromAnalysis = async (
		frame: Beamcoder.Frame,
		detectionPoints: Analysis[]
	): Promise<{ frame: Beamcoder.Frame; dims: { x: number; w: number } } | undefined> => {
		let x = 420
		let w = 1080

		const classesCount: Record<AnalysisResultClass, number> = {
			[AnalysisResultClass.Face]: 0,
			[AnalysisResultClass.PartialFace]: 0,
			[AnalysisResultClass.Person]: 0,
			[AnalysisResultClass.Animal]: 0,
			[AnalysisResultClass.Transport]: 0,
			[AnalysisResultClass.Object]: 0,
		}
		const detections = detectionPoints.filter((p) => p.machineVision !== undefined).map((p) => p.machineVision)

		for (const det of detections) {
			classesCount[AnalysisResultClass.Face] = Math.max(
				classesCount[AnalysisResultClass.Face],
				det.classesCount[AnalysisResultClass.Face]
			)
			classesCount[AnalysisResultClass.PartialFace] = Math.max(
				classesCount[AnalysisResultClass.PartialFace],
				det.classesCount[AnalysisResultClass.PartialFace]
			)
			classesCount[AnalysisResultClass.Person] = Math.max(
				classesCount[AnalysisResultClass.Person],
				det.classesCount[AnalysisResultClass.Person]
			)
			classesCount[AnalysisResultClass.Animal] = Math.max(
				classesCount[AnalysisResultClass.Animal],
				det.classesCount[AnalysisResultClass.Animal]
			)
			classesCount[AnalysisResultClass.Transport] = Math.max(
				classesCount[AnalysisResultClass.Transport],
				det.classesCount[AnalysisResultClass.Transport]
			)
			classesCount[AnalysisResultClass.Object] = Math.max(
				classesCount[AnalysisResultClass.Object],
				det.classesCount[AnalysisResultClass.Object]
			)
		}
		const containsAnyHumans =
			classesCount[AnalysisResultClass.Face] > 0 ||
			classesCount[AnalysisResultClass.PartialFace] > 0 ||
			classesCount[AnalysisResultClass.Person] > 0

		const includedClasses = new Set([
			AnalysisResultClass.Face,
			AnalysisResultClass.PartialFace,
			AnalysisResultClass.Person,
			AnalysisResultClass.Animal,
			AnalysisResultClass.Transport,
			AnalysisResultClass.Object,
		])
		if (classesCount[AnalysisResultClass.Face] + classesCount[AnalysisResultClass.PartialFace] === 1) {
			// model is optimised for close ups of faces so always assume this is in focus
			includedClasses.clear()
			includedClasses.add(AnalysisResultClass.Face)
			includedClasses.add(AnalysisResultClass.PartialFace)
		} else if (
			classesCount[AnalysisResultClass.Face] >= 1 &&
			classesCount[AnalysisResultClass.Person] > classesCount[AnalysisResultClass.Face]
		) {
			// these extra people are probably in the background
			includedClasses.clear()
			includedClasses.add(AnalysisResultClass.Face)
		} else if (
			classesCount[AnalysisResultClass.Face] > 0 ||
			classesCount[AnalysisResultClass.PartialFace] > 0 ||
			classesCount[AnalysisResultClass.Person] > 0
		) {
			includedClasses.delete(AnalysisResultClass.Animal)
			includedClasses.delete(AnalysisResultClass.Transport)
			includedClasses.delete(AnalysisResultClass.Object)
		} else if (classesCount[AnalysisResultClass.Animal] > 0 || classesCount[AnalysisResultClass.Transport] > 0) {
			includedClasses.delete(AnalysisResultClass.Object)
		}

		const minMax = detections
			.map((p) => p.regions.filter((r) => includedClasses.has(r.class)))
			.flatMap((p) => p.map((r) => [r.topLeft[0] || 960, r.bottomRight[0] || 960]))
			.reduce((a, b) => [Math.min(a[0], b[0]), Math.max(a[1], b[1])], [960, 960])

		// console.log(classesCount)

		if (minMax[1] - minMax[0] > 1080) {
			if (containsAnyHumans) {
				// see if this is also true for recent values
				const recentMinMax = detections
					.slice(-5 * 4, 5 * 2) // last 2 seconds (or future if not enough available)
					.map((p) => p.regions.filter((r) => includedClasses.has(r.class)))
					.flatMap((p) => p.map((r) => [r.topLeft[0] || 960, r.bottomRight[0] || 960]))
					.reduce((a, b) => [Math.min(a[0], b[0]), Math.max(a[1], b[1])], [960, 960])

				if (recentMinMax[1] - recentMinMax[0] <= 1080) {
					minMax[0] = recentMinMax[0]
					minMax[1] = recentMinMax[1]
				}
			} else {
				const w = minMax[1] - minMax[0]
				const c = minMax[0] + w / 2
				minMax[0] = c - 540
				minMax[1] = c + 540
			}
		}

		if (minMax[1] - minMax[0] <= 1080) {
			if (current && minMax[0] > current[0] && minMax[1] < current[1]) {
				x = current[0]
			} else {
				x = minMax[0] + (minMax[1] - minMax[0]) / 2 - 540
				x = Math.max(0, Math.min(x, 1920 - 1080))
			}
		} else {
			w = Math.min((minMax[1] - minMax[0]) * 1.1, 1920)
			x = minMax[0] + (minMax[1] - minMax[0]) * 0.55 - 0.5 * w
		}
		current = [x, x + w]

		lastAccelX = getMaxAccel(x, lastAccelX, true)
		lastAccelW = getMaxAccel(w, lastAccelW)
		x = lastAccelX.x ?? x
		w = lastAccelW.x ?? w

		return { frame: await cropFrame(frame, { x, w }, filter, encoder), dims: { x, w } }
	}
	const cropFrame = async (
		frame: Beamcoder.Frame,
		{ x, w }: { x: number; w: number },
		filter: Beamcoder.Filterer,
		encoder: Beamcoder.Encoder
	) => {
		// if (x === 0) console.log('x is zero')
		const cFilter = filter.graph.filters.find((f) => f.name.match(/crop/i))
		const sFilter = filter.graph.filters.find((f) => f.name.match(/scale/i))
		if (cFilter) cFilter.priv = { x: x + '', w: w + '' }
		if (sFilter) sFilter.priv = { h: Math.min((1080 * 1080) / w, 1080) + '' }

		// crop
		const filtered = await filter.filter([frame])
		const filteredFrame = filtered[0].frames[0]
		if (!filteredFrame) return frame

		// crop doesn't give use the cropped buffer yet, so we use an encoder for that
		const encodedPacket = await encoder.encode(filteredFrame)
		const encodedFrame = encodedPacket.packets[0]?.data
		if (!encodedFrame) return frame

		const newFrame = Beamcoder.frame({ width: 1080, height: 1080, format: 'bgra' })
		newFrame.alloc()
		encodedFrame.copy(newFrame.data[0])

		return newFrame
	}

	let running = true
	const detectionPoints: Analysis[] = []
	const cropAndBuffer: Valve<
		AnalysisResult,
		{ cropped: Beamcoder.Frame; cropValues: { x: number; w: number }; orig: Beamcoder.Frame }
	> = async (analysis) => {
		if (isValue(analysis)) {
			if (analysis.analysis) {
				if (analysis.analysis.sceneChange) {
					console.log('scene change')
					const frames: { cropped: Beamcoder.Frame; cropValues: { x: number; w: number }; orig: Beamcoder.Frame }[] = []
					for (let frame of frameBuffer) {
						const croppedFrame = await cropFrameFromAnalysis(frame, detectionPoints)
						if (croppedFrame) frames.push({ cropped: croppedFrame.frame, cropValues: croppedFrame.dims, orig: frame })
					}
					detectionPoints.splice(0, detectionPoints.length)
					frameBuffer.splice(0, frameBuffer.length)

					detectionPoints.push(analysis.analysis)
					frameBuffer.push(analysis.frame)
					lastAccelX = {}
					lastAccelW = {}
					current = undefined
					override.x = undefined
					override.w = undefined

					return frames
				}
				detectionPoints.push(analysis.analysis)
			}
			frameBuffer.push(analysis.frame)
		}

		if (running && frameBuffer.length > MAX_FRAMES) {
			const frame = frameBuffer.shift()
			if (!frame) return []

			const croppedFrame = await cropFrameFromAnalysis(frame, detectionPoints)
			if (!croppedFrame) return []

			return { cropped: croppedFrame.frame, cropValues: croppedFrame.dims, orig: frame }
		}

		if (frameBuffer.length > 2 * MAX_FRAMES) running = true

		return []
	}

	redio(frameGenerator)
		.valve(ndiFrameToFFmpegFrame)
		.valve(pairFrames)
		.valve(analyseFrames, { bufferSizeMax: 2 * 5 })
		.valve(cropAndBuffer, { oneToMany: true })
		.valve(ffmpegFrameToNDI, { bufferSizeMax: 2 * MAX_FRAMES })
		.spout(frameConsumer)
}
main()
