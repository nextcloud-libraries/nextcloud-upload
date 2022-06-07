export default {
	async request(data) {
		// Fake upload progress
		if (data.onUploadProgress) {
			setTimeout(data.onUploadProgress, 200)
		}

		// Simulate a 500ms request
		await new Promise(resolve => setTimeout(() => resolve(data), 500))
	},
}
