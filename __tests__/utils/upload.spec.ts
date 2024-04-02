import { beforeAll, afterAll, describe, expect, test, vi } from 'vitest'
import axios from '@nextcloud/axios'

import { getChunk, initChunkWorkspace, uploadData } from '../../lib/utils/upload.js'

const axiosMock: vi.Mock<typeof axios> | typeof axios = axios

beforeAll(() => {
	vi.mock('axios', vi.fn())
})
afterAll(() => {
	vi.unmock('axios')
})

describe('Get chunk from file', () => {
	test('Chunking a valid file', async () => {
		const blob = new Blob([new ArrayBuffer(5 * 1024 * 1024)])
		const file = new File([blob as BlobPart], 'image.jpg', {
			type: 'image/jpeg',
			lastModified: new Date().getTime(),
		})

		const chunk = await getChunk(file, 0, 10 * 1024 * 1024)
		expect(chunk.size).toBe(5 * 1024 * 1024)
	})

	test('Chunking a valid big file', async () => {
		const blob = new Blob([new ArrayBuffer(50 * 1024 * 1024)])
		const file = new File([blob as BlobPart], 'image.jpg', {
			type: 'image/jpeg',
			lastModified: new Date().getTime(),
		})

		const chunk = await getChunk(file, 0, 10 * 1024 * 1024)
		expect(chunk.size).toBe(10 * 1024 * 1024)
	})

	test('Requesting a chunk bigger than the file', async () => {
		const blob = new Blob([new ArrayBuffer(5 * 1024 * 1024)])
		const file = new File([blob as BlobPart], 'image.jpg', { type: 'image/jpeg' })

		const chunk = await getChunk(file, 0, 10 * 1024 * 1024)
		expect(chunk.size).toBe(5 * 1024 * 1024)
		expect(chunk.type).toBe('image/jpeg')

	})

	test('Chunking an unknown file', async () => {
		const blob = new Blob([new ArrayBuffer(5 * 1024 * 1024)])
		const file = new File([blob as BlobPart], 'image.jpg', { })

		const chunk = await getChunk(file, 0, 10 * 1024 * 1024)
		expect(chunk.size).toBe(5 * 1024 * 1024)
		expect(chunk.type).toBe('application/octet-stream')

	})
})

describe('Initialize chunks upload temporary workspace', () => {
	test('Init random workspace', async () => {
		axiosMock.request = vi.fn((config: any) => Promise.resolve(config?.onUploadProgress?.()))

		// mock the current location for our assert on the URL
		Object.defineProperty(window, 'location', {
			value: new URL('https://cloud.domain.com/index.php/apps/test'),
			configurable: true,
		})

		// mock the current user
		document.head.setAttribute('data-user', 'test')

		const url = await initChunkWorkspace()

		expect(url).toMatch('https://cloud.domain.com/remote.php/dav/uploads/test/web-file-upload-')
		expect(url.length).toEqual('https://cloud.domain.com/remote.php/dav/uploads/test/web-file-upload-123456789abcdefg'.length)

		expect(axiosMock.request).toHaveBeenCalledTimes(1)
		expect(axiosMock.request).toHaveBeenCalledWith({
			method: 'MKCOL',
			url,
		})
	})

	test('Init random workspace for file destination', async () => {
		axiosMock.request = vi.fn((config: any) => Promise.resolve(config?.onUploadProgress?.()))

		// mock the current location for our assert on the URL
		Object.defineProperty(window, 'location', {
			value: new URL('https://cloud.domain.com/index.php/apps/test'),
			configurable: true,
		})

		// mock the current user
		document.head.setAttribute('data-user', 'test')

		const url = await initChunkWorkspace('https://cloud.domain.com/remote.php/dav/files/test/image.jpg')

		expect(url).toMatch('https://cloud.domain.com/remote.php/dav/uploads/test/web-file-upload-')
		expect(url.length).toEqual('https://cloud.domain.com/remote.php/dav/uploads/test/web-file-upload-123456789abcdefg'.length)

		expect(axiosMock.request).toHaveBeenCalledTimes(1)
		expect(axiosMock.request).toHaveBeenCalledWith({
			method: 'MKCOL',
			url,
			headers: {
				Destination: 'https://cloud.domain.com/remote.php/dav/files/test/image.jpg',
			},
		})
	})
})

