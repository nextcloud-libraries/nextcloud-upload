import axios from '@nextcloud/axios'

import { getMaxChunksSize } from './utils'

export enum Status {
	INITIALIZED = 1,
	UPLOADING = 2,
	ASSEMBLING = 3,
	FINISHED = 4,
	CANCELLED = 5,
	FAILED = 6,
}
export class Upload {
	private _path: string
	private _isChunked: boolean
	private _chunks: number

	private _size: number
    private _uploaded: number
    private _startTime: number = 0

    private _status: Status
	private _controller: AbortController

	constructor(path: string, chunked: boolean = false, size: number) {
		this._path = path
		this._isChunked = chunked && getMaxChunksSize() > 0
		this._chunks = this._isChunked ? Math.ceil(size / getMaxChunksSize()) : 1
		this._size = size
		this._uploaded = 0
		this._status = Status.INITIALIZED
		this._controller =  new AbortController()
	}

	get path(): string {
		return this._path
	}

	get isChunked(): boolean {
		return this._isChunked
	}

	get chunks(): number {
		return this._chunks
	}

	get size(): number {
		return this._size
	}

	get uploaded(): number {
		return this._uploaded
	}

	get startTime(): number {
		return this._startTime
	}

	/**
	 * Update the uploaded bytes of this upload
	 */
	set uploaded(length: number) {
		if (length >= this._size) {
			this._status = this._isChunked ? Status.ASSEMBLING : Status.FINISHED
			this._uploaded = this._size
			return
		}

		this._status = Status.UPLOADING
		this._uploaded = length

		// If first progress, let's log the start time
		if (this._startTime === 0) {
			this._startTime = new Date().getTime()
		}
	}

	get status(): number {
		return this._status
	}

	/**
	 * Update this upload status
	 */
	set status(status: Status) {
		this._status = status
	}

	/**
	 * Returns the axios cancel token source
	 */
	get signal(): AbortSignal {
		return this._controller.signal
	}

	/**
	 * Cancel any ongoing requests linked to this upload
	 */
	cancel() {
		this._controller.abort(),
		this._status  = Status.CANCELLED
	}
}
