/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { AxiosResponse } from 'axios'
import { getMaxChunksSize } from './utils/config.js'

/**
 * Lifecycle states for a single logical upload.
 */
export enum Status {
	INITIALIZED = 0,
	UPLOADING = 1,
	ASSEMBLING = 2,
	FINISHED = 3,
	CANCELLED = 4,
	FAILED = 5,
}

/**
 * Represents a single logical upload (a file or directory upload) and tracks
 * its progress, status, and cancellation signal.
 */
export class Upload {
	private _source: string
	private _file: File
	private _isChunked: boolean
	private _chunks: number

	private _size: number
	private _uploaded = 0
	private _startTime = 0

	private _status: Status = Status.INITIALIZED
	private _controller: AbortController
	private _response: AxiosResponse|null = null

	constructor(source: string, chunked = false, size: number, file: File) {
		const maxChunkSize = getMaxChunksSize()
		// Limit the computed chunk count to the maximum supported by chunked upload v2.
		const chunks = Math.min(maxChunkSize > 0 ? Math.ceil(size / maxChunkSize) : 1, 10000)

		this._source = source
		this._isChunked = chunked && maxChunkSize > 0 && chunks > 1
		// Non-chunked uploads are tracked as a single logical chunk.
		this._chunks = this._isChunked ? chunks : 1
		this._size = size
		this._file = file
		this._controller = new AbortController()
	}

	/**
	 * Destination path of this upload item on the remote server.
	 */
	get source(): string {
		return this._source
	}

	/**
	 * Underlying file object associated with this upload item.
	 */
	get file(): File {
		return this._file
	}

	get isChunked(): boolean {
		return this._isChunked
	}

	/**
	 * Number of logical chunks used to upload this item.
	 */
	get chunks(): number {
		return this._chunks
	}

	/**
	 * Total byte size of this upload item.
	 *
	 * Meta or directory uploads may report `0`.
	 */
	get size(): number {
		return this._size
	}

	/**
	 * Time when the first upload progress event was observed.
	 *
	 * This is a Unix timestamp in milliseconds. It is set on the first observed
	 * progress update, not when the upload object is created.
	 */
	get startTime(): number {
		return this._startTime
	}

	/**
	 * Store the latest HTTP response associated with this upload.
	 */
	set response(response: AxiosResponse|null) {
		this._response = response
	}

	/**
	 * The latest HTTP response associated with this upload, if any.
	 */
	get response(): AxiosResponse|null {
		return this._response
	}

	/**
	 * Tracked uploaded byte count for this upload item.
	 */
	get uploaded(): number {
		return this._uploaded
	}

	/**
	 * Update the tracked uploaded byte count for this upload.
	 *
	 * Progress updates are ignored once the upload enters the assembling state or
	 * reaches a terminal state, because byte-transfer progress should no longer
	 * change in those states. The stored byte count is clamped to the range `0..size`.
	 */
	set uploaded(length: number) {
		if ([Status.ASSEMBLING, Status.CANCELLED, Status.FAILED, Status.FINISHED].includes(this._status)) {
			return
		}

		const clampedLength = Math.min(Math.max(length, 0), this._size)

		if (clampedLength >= this._size) {
			this._status = this._isChunked
				? Status.ASSEMBLING
				: Status.FINISHED
			this._uploaded = this._size
			return
		}

		this._status = Status.UPLOADING
		this._uploaded = clampedLength

		// Record the time of the first observed progress update.
		if (this._startTime === 0) {
			this._startTime = Date.now()
		}
	}

	get status(): Status {
		return this._status
	}

	/**
	 * Set the current upload status explicitly.
	 */
	set status(status: Status) {
		this._status = status
	}

	/**
	 * Returns the AbortSignal used to cancel ongoing requests.
	 */
	get signal(): AbortSignal {
		return this._controller.signal
	}

	/**
	 * Abort any ongoing requests linked to this upload and mark it as cancelled.
	 */
	cancel(): void {
		this._controller.abort()
		this._status = Status.CANCELLED
	}
}
