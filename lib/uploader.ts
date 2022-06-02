import { CanceledError, type AxiosResponse } from 'axios'
import { generateRemoteUrl } from '@nextcloud/router'
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import { Status as UploadStatus, Upload } from './upload'
import PCancelable from 'p-cancelable';
import PQueue from 'p-queue';


import logger from './logger';
import { getMaxChunksSize } from './utils/configUtil'
import { getChunk, initChunkWorkspace, uploadData } from './utils/uploadUtil'

export enum Status {
	IDLE = 0,
	UPLOADING = 1,
	PAUSED = 2
}
export class Uploader {
	private userRootFolder: string
	private destinationFolder: string = '/'

	private isPublic: boolean

	// Global upload queue
	private uploadQueue: Array<Upload> = []
	private jobQueue: PQueue = new PQueue({ concurrency: 3 })
	private queueSize: number = 0
	private queueProgress: number = 0
	private queueStatus: Status = Status.IDLE

	/**
	 * Initialize uploader
	 * 
	 * @param {boolean} isPublic are we in public mode ?
	 */
	constructor(isPublic: boolean = false) {
		this.isPublic = isPublic
		this.userRootFolder = generateRemoteUrl(`dav/files/${getCurrentUser()?.uid}`)

		logger.debug('Upload workspace initialized', {
			destinationFolder: this.destinationFolder,
			userRootFolder: this.userRootFolder,
			isPublic,
			maxChunksSize: getMaxChunksSize(),
		})
	}

	/**
	 * Get the upload destination path relative to the user root folder
	 */
	get destination() {
		return this.destinationFolder
	}

	/**
	 * Set the upload destination path relative to the user root folder
	 */
	set destination(path: string) {
		if (path === '') {
			path = '/'
		}
		if (!path.startsWith('/') ) {
			path = `/${path}`
		}
		this.destinationFolder = path.replace(/\/$/, '')
	}

	/**
	 * Get the upload queue
	 */
	get queue() {
		return this.uploadQueue
	}

	private reset() {
		this.uploadQueue = []
		this.jobQueue.clear()
		this.queueSize = 0
		this.queueProgress = 0
		this.queueStatus = Status.IDLE
	}

	/**
	 * Pause any ongoing upload(s)
	 */
	public pause() {
		this.jobQueue.pause()
		this.queueStatus = Status.PAUSED
	}

	/**
	 * Resume any pending upload(s)
	 */
	public start() {
		this.jobQueue.start()
		this.queueStatus = Status.UPLOADING
		this.updateStats()
	}

	/**
	 * Get the upload queue stats
	 */
	get info() {
		return {
			size: this.queueSize,
			progress: this.queueProgress,
			status: this.queueStatus
		}
	}

	private updateStats() {
		const size = this.uploadQueue.map(upload => upload.size)
			.reduce((partialSum, a) => partialSum + a, 0)
		const uploaded = this.uploadQueue.map(upload => upload.uploaded)
			.reduce((partialSum, a) => partialSum + a, 0)

		this.queueSize = size
		this.queueProgress = uploaded

		// If already paused keep it that way
		if (this.queueStatus === Status.PAUSED) {
			return
		}
		this.queueStatus = this.jobQueue.size > 0
			? Status.UPLOADING
			: Status.IDLE
	}
	
	/**
	 * Upload a file to the given path
	 */
	upload(path: string, file: File) {
		const destinationFile = `${this.userRootFolder}${this.destinationFolder}/${path.replace(/^\//, '')}`

		// If manually disabled or if the file is too small
		// TODO: support chunk uploading in public pages
		const maxChunkSize = getMaxChunksSize()
		const disabledChunkUpload = maxChunkSize === 0
			|| file.size < maxChunkSize
			|| this.isPublic


		const upload = new Upload(destinationFile, !disabledChunkUpload, file.size)
		this.uploadQueue.push(upload)

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
							.then(() => upload.uploaded = upload.uploaded + maxChunkSize)
							.catch((error) => {
								if (!(error instanceof CanceledError)) {
									logger.error(`Chunk ${bufferStart} - ${bufferEnd} uploading failed`)
									upload.status = UploadStatus.FAILED
								}
								throw error
							})
					}
					chunksQueue.push(this.jobQueue.add(request))
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
				this.jobQueue.add(request)
				this.updateStats()
			}

			// Reset when upload queue is done
			this.jobQueue.onIdle()
				.then(() => this.reset())
			return upload
		})

		return promise
	}
}
