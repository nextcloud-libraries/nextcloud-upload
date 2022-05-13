import { AxiosResponse, CancelToken } from 'axios'
import { generateRemoteUrl } from '@nextcloud/router'
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import crypto from 'crypto-browserify'
import { Status, Upload } from './upload'
import PLimit from 'p-limit'
import PCancelable from 'p-cancelable';

const limit = PLimit(3)

import logger from './logger';
import { getMaxChunksSize } from './utils'

export class Uploader {

	private _tempWorkspace: string
	private _destinationUrl: string
	private _isPublic: boolean

	// Global upload queue
	private _queue: Array<Upload> = []
	private _queueLimit: Array<Promise<any>> = []

	/**
	 * Initialize uploader
	 * 
	 * @param {boolean} isPublic are we in public mode ?
	 */
	constructor(isPublic: boolean = false) {
		this._isPublic = isPublic
		this._destinationUrl = generateRemoteUrl(`dav/files/${getCurrentUser()?.uid}`)
		this._tempWorkspace = generateRemoteUrl(`dav/uploads/${getCurrentUser()?.uid}`)

		logger.debug('Upload workspace initialized', {
			destinationUrl: this._destinationUrl,
			tempWorkspace: this._tempWorkspace,
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
	 * Create a temporary upload workspace to upload the chunks to
	 */
	private async initChunkWorkspace(): Promise<string> {
		const tempWorkspace = `web-file-upload-${crypto.randomBytes(16).toString('hex')}`
		const url = `${this._tempWorkspace}/${tempWorkspace}`
		await axios.request({
			method: 'MKCOL',
			url,
		})

		return url
	}

	/**
	 * Upload some data to a given path
	 */
	private async uploadData(url: string, getData: () => Buffer|null, cancelToken: CancelToken): Promise<AxiosResponse> {
		const data = getData()
		return await axios.request({
			method: 'PUT',
			url,
			data,
			cancelToken
		})
	}

	/**
	 * Upload a file to the given path
	 */
	upload(path: string, data: Buffer) {
		const destinationFile = `${this._destinationUrl}/${path.replace(/^\//, '')}`

		// If manually disabled or if the file is too small
		// TODO: support chunk uploading in public pages
		const maxChunkSize = getMaxChunksSize()
		const disabledChunkUpload = maxChunkSize === 0
			|| data.byteLength < maxChunkSize
			|| this._isPublic


		const upload = new Upload(destinationFile, !disabledChunkUpload, data.byteLength)
		this._queue.push(upload)

		// eslint-disable-next-line no-async-promise-executor
		const promise = new PCancelable(async (resolve, reject, onCancel): Promise<Upload> => {
			if (!disabledChunkUpload) {
				logger.debug('Initializing chunked upload', upload)

				// Let's initialize a chunk upload
				const tempUrl = await this.initChunkWorkspace()
				const chunksQueue: Array<Promise<AxiosResponse>> = []

				// Register cancellation caller
				onCancel(upload.cancel)
			
				// Generate chunks array
				for (let chunk = 0; chunk <= upload.chunks; chunk++) {
					const bufferStart = chunk * maxChunkSize
					const bufferEnd = bufferStart + maxChunkSize
					const request = limit(() => this.uploadData(`${tempUrl}/${bufferEnd}`, () => data.slice(bufferStart, bufferEnd), upload.token))
					request
						// Update upload progress on chunk completion
						.then(() => upload.uploaded = upload.uploaded + maxChunkSize)
						.catch(() => upload.status = Status.FAILED)
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
						.then(() => resolve(upload))
						.catch(() => upload.status = Status.FAILED)
						.catch(() => reject('Failed assembling the chunks together'))
					})
					.catch(() => {
						// CLeaning up temp directory
						axios.request({
							method: 'DELETE',
							url: `${tempUrl}`,
						})
					})

				return upload
			}

			logger.debug('Initializing regular upload', upload)

			// Generating upload limit
			const request = limit(() => this.uploadData(destinationFile, () => data, upload.token))
			request
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
