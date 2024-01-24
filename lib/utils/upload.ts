import type { AxiosResponse } from 'axios'
import { generateRemoteUrl } from '@nextcloud/router'
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import PLimit from 'p-limit'

const readerLimit = PLimit(1)
const reader = new FileReader()

type UploadData = Blob | (() => Promise<Blob>)

/**
 * Upload some data to a given path
 * @param url the url to upload to
 * @param uploadData the data to upload
 * @param signal the abort signal
 * @param onUploadProgress the progress callback
 * @param destinationFile the final destination file (often used for chunked uploads)
 * @param headers additional headers
 */
export const uploadData = async function(
	url: string,
	uploadData: UploadData,
	signal: AbortSignal,
	onUploadProgress = () => {},
	destinationFile: string | undefined = undefined,
	headers: Record<string, string|number> = {},
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
	})
}

/**
 * Get chunk of the file. Doing this on the fly
 * give us a big performance boost and proper
 * garbage collection
 */
export const getChunk = function(file: File, start: number, length: number): Promise<Blob> {
	if (start === 0 && file.size <= length) {
		return Promise.resolve(new Blob([file], { type: file.type || 'application/octet-stream' }))
	}

	// Since we use a global FileReader, we need to only read one chunk at a time
	return readerLimit(() => new Promise((resolve, reject) => {
		reader.onload = () => {
			if (reader.result !== null) {
				resolve(new Blob([reader.result], {
					type: 'application/octet-stream',
				}))
			}
			reject(new Error('Error while reading the file'))
		}
		reader.readAsArrayBuffer(file.slice(start, start + length))
	}))
}

/**
 * Create a temporary upload workspace to upload the chunks to
 */
export const initChunkWorkspace = async function(destinationFile: string | undefined = undefined): Promise<string> {
	const chunksWorkspace = generateRemoteUrl(`dav/uploads/${getCurrentUser()?.uid}`)
	const hash = [...Array(16)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
	const tempWorkspace = `web-file-upload-${hash}`
	const url = `${chunksWorkspace}/${tempWorkspace}`
	const headers = destinationFile ? { Destination: destinationFile } : undefined

	await axios.request({
		method: 'MKCOL',
		url,
		headers,
	})

	return url
}
