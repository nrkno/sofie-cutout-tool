const traces: Record<string, number[]> = {}

export const startTrace = (name: string) => {
	return {
		start: Date.now(),
		name
	}
}

export const endTrace = (trace: { start: number; name: string }) => {
	if (!traces[trace.name]) traces[trace.name] = []
	traces[trace.name].push(Date.now() - trace.start)
	// console.log(trace.name + ' took ' + (Date.now() - trace.start))
}

setInterval(() => {
	console.log('timings')
	for (let [name, durs] of Object.entries(traces)) {
		console.log(name + ' took ' + durs.reduce((a, b) => a + b, 0) / durs.length)
		traces[name] = []
	}
}, 5000)
