import { CanceledError, type AxiosResponse } from 'axios'
import { generateRemoteUrl } from '@nextcloud/router'
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import crypto from 'crypto-browserify'
import { Status as UploadStatus, Upload } from './upload'
import PLimit from 'p-limit'
import PCancelable from 'p-cancelable';
import PQueue from 'p-queue';

const readerLimit = PLimit(1)

import logger from './logger';
import { getMaxChunksSize } from './utils'

export enum Status {
	IDLE = 0,
	UPLOADING = 1,
	PAUSED = 2
}
export class Uploader {

	private tempWorkspace: string
	private destinationUrl: string
	private isPublic: boolean
	private reader: FileReader

	// Global upload queue
	private _queue: Array<Upload> = []
	private _queueLimit: PQueue = new PQueue({ concurrency: 3 })
	private _queueSize: number = 0
	private _queueProgress: number = 0
	private _queueStatus: Status = Status.IDLE

	/**
	 * Initialize uploader
	 * 
	 * @param {boolean} isPublic are we in public mode ?
	 */
	constructor(isPublic: boolean = false) {
		this.isPublic = isPublic
		this.destinationUrl = generateRemoteUrl(`dav/files/${getCurrentUser()?.uid}`)
		this.tempWorkspace = generateRemoteUrl(`dav/uploads/${getCurrentUser()?.uid}`)

		this.reader = new FileReader();

		logger.debug('Upload workspace initialized', {
			destinationUrl: this.destinationUrl,
			tempWorkspace: this.tempWorkspace,
			isPublic,
			maxChunksSize: getMaxChunksSize(),
		})
	}

	/**
	 * Get the upload queue
	 */
	get queue() {
		return this._queue
	}

	private reset() {
		this._queue = []
		this._queueLimit.clear()
		this._queueSize = 0
		this._queueProgress = 0
		this._queueStatus = Status.IDLE
	}

	/**
	 * Pause any ongoing upload(s)
	 */
	public pause() {
		this._queueLimit.pause()
		this._queueStatus = Status.PAUSED
	}

	/**
	 * Resume any pending upload(s)
	 */
	public start() {
		this._queueLimit.start()
		this._queueStatus = Status.UPLOADING
		this.updateStats()
	}

	/**
	 * Get the upload queue stats
	 */
	get info() {
		return {
			size: this._queueSize,
			progress: this._queueProgress,
			status: this._queueStatus
		}
	}

	private updateStats() {
		const size = this._queue.map(upload => upload.size)
			.reduce((partialSum, a) => partialSum + a, 0)
		const uploaded = this._queue.map(upload => upload.uploaded)
			.reduce((partialSum, a) => partialSum + a, 0)

		this._queueSize = size
		this._queueProgress = uploaded

		// If already paused keep it that way
		if (this._queueStatus === Status.PAUSED) {
			return
		}
		this._queueStatus = this._queueLimit.size > 0
			? Status.UPLOADING
			: Status.IDLE
	}

	/**
	 * Get chunk of the file. Doing this on the fly
	 * give us a big performance boost and proper
	 * garbage collection
	 */
	private getChunk(file: File, start: number, length: number): Promise<Blob> {
		if (!file.type) {
			return Promise.reject()
		}

		// Since we use a global FileReader, we need to only read one chunk at a time
		return readerLimit(() => new Promise((resolve, reject) => {
			this.reader.onload = () => {
				if (this.reader.result !== null) {
					resolve(new Blob([this.reader.result], {
						type: 'application/octet-stream',
					}))
				}
				reject()
			}
			this.reader.readAsArrayBuffer(file.slice(start, start + length))
		}))
	}

	/**
	 * Create a temporary upload workspace to upload the chunks to
	 */
	private async initChunkWorkspace(): Promise<string> {
		const tempWorkspace = `web-file-upload-${crypto.randomBytes(16).toString('hex')}`
		const url = `${this.tempWorkspace}/${tempWorkspace}`
		await axios.request({
			method: 'MKCOL',
			url,
		})

		return url
	}

