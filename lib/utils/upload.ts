/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { AxiosProgressEvent, AxiosResponse, AxiosError } from 'axios'
import { generateRemoteUrl, getBaseUrl } from '@nextcloud/router'
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import axiosRetry, { exponentialDelay, isNetworkOrIdempotentRequestError } from 'axios-retry'
import { getSharingToken } from '@nextcloud/sharing/public'

import logger from './logger'

axiosRetry(axios, { retries: 0 })

type UploadData = Blob | (() => Promise<Blob>)

interface UploadDataOptions {
	/** Abort signal for the upload request. */
	signal: AbortSignal
	/** Callback for upload progress events. */
	onUploadProgress?: (event: AxiosProgressEvent) => void
	/** Callback invoked before a failed upload request is retried. */
	onUploadRetry?: () => void
	/** Final destination file path, used for chunked uploads. */
	destinationFile?: string
	/** Additional request headers. */
	headers?: Record<string, string | number>
	/** Number of retry attempts. */
	retries?: number,
}

/**
 * Upload data to the given URL.
 *
 * @param url The target upload URL.
 * @param uploadData The data to upload, or a lazy function that resolves to it.
 * @param uploadOptions Upload configuration.
 */
export async function uploadData(
	url: string,
	uploadData: UploadData,
	uploadOptions: UploadDataOptions,
): Promise<AxiosResponse> {
	const headers: Record<string, string | number> = { ...(uploadOptions.headers ?? {}) }
	const onUploadProgress = uploadOptions.onUploadProgress ?? (() => {})
	const onUploadRetry = uploadOptions.onUploadRetry ?? (() => {})
	const retries = uploadOptions.retries ?? 5

	let data: Blob

	// If the upload data is already a Blob, use it directly.
	// Otherwise resolve it lazily when the upload starts.
	if (uploadData instanceof Blob) {
		data = uploadData
	} else {
		data = await uploadData()
	}

	// Help the server decide what to do with the uploaded file afterwards
	// (for example, when finalizing a chunked upload).
	if (uploadOptions.destinationFile) {
		headers['Destination'] = uploadOptions.destinationFile
	}

	// Default to binary data if no content type was provided.
	if (!headers['Content-Type']) {
		headers['Content-Type'] = 'application/octet-stream'
	}

	return await axios.request({
		method: 'PUT',
		url,
		data,
		signal: uploadOptions.signal,
		onUploadProgress,
		headers,
		'axios-retry': {
			retries,
			retryDelay: (retryCount: number, error: AxiosError) =>
				exponentialDelay(retryCount, error, 1000),
			retryCondition(error: AxiosError): boolean {
				const status = error.status

				// Insufficient storage is permanent, so do not retry.
				if (status === 507) {
					return false
				}

				// Locked is often temporary, for example due to preview generation.
				if (status === 423) {
					return true
				}

				// Otherwise fall back to the default retry behavior.
				return isNetworkOrIdempotentRequestError(error)
			},
			onRetry: onUploadRetry,
		},
	})
}

/**
 * Get a file chunk.
 *
 * Creating chunk blobs on demand improves performance and garbage collection.
 *
 * @param file File to upload.
 * @@param start Offset at which to start the chunk.
 * @param length Size of the chunk.
 */
export const getChunk = function(file: File, start: number, length: number): Promise<Blob> {
	const endOffset = start + length
	const isWholeFile = start === 0 && file.size <= length
	const contentType = isWholeFile ? (file.type || 'application/octet-stream') : 'application/octet-stream'

	if (isWholeFile) {
		return Promise.resolve(new Blob([file], { type: contentType }))
	}

	return Promise.resolve(new Blob([file.slice(start, endOffset)], { type: contentType }))
}

/**
 * Create a temporary server-side upload workspace for chunk uploads.
 *
 * @param destinationFile Final file name when the chunked upload is completed.
 * @param retries Number of retry attempts.
 * @param isPublic Whether the upload is for a public share.
 * @param customHeaders Additional headers used when creating the workspace (for example `X-NC-Nickname` for file drops).
 */
export const initChunkWorkspace = async function(
	destinationFile?: string,
	retries: number = 5,
	isPublic: boolean = false,
	customHeaders: Record<string, string> = {},
): Promise<string> {
	let chunksWorkspace: string

	if (isPublic) {
		chunksWorkspace = `${getBaseUrl()}/public.php/dav/uploads/${getSharingToken()}`
	} else {
		chunksWorkspace = generateRemoteUrl(`dav/uploads/${getCurrentUser()?.uid}`)
	}

	const hash = [...Array(16)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
	const tempWorkspace = `web-file-upload-${hash}`
	const url = `${chunksWorkspace}/${tempWorkspace}`
	const headers = { ...customHeaders }

	if (destinationFile) {
		headers['Destination'] = destinationFile
	}

	await axios.request({
		method: 'MKCOL',
		url,
		headers,
		'axios-retry': {
			retries,
			retryDelay: (retryCount: number, error: AxiosError) =>
				exponentialDelay(retryCount, error, 1000),
		},
	})

	logger.debug('Created temporary upload workspace', { url })

	return url
}