describe('Upload data', () => {
	test('Upload data stream', async () => {
		axiosMock.request = vi.fn((config: any) => Promise.resolve(config?.onUploadProgress()))

		const url = 'https://cloud.domain.com/remote.php/dav/files/test/image.jpg'
		const blob = new Blob([new ArrayBuffer(50 * 1024 * 1024)])
		const signal = new AbortController().signal
		const onUploadProgress = vi.fn()
		await uploadData(url, blob, signal, onUploadProgress)

		expect(onUploadProgress).toHaveBeenCalledTimes(1)
		expect(axiosMock.request).toHaveBeenCalledTimes(1)
		expect(axiosMock.request).toHaveBeenCalledWith({
			method: 'PUT',
			url,
			data: blob,
			signal,
			onUploadProgress,
			headers: {
				'Content-Type': 'application/octet-stream',
			},
		})
	})
	test('Upload async data stream', async () => {
		axiosMock.request = vi.fn((config: any) => Promise.resolve(config?.onUploadProgress()))

		const url = 'https://cloud.domain.com/remote.php/dav/files/test/image.jpg'
		const blob = new Blob([new ArrayBuffer(50 * 1024 * 1024)])
		const data = vi.fn(async () => blob)
		const signal = new AbortController().signal
		const onUploadProgress = vi.fn()

		await uploadData(url, data, signal, onUploadProgress)

		expect(onUploadProgress).toHaveBeenCalledTimes(1)
		expect(axiosMock.request).toHaveBeenCalledTimes(1)
		expect(data).toHaveBeenCalledTimes(1)
		expect(axiosMock.request).toHaveBeenCalledWith({
			method: 'PUT',
			url,
			data: blob,
			signal,
			onUploadProgress,
			headers: {
				'Content-Type': 'application/octet-stream',
			},
		})
	})

	test('Upload data stream with destination', async () => {
		axiosMock.request = vi.fn((config: any) => Promise.resolve(config?.onUploadProgress()))

		const url = 'https://cloud.domain.com/remote.php/dav/files/test/image.jpg'
		const blob = new Blob([new ArrayBuffer(50 * 1024 * 1024)])
		const signal = new AbortController().signal
		const onUploadProgress = vi.fn()
		await uploadData(url, blob, signal, onUploadProgress, url)

		expect(onUploadProgress).toHaveBeenCalledTimes(1)
		expect(axiosMock.request).toHaveBeenCalledTimes(1)
		expect(axiosMock.request).toHaveBeenCalledWith({
			method: 'PUT',
			url,
			data: blob,
			signal,
			onUploadProgress,
			headers: {
				Destination: url,
				'Content-Type': 'application/octet-stream',
			},
		})
	})

	test('Upload cancellation', async () => {
		axiosMock.request = vi.fn((config: any) => Promise.resolve(config?.onUploadProgress()))

		const url = 'https://cloud.domain.com/remote.php/dav/files/test/image.jpg'
		const blob = new Blob([new ArrayBuffer(50 * 1024 * 1024)])
		const data = vi.fn(async () => blob)
		const controller = new AbortController()
		const onUploadProgress = vi.fn()
		vi.spyOn(controller, 'abort')

		// Cancel after 200ms
		setTimeout(() => controller.abort(), 400)
		try {
			await uploadData(url, data, controller.signal, onUploadProgress)
		} catch (error) {
			expect(onUploadProgress).toHaveBeenCalledTimes(1)
			expect(axiosMock.request).toHaveBeenCalledTimes(1)
			expect(controller.abort).toHaveBeenCalledTimes(1)
			expect((error as Error).name).toBe('AbortError')
		}
	})
})
