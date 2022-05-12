import axios from '@nextcloud/axios'
import { generateRemoteUrl } from '@nextcloud/router'
import { getCurrentUser } from '@nextcloud/auth'
import crypto from 'crypto-browserify'

import logger from './logger'

export class Uploader {

	_tempWorkspace: string
	_destinationUrl: string
	_isPublic: boolean

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
	 * Upload a file to the given path
	 */
	upload(path: string, data: Buffer) {
		const tempWorkspace = `web-file-upload-${crypto.randomBytes(16).toString('hex')}`
		const url = `${this._tempWorkspace}/${tempWorkspace}`
		const destinationFile = `${this._destinationUrl}/${path.replace(/^\//, '')}`

		// If manually disabled or if the file is too small
		// TODO: support chunk uploading in public pages
		const maxChunkSize = global.OC?.appConfig?.files?.max_chunk_size || 10 * 1024 * 1024
		const disabledChunkUpload = global.OC?.appConfig?.files?.max_chunk_size === 0
			|| data.byteLength < maxChunkSize
			|| this._isPublic

		const uploadData = async function(url: string, data: Buffer) {
			await axios.request({
				method: 'PUT',
				url,
				data,
			})
		}

		// eslint-disable-next-line no-async-promise-executor
		return new Promise(async (resolve, reject) => {
			if (!disabledChunkUpload) {
				logger.debug('Initializing chunked upload', { maxChunkSize, url, destinationFile, byteLength: data.byteLength })

				// Let's initialize a chunk upload
				await axios.request({
					method: 'MKCOL',
					url,
				}).catch(() => reject('Failed creating chunked upload directory'))
			
				let retries = 0;
				const maxRetries = 5
				let bufferOffset = 0
				// Sending chunks
				while (bufferOffset < data.byteLength) {
					try {
						await uploadData(`${url}/${bufferOffset + maxChunkSize}`, data.slice(bufferOffset, bufferOffset + maxChunkSize))
						bufferOffset += maxChunkSize
						retries = 0
					} catch(error) {
						retries++
						if (retries >= maxRetries) {
							reject(`Failed uploading chunk ${bufferOffset} after ${maxRetries} retries`)
							break
						}
					}
				}

				await axios.request({
					method: 'MOVE',
					url: `${url}/.file`,
					headers: {
						Destination: destinationFile,
					},
				})
				.then(() => resolve(true))
				.catch(() => reject('Failed assembling the chunks together'))

				return
			}

			logger.debug('Initializing regular upload', { url, destinationFile, byteLength: data.byteLength })

			await uploadData(destinationFile, data)
			.then(() => resolve(true))
			.catch(() => reject('Failed uploading the file'))
		})
	}
}
