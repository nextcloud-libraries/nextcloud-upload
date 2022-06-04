import { getChunk } from '../../lib/utils/upload'

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
