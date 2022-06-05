import { getChunk, initChunkWorkspace } from '../../lib/utils/upload'
import axios from '@nextcloud/axios';

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
		jest.spyOn(axios, 'request')
		const url = await initChunkWorkspace()

		expect(url.startsWith('https://cloud.domain.com/remote.php/dav/uploads/test/web-file-upload-')).toBe(true)
		expect(url.length).toEqual('https://cloud.domain.com/remote.php/dav/uploads/test/web-file-upload-3ec6b932e672fd7c1d8430b0f8457b07'.length)

		expect(axios.request).toHaveBeenCalledTimes(1)
		expect(axios.request).toHaveBeenCalledWith({
			method: 'MKCOL',
			url,
		})
	})
})
