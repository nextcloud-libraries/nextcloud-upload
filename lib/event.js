class Event {

	constructor(filename, chunkNo, message = null, complete = false) {
		this.filename = filename
		this.chunkNo = chunkNo
		this.message = message
		this.complete = complete
	}

	toString() {
		return `${this.filename} (chunk ${this.chunkNo}, complete = ${this.complete}): ${this.message || '<No message>'}`
	}

}

module.exports = Event
