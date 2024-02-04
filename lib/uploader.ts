import type { AxiosError, AxiosResponse } from 'axios'

import { CanceledError } from 'axios'
import { encodePath } from '@nextcloud/paths'
import { Folder, Permission } from '@nextcloud/files'
import { generateRemoteUrl } from '@nextcloud/router'
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import PCancelable from 'p-cancelable'
import PQueue from 'p-queue'

import { getChunk, initChunkWorkspace, uploadData } from './utils/upload.js'
import { getMaxChunksSize } from './utils/config.js'
import { Status as UploadStatus, Upload } from './upload.js'
import logger from './utils/logger.js'

export enum Status {
	IDLE = 0,
	UPLOADING = 1,
	PAUSED = 2
}

export class Uploader {

	// Initialized via setter in the constructor
	private _destinationFolder!: Folder
	private _isPublic: boolean

	// Global upload queue
	private _uploadQueue: Array<Upload> = []
	private _jobQueue: PQueue = new PQueue({ concurrency: 3 })
	private _queueSize = 0
	private _queueProgress = 0
	private _queueStatus: Status = Status.IDLE

	private _notifiers: Array<(upload: Upload) => void> = []

	/**
	 * Initialize uploader
	 *
	 * @param {boolean} isPublic are we in public mode ?
	 * @param {Folder} destinationFolder the context folder to operate, relative to the root folder
	 */
	constructor(
		isPublic = false,
		destinationFolder?: Folder,
	) {
		this._isPublic = isPublic

		if (!destinationFolder) {
			const owner = getCurrentUser()?.uid
			const source = generateRemoteUrl(`dav/files/${owner}`)
			if (!owner) {
				throw new Error('User is not logged in')
			}
			destinationFolder = new Folder({
				id: 0,
				owner,
				permissions: Permission.ALL,
				root: `/files/${owner}`,
				source,
			})
		}
		this.destination = destinationFolder

		logger.debug('Upload workspace initialized', {
			destination: this.destination,
			root: this.root,
			isPublic,
			maxChunksSize: getMaxChunksSize(),
		})
	}

	/**
	 * Get the upload destination path relative to the root folder
	 */
	get destination(): Folder {
		return this._destinationFolder
	}

	/**
	 * Set the upload destination path relative to the root folder
	 */
	set destination(folder: Folder) {
		if (!folder) {
			throw new Error('Invalid destination folder')
		}
		this._destinationFolder = folder
	}

	/**
	 * Get the root folder
	 */
	get root() {
		return this._destinationFolder.source
	}

	/**
	 * Get the upload queue
	 */
	get queue() {
		return this._uploadQueue
	}

	private reset() {
		// Reset upload queue but keep the reference
		this._uploadQueue.splice(0, this._uploadQueue.length)
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

	addNotifier(notifier: (upload: Upload) => void) {
		this._notifiers.push(notifier)
	}

	/**
	 * Upload a file to the given path
	 * @param {string} destinationPath the destination path relative to the root folder. e.g. /foo/bar.txt
	 * @param {File} file the file to upload
	 */
	upload(destinationPath: string, file: File): PCancelable<Upload> {
		const destinationFile = `${this.root}/${destinationPath.replace(/^\//, '')}`

		// Get the encoded source url to this object for requests purposes
		const { origin } = new URL(destinationFile)
		const encodedDestinationFile = origin + encodePath(destinationFile.slice(origin.length))

		logger.debug(`Uploading ${file.name} to ${encodedDestinationFile}`)

		// If manually disabled or if the file is too small
		// TODO: support chunk uploading in public pages
		const maxChunkSize = getMaxChunksSize(file.size)
		const disabledChunkUpload = maxChunkSize === 0
			|| file.size < maxChunkSize
			|| this._isPublic

		const upload = new Upload(destinationFile, !disabledChunkUpload, file.size, file)
		this._uploadQueue.push(upload)
		this.updateStats()

		// eslint-disable-next-line no-async-promise-executor
		const promise = new PCancelable(async (resolve, reject, onCancel): Promise<Upload> => {
			// Register cancellation caller
			onCancel(upload.cancel)

			if (!disabledChunkUpload) {
				logger.debug('Initializing chunked upload', { file, upload })

				// Let's initialize a chunk upload
				const tempUrl = await initChunkWorkspace(encodedDestinationFile)
				const chunksQueue: Array<Promise<void>> = []

				// Generate chunks array
				for (let chunk = 0; chunk < upload.chunks; chunk++) {
					const bufferStart = chunk * maxChunkSize
					// Don't go further than the file size
					const bufferEnd = Math.min(bufferStart + maxChunkSize, upload.size)
					// Make it a Promise function for better memory management
					const blob = () => getChunk(file, bufferStart, maxChunkSize)

					// Init request queue
					const request = () => {
						return uploadData(
							`${tempUrl}/${chunk + 1}`,
							blob,
							upload.signal,
							() => this.updateStats(),
							encodedDestinationFile,
							{
								'X-OC-Mtime': file.lastModified / 1000,
								'OC-Total-Length': file.size,
								'Content-Type': 'application/octet-stream',
							},
						)
							// Update upload progress on chunk completion
							.then(() => { upload.uploaded = upload.uploaded + maxChunkSize })
							.catch((error) => {
								if (error?.response?.status === 507) {
									logger.error('Upload failed, not enough space on the server or quota exceeded. Cancelling the remaining chunks', { error, upload })
									upload.cancel()
									upload.status = UploadStatus.FAILED
									throw error
								}

								if (!(error instanceof CanceledError)) {
									logger.error(`Chunk ${chunk + 1} ${bufferStart} - ${bufferEnd} uploading failed`, { error, upload })
									// TODO: support retrying ?
									// https://github.com/nextcloud-libraries/nextcloud-upload/issues/5
									upload.cancel()
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

					upload.response = await axios.request({
						method: 'MOVE',
						url: `${tempUrl}/.file`,
						headers: {
							'X-OC-Mtime': file.lastModified / 1000,
							'OC-Total-Length': file.size,
							Destination: encodedDestinationFile,
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

				// Notify listeners of the upload completion
				this._notifiers.forEach(notifier => {
					try {
						notifier(upload)
					} catch (error) {}
				})
			} else {
				logger.debug('Initializing regular upload', { file, upload })

				// Generating upload limit
				const blob = await getChunk(file, 0, upload.size)
				const request = async () => {
					try {
						upload.response = await uploadData(
							encodedDestinationFile,
							blob,
							upload.signal,
							(event) => {
								upload.uploaded = upload.uploaded + event.bytes
								this.updateStats()
							},
							undefined,
							{
								'X-OC-Mtime': file.lastModified / 1000,
								'Content-Type': file.type,
							},
						)

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

						// Attach response to the upload object
						if ((error as AxiosError)?.response) {
							upload.response = (error as AxiosError).response as AxiosResponse
						}

						upload.status = UploadStatus.FAILED
						logger.error(`Failed uploading ${file.name}`, { error, file, upload })
						reject('Failed uploading the file')
					}

					// Notify listeners of the upload completion
					this._notifiers.forEach(notifier => {
						try {
							notifier(upload)
						} catch (error) {}
					})
				}
				this._jobQueue.add(request)
				this.updateStats()
			}

			// Reset when upload queue is done
			this._jobQueue.onIdle()
				.then(() => this.reset())
			return upload
		}) as PCancelable<Upload>

		return promise
	}

}
