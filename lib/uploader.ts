/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { AxiosError, AxiosResponse } from 'axios'
import type { WebDAVClient } from 'webdav'
import type { IDirectory } from './utils/fileTree'

import { getCurrentUser } from '@nextcloud/auth'
import { Folder, Permission, davGetClient, davRemoteURL, davRootPath } from '@nextcloud/files'
import { encodePath } from '@nextcloud/paths'
import { normalize } from 'path'

import axios, { isCancel } from '@nextcloud/axios'
import PCancelable from 'p-cancelable'
import PQueue from 'p-queue'

import { getChunk, initChunkWorkspace, uploadData } from './utils/upload.js'
import { getMaxChunksSize } from './utils/config.js'
import { Status as UploadStatus, Upload } from './upload.js'
import { isFileSystemFileEntry } from './utils/filesystem.js'
import { Directory } from './utils/fileTree.js'
import { t } from './utils/l10n.js'
import logger from './utils/logger.js'

export enum Status {
	IDLE = 0,
	UPLOADING = 1,
	PAUSED = 2
}

// Maximum number of concurrent uploads
const MAX_CONCURRENCY = 5

export class Uploader {

	// Initialized via setter in the constructor
	private _destinationFolder!: Folder
	private _isPublic: boolean

	// Global upload queue
	private _uploadQueue: Array<Upload> = []
	private _jobQueue: PQueue = new PQueue({ concurrency: MAX_CONCURRENCY })
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
			const source = `${davRemoteURL}${davRootPath}`
			let owner: string

			if (isPublic) {
				owner = 'anonymous'
			} else {
				const user = getCurrentUser()?.uid
				if (!user) {
					throw new Error('User is not logged in')
				}
				owner = user
			}

