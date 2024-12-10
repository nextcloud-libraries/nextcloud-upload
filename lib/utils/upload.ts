/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { AxiosProgressEvent, AxiosResponse } from 'axios'
import { generateRemoteUrl } from '@nextcloud/router'
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import axiosRetry, { exponentialDelay } from 'axios-retry'

import logger from './logger'

axiosRetry(axios, { retries: 0 })

type UploadData = Blob | (() => Promise<Blob>)

/**
 * Upload some data to a given path
 * @param url the url to upload to
 * @param uploadData the data to upload
 * @param signal the abort signal
 * @param onUploadProgress the progress callback
 * @param destinationFile the final destination file (often used for chunked uploads)
 * @param headers additional headers
 * @param retries number of retries
 */
export const uploadData = async function(
	url: string,
	uploadData: UploadData,
	signal: AbortSignal,
	onUploadProgress:(event: AxiosProgressEvent) => void = () => {},
	destinationFile: string | undefined = undefined,
	headers: Record<string, string|number> = {},
	retries: number = 5,
): Promise<AxiosResponse> {
	let data: Blob

	// If the upload data is a blob, we can directly use it
	// Otherwise, we need to wait for the promise to resolve
	if (uploadData instanceof Blob) {
		data = uploadData
	} else {
		data = await uploadData()
	}

	// Helps the server to know what to do with the file afterwards (e.g. chunked upload)
	if (destinationFile) {
		headers.Destination = destinationFile
	}

	// If no content type is set, we default to octet-stream
	if (!headers['Content-Type']) {
		headers['Content-Type'] = 'application/octet-stream'
	}

	return await axios.request({
		method: 'PUT',
		url,
		data,
		signal,
		onUploadProgress,
		headers,
		'axios-retry': {
			retries,
			retryDelay: (retryCount, error) => exponentialDelay(retryCount, error, 1000),
		},
	})
}

/**
 * Get chunk of the file.
 * Doing this on the fly give us a big performance boost and proper garbage collection
 * @param file File to upload
 * @param start Offset to start upload
 * @param length Size of chunk to upload
 */
export const getChunk = function(file: File, start: number, length: number): Promise<Blob> {
	if (start === 0 && file.size <= length) {
		return Promise.resolve(new Blob([file], { type: file.type || 'application/octet-stream' }))
	}

	return Promise.resolve(new Blob([file.slice(start, start + length)], { type: 'application/octet-stream' }))
}

/**
 * Create a temporary upload workspace to upload the chunks to
 * @param destinationFile The file name after finishing the chunked upload
 * @param retries number of retries
 */
export const initChunkWorkspace = async function(destinationFile: string | undefined = undefined, retries: number = 5): Promise<string> {
	const chunksWorkspace = generateRemoteUrl(`dav/uploads/${getCurrentUser()?.uid}`)
	const hash = [...Array(16)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
	const tempWorkspace = `web-file-upload-${hash}`
	const url = `${chunksWorkspace}/${tempWorkspace}`
	const headers = destinationFile ? { Destination: destinationFile } : undefined

	await axios.request({
		method: 'MKCOL',
		url,
		headers,
		'axios-retry': {
			retries,
			retryDelay: (retryCount, error) => exponentialDelay(retryCount, error, 1000),
		},
	})

	logger.debug('Created temporary upload workspace', { url })

	return url
}
