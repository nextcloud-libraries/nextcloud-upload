import { getChunk, initChunkWorkspace, uploadData } from '../../lib/utils/upload.js'
import axios from '@nextcloud/axios';
import { jest } from '@jest/globals'

const axiosMock: jest.Mock<typeof axios> | typeof axios = axios

beforeAll(() => {
	jest.mock("axios", jest.fn())
})
afterAll(() => {
	jest.unmock("axios")
})


describe('Get chunk from file', () => {
	test('Chunking a valid file', async () => {
		const blob = new Blob([new ArrayBuffer(5 * 1024 * 1024)])
		const file = new File([blob as BlobPart], 'image.jpg', {
			type: 'image/jpeg',
			lastModified:new Date().getTime()
		})

		const chunk = await getChunk(file, 0, 10 * 1024 * 1024)
		expect(chunk.size).toBe(5 * 1024 * 1024)
	})

	test('Chunking a valid big file', async () => {
		const blob = new Blob([new ArrayBuffer(50 * 1024 * 1024)])
		const file = new File([blob as BlobPart], 'image.jpg', {
			type: 'image/jpeg',
			lastModified:new Date().getTime()
		})

		const chunk = await getChunk(file, 0, 10 * 1024 * 1024)
		expect(chunk.size).toBe(10 * 1024 * 1024)
	})

	test('Chunking an invalid file', () => {
		const blob = new Blob([new ArrayBuffer(5 * 1024 * 1024)])
		const file = new File([blob as BlobPart], 'image.jpg')

		expect(getChunk(file, 0, 10 * 1024 * 1024)).rejects.toEqual(new Error('Unknown file type'))
	})
})

describe('Initialize chunks upload temporary workspace', () => {
	test('Init random workspace', async () => {
		axiosMock.request = jest.fn((config: any) => Promise.resolve(config?.onUploadProgress?.()))

		// mock the current location for our assert on the URL
		Object.defineProperty(window, "location", {
			value: new URL("https://cloud.domain.com"),
			configurable: true,
		});

		// mock the current user
		document.head.setAttribute('data-user', 'test')

		const url = await initChunkWorkspace()
		
		expect(url.startsWith('https://cloud.domain.com/remote.php/dav/uploads/test/web-file-upload-')).toBe(true)
		expect(url.length).toEqual('https://cloud.domain.com/remote.php/dav/uploads/test/web-file-upload-3ec6b932e672fd7c1d8430b0f8457b07'.length)

		expect(axiosMock.request).toHaveBeenCalledTimes(1)
		expect(axiosMock.request).toHaveBeenCalledWith({
			method: 'MKCOL',
			url,
		})
	})
})

describe('Upload data', () => {
	test('Upload data stream', async () => {
		axiosMock.request = jest.fn((config: any) => Promise.resolve(config?.onUploadProgress()))

		const url = 'https://cloud.domain.com/remote.php/dav/files/test/image.jpg'
		const blob = new Blob([new ArrayBuffer(50 * 1024 * 1024)])
		const signal =  new AbortController().signal
		const onUploadProgress = jest.fn()
		await uploadData(url, blob, signal, onUploadProgress)

		expect(onUploadProgress).toHaveBeenCalledTimes(1)
		expect(axiosMock.request).toHaveBeenCalledTimes(1)
		expect(axiosMock.request).toHaveBeenCalledWith({
			method: 'PUT',
			url,
			data: blob,
			signal,
			onUploadProgress,
		})
	})
	test('Upload async data stream', async () => {
		axiosMock.request = jest.fn((config: any) => Promise.resolve(config?.onUploadProgress()))

		const url = 'https://cloud.domain.com/remote.php/dav/files/test/image.jpg'
		const blob = new Blob([new ArrayBuffer(50 * 1024 * 1024)])
		const data = jest.fn(async () => blob)
		const signal =  new AbortController().signal
		const onUploadProgress = jest.fn()

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
		})
	})

	test('Upload cancellation', async () => {
		axiosMock.request = jest.fn((config: any) => Promise.resolve(config?.onUploadProgress()))

		const url = 'https://cloud.domain.com/remote.php/dav/files/test/image.jpg'
		const blob = new Blob([new ArrayBuffer(50 * 1024 * 1024)])
		const data = jest.fn(async () => blob)
		const controller =  new AbortController()
		const onUploadProgress = jest.fn()
		jest.spyOn(controller, 'abort')

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
