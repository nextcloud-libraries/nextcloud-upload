import axios from '@nextcloud/axios'
import { CancelTokenSource, CancelToken } from 'axios'

import { getMaxChunksSize } from './utils'
const CancelToken = axios.CancelToken

export enum Status {
	INITIALIZED = 1,
	UPLOADING = 2,
	FINISHED = 3,
	CANCELLED = 4,
	FAILED = 5,
}
export class Upload {
	private _path: string
	private _isChunked: boolean
	private _chunks: number
	private _size: number
    private _uploaded: number
    private _status: Status
	private _source: CancelTokenSource

	constructor(path: string, chunked: boolean = false, size: number) {
		this._path = path
		this._isChunked = chunked && getMaxChunksSize() > 0
		this._chunks = this._isChunked ? Math.floor(size/getMaxChunksSize()) : 1
		this._size = size
		this._uploaded = 0
		this._status = Status.INITIALIZED
		this._source = CancelToken.source();
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

	/**
	 * Update the uploaded bytes of this upload
	 */
	set uploaded(size: number) {
		if (size >= this._size) {
			this._status = Status.FINISHED
			this._uploaded = this._size
			return
		}

		this._status = Status.UPLOADING
		this._uploaded = size
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
	get token(): CancelToken {
		return this._source.token
	}

	/**
	 * Cancel any ongoing requests linked to this upload
	 */
	cancel() {
		this._source.cancel()
		this._status  = Status.CANCELLED
	}
}
