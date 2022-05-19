import type { AxiosResponse, CancelToken } from 'axios'
import { generateRemoteUrl } from '@nextcloud/router'
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import crypto from 'crypto-browserify'
import { Status, Upload } from './upload'
import PLimit from 'p-limit'
import PCancelable from 'p-cancelable';

const limit = PLimit(3)
const readerLimit = PLimit(1)

import logger from './logger';
import { getMaxChunksSize } from './utils'

export class Uploader {

	private tempWorkspace: string
	private destinationUrl: string
	private isPublic: boolean
	private reader: FileReader;

	// Global upload queue
	private _queue: Array<Upload> = []
	private _queueLimit: Array<Promise<any>> = []

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
		})
	}

	/**
	 * Get the upload queue
	 */
	get queue() {
		return this._queue
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
	private async uploadData(url: string, data: Blob, signal: AbortSignal): Promise<AxiosResponse> {
		return await axios.request({
			method: 'PUT',
			url,
			data,
			signal
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
				const chunksQueue: Array<Promise<AxiosResponse>> = []
			
				// Generate chunks array
				let retries = 0
				const maxRetries = 2
				for (let chunk = 0; chunk <= upload.chunks; chunk++) {
					const bufferStart = chunk * maxChunkSize
					const bufferEnd = bufferStart + maxChunkSize
					const blob = await this.getChunk(file, bufferStart, maxChunkSize)
					const request = limit(() => this.uploadData(`${tempUrl}/${bufferEnd}`, blob, upload.signal))
					request
						// Update upload progress on chunk completion
						.then(() => upload.uploaded = upload.uploaded + maxChunkSize)
						.catch(() => {
							if (retries < maxRetries) {
								retries++
								logger.error(`Chunk ${bufferStart} - ${bufferEnd} failed, retrying`)
								const request = limit(() => this.uploadData(`${tempUrl}/${bufferEnd}`, blob, upload.signal))
								chunksQueue.push(request)
								this._queueLimit.push(request)
								return
							}
							upload.status = Status.FAILED
							logger.warn(`Max retries exceeded. Upload failure`)
						})
					chunksQueue.push(request)
					this._queueLimit.push(request)
				}

				// Once all chunks are sent, assemble the final file
				Promise.all(chunksQueue)
					.then(() => {
						axios.request({
							method: 'MOVE',
							url: `${tempUrl}/.file`,
							headers: {
								Destination: destinationFile,
							},
						})
						.then(() => logger.debug(`Successfully uploaded ${file.name}`, { file, upload }))
						.then(() => resolve(upload))
						.catch(() => upload.status = Status.FAILED)
						.catch(() => reject('Failed assembling the chunks together'))
					})
					.catch(() => {
						// Cleaning up temp directory
						axios.request({
							method: 'DELETE',
							url: `${tempUrl}`,
						})
					})

				return upload
			}

			logger.debug('Initializing regular upload', { file, upload })

			// Generating upload limit
			const blob = await this.getChunk(file, 0, upload.size)
			const request = limit(() => this.uploadData(destinationFile, blob, upload.signal))
			request
				.then(() => logger.debug(`Successfully uploaded ${file.name}`, { file, upload }))
				.then(() => upload.uploaded = upload.size)
				.then(() => resolve(upload))
				.catch(() => upload.status = Status.FAILED)
				.catch(() => reject('Failed uploading the file'))

			this._queueLimit.push(request)
			return upload
		})
		

		return promise
	}
}
