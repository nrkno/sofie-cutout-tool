export { clamp }

function clamp(value, min, max) {
	return Math.min(max, Math.max(value, min))
}