			destinationFolder = new Folder({
				id: 0,
				owner,
				permissions: Permission.ALL,
				root: davRootPath,
				source,
			})
		}
		this.destination = destinationFolder

		// Reset when upload queue is done
		this._jobQueue.addListener('idle', () => this.reset())

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

		logger.debug('Destination set', { folder })
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
	 * Notify listeners of the upload completion
	 * @param upload The upload that finished
	 */
	private _notifyAll(upload: Upload): void {
		for (const notifier of this._notifiers) {
			try {
				notifier(upload)
			} catch (error) {
				logger.warn('Error in upload notifier', { error, source: upload.source })
			}
		}
	}

	/**
	 * Uploads multiple files or folders while preserving the relative path (if available)
	 * @param {string} destination The destination path relative to the root folder. e.g. /foo/bar (a file "a.txt" will be uploaded then to "/foo/bar/a.txt")
	 * @param {Array<File|FileSystemEntry>} files The files and/or folders to upload
	 * @param {Function} callback Callback that receives the nodes in the current folder and the current path to allow resolving conflicts, all nodes that are returned will be uploaded (if a folder does not exist it will be created)
	 * @return Cancelable promise that resolves to an array of uploads
	 *
	 * @example
	 * ```ts
	 * // For example this is from handling the onchange event of an input[type=file]
	 * async handleFiles(files: File[]) {
	 *   this.uploads = await this.uploader.batchUpload('uploads', files, this.handleConflicts)
	 * }
	 *
	 * async handleConflicts(nodes: File[], currentPath: string) {
	 *   const conflicts = getConflicts(nodes, this.fetchContent(currentPath))
	 *   if (conficts.length === 0) {
	 *     // No conflicts so upload all
	 *     return nodes
	 *   } else {
	 *     // Open the conflict picker to resolve conflicts
	 *     try {
	 *       const { selected, renamed } = await openConflictPicker(currentPath, conflicts, this.fetchContent(currentPath), { recursive: true })
	 *       return [...selected, ...renamed]
	 *     } catch (e) {
	 *       return false
	 *     }
	 *   }
	 * }
	 * ```
	 */
	batchUpload(
		destination: string,
		files: (File|FileSystemEntry)[],
		callback?: (nodes: Array<File|IDirectory>,
		currentPath: string) => Promise<Array<File|IDirectory>|false>,
	): PCancelable<Upload[]> {
		const rootFolder = new Directory('', files)
		if (!callback) {
			callback = async (files: Array<File|Directory>) => files
		}

		try {
			// Increase concurrency to 4 to keep 3 parallel uploads as one if blocked by the directory meta-upload
			this._jobQueue.concurrency += 1

			return new PCancelable(async (resolve, reject, onCancel) => {
				try {
					const value = await this._jobQueue.add(() => {
						const promise = this.uploadDirectory(destination, rootFolder, callback, davGetClient(this.root))
						onCancel(() => promise.cancel())
						return promise
					})
					if (value) {
						resolve(value)
					}
				} catch (error) {
					logger.error('Error in batch upload', { error })
				}
				reject(t('Upload has been cancelled'))
			})
		} finally {
			// Reset concurrency
			this._jobQueue.concurrency -= 1
		}
	}

	// Helper for uploading directories (recursivly)
	private uploadDirectory(
		destination: string,
		directory: Directory,
		callback: (nodes: Array<File|Directory>, currentPath: string) => Promise<Array<File|Directory>|false>,
		// client as parameter to cache it for performance
		client: WebDAVClient,
	): PCancelable<Upload[]> {
		const folderPath = normalize(`${destination}/${directory.name}`).replace(/\/$/, '')
		const rootPath = `${this.root.replace(/\/$/, '')}/${folderPath.replace(/^\//, '')}`

		return new PCancelable(async (resolve, reject, onCancel) => {
			const abort = new AbortController()
			onCancel(() => abort.abort())

			// Let the user handle conflicts
			const selectedForUpload = await callback(directory.children, folderPath)
			if (selectedForUpload === false) {
				reject(t('Upload has been cancelled'))
				return
			} else if (selectedForUpload.length === 0 && directory.children.length > 0) {
				resolve([])
				return
			}

			const directories: PCancelable<Upload[]>[] = []
			const uploads: PCancelable<Upload>[] = []
			const currentUpload: Upload = new Upload(rootPath, false, 0, directory)
			currentUpload.signal.addEventListener('abort', () => reject(t('Upload has been cancelled')))
			currentUpload.status = UploadStatus.UPLOADING

			try {
				// Wait for own directory to be created (if not the virtual root)
				if (directory.name) {
					try {
						await client.createDirectory(folderPath, { signal: abort.signal })
						// We add the "upload" to get some information of changed nodes
						uploads.push(new PCancelable((resolve) => resolve(currentUpload!)))
						this._uploadQueue.push(currentUpload)
					} catch (error) {
						if (error && typeof error === 'object' && 'status' in error && error.status === 405) {
							// Directory already exists, so just write into it and ignore the error
							logger.debug('Directory already exists, writing into it', { directory: directory.name })
						} else {
							// Another error happend, so abort uploading the directory
							throw error
						}
					}
				}

				for (const node of selectedForUpload) {
					if (node instanceof Directory) {
						directories.push(this.uploadDirectory(folderPath, node, callback, client))
					} else {
						uploads.push(this.upload(`${folderPath}/${node.name}`, node))
					}
				}

				abort.signal.addEventListener('abort', () => {
					uploads.forEach((upload) => upload.cancel())
					directories.forEach((upload) => upload.cancel())
				})

				const resolvedUploads = await Promise.all(uploads)
				const resolvedDirectoryUploads = await Promise.all(directories)
				currentUpload.status = UploadStatus.FINISHED
				resolve([resolvedUploads, ...resolvedDirectoryUploads].flat())
			} catch (e) {
				abort.abort(e)
				currentUpload.status = UploadStatus.FAILED
				reject(e)
			} finally {
				if (directory.name) {
					this._notifyAll(currentUpload)
					this.updateStats()
				}
			}
		})
	}

	/**
	 * Upload a file to the given path
	 * @param {string} destination the destination path relative to the root folder. e.g. /foo/bar.txt
	 * @param {File|FileSystemFileEntry} fileHandle the file to upload
	 * @param {string} root the root folder to upload to
	 * @param retries number of retries
	 */
	upload(destination: string, fileHandle: File|FileSystemFileEntry, root?: string, retries: number = 5): PCancelable<Upload> {
		root = root || this.root
		const destinationPath = `${root.replace(/\/$/, '')}/${destination.replace(/^\//, '')}`

		// Get the encoded source url to this object for requests purposes
		const { origin } = new URL(destinationPath)
		const encodedDestinationFile = origin + encodePath(destinationPath.slice(origin.length))

		logger.debug(`Uploading ${fileHandle.name} to ${encodedDestinationFile}`)

		const promise = new PCancelable(async (resolve, reject, onCancel): Promise<Upload> => {
			// Handle file system entries by retrieving the file handle
			if (isFileSystemFileEntry(fileHandle)) {
				fileHandle = await new Promise((resolve) => (fileHandle as FileSystemFileEntry).file(resolve, reject))
			}
			// We can cast here as we handled system entries in the if above
			const file = fileHandle as File

			// If manually disabled or if the file is too small
			// TODO: support chunk uploading in public pages
			const maxChunkSize = getMaxChunksSize('size' in file ? file.size : undefined)
			const disabledChunkUpload = this._isPublic
				|| maxChunkSize === 0
				|| ('size' in file && file.size < maxChunkSize)

			const upload = new Upload(destinationPath, !disabledChunkUpload, file.size, file)
			this._uploadQueue.push(upload)
			this.updateStats()

			// Register cancellation caller
			onCancel(upload.cancel)

			if (!disabledChunkUpload) {
				logger.debug('Initializing chunked upload', { file, upload })

				// Let's initialize a chunk upload
				const tempUrl = await initChunkWorkspace(encodedDestinationFile, retries)
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
							retries,
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

								if (!isCancel(error)) {
									logger.error(`Chunk ${chunk + 1} ${bufferStart} - ${bufferEnd} uploading failed`, { error, upload })
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
					if (!isCancel(error)) {
						upload.status = UploadStatus.FAILED
						reject('Failed assembling the chunks together')
					} else {
						upload.status = UploadStatus.FAILED
						reject(t('Upload has been cancelled'))
					}

					// Cleaning up temp directory
					axios.request({
						method: 'DELETE',
						url: `${tempUrl}`,
					})
				}

				// Notify listeners of the upload completion
				this._notifyAll(upload)
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
						if (isCancel(error)) {
							upload.status = UploadStatus.FAILED
							reject(t('Upload has been cancelled'))
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
					this._notifyAll(upload)
				}
				this._jobQueue.add(request)
				this.updateStats()
			}
			return upload
		}) as PCancelable<Upload>

		return promise
	}

}
