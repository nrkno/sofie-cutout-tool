

	function setupStream (element, channel) {
		const urlBase = ""

		// First, let it be known of our intentions:
		fetch(urlBase + "/channel/" + channel + "/stream")
		.then(response => response.json())
		.then(streamInfo => {
			// The server has now set up the stream and given us a link to it.
			// We must now crop and display the video stream.

			// Find the region:
			const region = streamInfo.regions.find(r => r.channel == channel)
			if (!region) throw new Error("Region for channel " + channel + " not found")


			// Find the stream that the region uses:
			const stream = streamInfo.streams.find(s => s.id == region.streamId)
			if (!region) throw new Error("Stream " + region.streamId + " not found")

			const w = stream.width / region.width
			const y = region.y / region.height
			const x = region.x / region.width

			const img = new Image();
			img.addEventListener("load", function (e) { console.log("load", e) })
			img.addEventListener("error", function (e) { console.log("error", e) })

			img.style.position = "absolute"
			img.style.width = (w * 100) + "%"
			img.style.top = (-y * 100) + "%"
			img.style.left = (-x * 100) + "%"
			img.style.background = "#000000"
			img.src = urlBase + stream.url

			const div = document.createElement("div")
			div.style.width = "100%"
			div.style.paddingTop = "56.25%"
			div.style.position = "relative"
			div.style.overflow = "hidden"

			div.appendChild(img)
			element.appendChild(div)

		})
	}
	setupStream(document.getElementById("stream-container"), 1)
	