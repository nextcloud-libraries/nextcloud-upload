import { CanceledError } from 'axios'
import { generateRemoteUrl } from '@nextcloud/router'
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import PCancelable from 'p-cancelable'
import PQueue from 'p-queue'

import { getChunk, initChunkWorkspace, uploadData } from './utils/upload'
import { getMaxChunksSize } from './utils/config'
import { Status as UploadStatus, Upload } from './upload'
import logger from './utils/logger'

export enum Status {
	IDLE = 0,
	UPLOADING = 1,
	PAUSED = 2
}

export class Uploader {

	private _userRootFolder: string
	private _destinationFolder: string = '/'

	private _isPublic: boolean

	// Global upload queue
	private _uploadQueue: Array<Upload> = []
	private _jobQueue: PQueue = new PQueue({ concurrency: 3 })
	private _queueSize: number = 0
	private _queueProgress: number = 0
	private _queueStatus: Status = Status.IDLE

	/**
	 * Initialize uploader
	 *
	 * @param {boolean} isPublic are we in public mode ?
	 */
	constructor(isPublic: boolean = false) {
		this._isPublic = isPublic
		this._userRootFolder = generateRemoteUrl(`dav/files/${getCurrentUser()?.uid}`)

		logger.debug('Upload workspace initialized', {
			destinationFolder: this._destinationFolder,
			userRootFolder: this._userRootFolder,
			isPublic,
			maxChunksSize: getMaxChunksSize(),
		})
	}

	/**
	 * Get the upload destination path relative to the user root folder
	 */
	get destination() {
		return this._destinationFolder
	}

	/**
	 * Set the upload destination path relative to the user root folder
	 */
	set destination(path: string) {
		if (path === '') {
			path = '/'
		}
		if (!path.startsWith('/')) {
			path = `/${path}`
		}
		this._destinationFolder = path.replace(/\/$/, '')
	}

	/**
	 * Get the upload queue
	 */
	get queue() {
		return this._uploadQueue
	}

	private reset() {
		this._uploadQueue = []
		this._jobQueue.clear()
		this._queueSize = 0
		this._queueProgress = 0
		this._queueStatus = Status.IDLE
	}

	/**
	 * Pause any ongoing upload(s)
	 */
	public pause() {
		this._jobQueue.pause()
		this._queueStatus = Status.PAUSED
	}

	/**
	 * Resume any pending upload(s)
	 */
	public start() {
		this._jobQueue.start()
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
			status: this._queueStatus,
		}
	}

	private updateStats() {
		const size = this._uploadQueue.map(upload => upload.size)
			.reduce((partialSum, a) => partialSum + a, 0)
		const uploaded = this._uploadQueue.map(upload => upload.uploaded)
			.reduce((partialSum, a) => partialSum + a, 0)

		this._queueSize = size
		this._queueProgress = uploaded

		// If already paused keep it that way
		if (this._queueStatus === Status.PAUSED) {
			return
		}
		this._queueStatus = this._jobQueue.size > 0
			? Status.UPLOADING
			: Status.IDLE
	}

	/**
	 * Upload a file to the given path
	 */
	upload(path: string, file: File) {
		const destinationFolder = this._destinationFolder === '/' ? '' : this._destinationFolder
		const destinationFile = `${this._userRootFolder}${destinationFolder}/${path.replace(/^\//, '')}`

		// If manually disabled or if the file is too small
		// TODO: support chunk uploading in public pages
		const maxChunkSize = getMaxChunksSize()
		const disabledChunkUpload = maxChunkSize === 0
			|| file.size < maxChunkSize
			|| this._isPublic

		const upload = new Upload(destinationFile, !disabledChunkUpload, file.size)
		this._uploadQueue.push(upload)
		this.updateStats()

		// eslint-disable-next-line no-async-promise-executor
		const promise = new PCancelable(async (resolve, reject, onCancel): Promise<Upload> => {
			// Register cancellation caller
			onCancel(upload.cancel)

			if (!disabledChunkUpload) {
				logger.debug('Initializing chunked upload', { file, upload })

				// Let's initialize a chunk upload
				const tempUrl = await initChunkWorkspace()
				const chunksQueue: Array<Promise<any>> = []

				// Generate chunks array
				for (let chunk = 0; chunk < upload.chunks; chunk++) {
					const bufferStart = chunk * maxChunkSize
					// Don't go further than the file size
					const bufferEnd = Math.min(bufferStart + maxChunkSize, upload.size)
					// Make it a Promise function for better memory management
					const blob = () => getChunk(file, bufferStart, maxChunkSize)

					// Init request queue
					const request = () => {
						return uploadData(`${tempUrl}/${bufferEnd}`, blob, upload.signal, () => this.updateStats())
							// Update upload progress on chunk completion
							.then(() => { upload.uploaded = upload.uploaded + maxChunkSize })
							.catch((error) => {
								if (!(error instanceof CanceledError)) {
									logger.error(`Chunk ${bufferStart} - ${bufferEnd} uploading failed`)
									upload.status = UploadStatus.FAILED
								}
								throw error
							})
					}
					chunksQueue.push(this._jobQueue.add(request))
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
				const blob = await getChunk(file, 0, upload.size)
				const request = async () => {
					try {
						await uploadData(destinationFile, blob, upload.signal, () => this.updateStats())

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
				this._jobQueue.add(request)
				this.updateStats()
			}

			// Reset when upload queue is done
			this._jobQueue.onIdle()
				.then(() => this.reset())
			return upload
		})

		return promise
	}

}