	/**
	 * Upload some data to a given path
	 */
	private async uploadData(url: string, data: Blob | (() => Promise<Blob>), signal: AbortSignal): Promise<AxiosResponse> {
		if (typeof data === 'function') {
			data = await data()
		}

		return await axios.request({
			method: 'PUT',
			url,
			data,
			signal,
			onUploadProgress: () => this.updateStats(),
		})
	}
	
	/**
	 * Upload a file to the given path
	 */
	upload(path: string, file: File) {
		const destinationFile = `${this.destinationUrl}/${path.replace(/^\//, '')}`

		// If manually disabled or if the file is too small
		// TODO: support chunk uploading in public pages
		const maxChunkSize = getMaxChunksSize()
		const disabledChunkUpload = maxChunkSize === 0
			|| file.size < maxChunkSize
			|| this.isPublic


		const upload = new Upload(destinationFile, !disabledChunkUpload, file.size)
		this._queue.push(upload)

		// eslint-disable-next-line no-async-promise-executor
		const promise = new PCancelable(async (resolve, reject, onCancel): Promise<Upload> => {
			// Register cancellation caller
			onCancel(upload.cancel)

			if (!disabledChunkUpload) {
				logger.debug('Initializing chunked upload', { file, upload })

				// Let's initialize a chunk upload
				const tempUrl = await this.initChunkWorkspace()
				const chunksQueue: Array<Promise<any>> = []
			
				// Generate chunks array
				for (let chunk = 0; chunk < upload.chunks; chunk++) {
					const bufferStart = chunk * maxChunkSize
					// Don't go further than the file size
					const bufferEnd = Math.min(bufferStart + maxChunkSize, upload.size)
					// Make it a Promise function for better memory management
					const blob = () => this.getChunk(file, bufferStart, maxChunkSize)

					// Init request queue
					const request = () => {
						return this.uploadData(`${tempUrl}/${bufferEnd}`, blob, upload.signal)
							// Update upload progress on chunk completion
							.then(() => upload.uploaded = upload.uploaded + maxChunkSize)
							.catch((error) => {
								if (!(error instanceof CanceledError)) {
									logger.error(`Chunk ${bufferStart} - ${bufferEnd} uploading failed`)
									upload.status = UploadStatus.FAILED
								}
								throw error
							})
					}
					chunksQueue.push(this._queueLimit.add(request))
				}

				try {
					// Once all chunks are sent, assemble the final file
					await Promise.all(chunksQueue)
					this.updateStats()

					await axios.request({
							method: 'MOVE',
							url: `${tempUrl}/.file`,
							headers: {
								Destination: destinationFile,
							},
						})

					this.updateStats()
					upload.status = UploadStatus.FINISHED
					logger.debug(`Successfully uploaded ${file.name}`, { file, upload })
					resolve(upload)
				} catch (error) {
					if (!(error instanceof CanceledError)) {
						upload.status = UploadStatus.FAILED
						reject('Failed assembling the chunks together')
					} else {
						upload.status = UploadStatus.FAILED
						reject('Upload has been cancelled')
					}

					// Cleaning up temp directory
					axios.request({
						method: 'DELETE',
						url: `${tempUrl}`,
					})
				}
			} else {
				logger.debug('Initializing regular upload', { file, upload })

				// Generating upload limit
				const blob = await this.getChunk(file, 0, upload.size)
				const request = async () => {
					try {
						await this.uploadData(destinationFile, blob, upload.signal)

						// Update progress
						upload.uploaded = upload.size
						this.updateStats()

						// Resolve
						logger.debug(`Successfully uploaded ${file.name}`, { file, upload })
						resolve(upload)
					} catch (error) {
						if (error instanceof CanceledError) {
							upload.status = UploadStatus.FAILED
							reject('Upload has been cancelled')
							return
						} 
						upload.status = UploadStatus.FAILED
						reject('Failed uploading the file')
					}
				}
				this._queueLimit.add(request)
				this.updateStats()
			}

			// Reset when upload queue is done
			this._queueLimit.onIdle()
				.then(() => this.reset())
			return upload
		})

		return promise
	}
}
