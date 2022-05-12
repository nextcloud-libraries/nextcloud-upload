const Upload = require('../lib/upload.js')

jest.mock('fs')
jest.mock('axios')

describe('upload', () => {
	beforeEach(() => {
		require('fs').reset()
		require('@nextcloud/axios').reset()
	})

	test('upload successful', () => {
		const uploader = new Upload(
			'https://remoteurl',
			'foospace',
			'foo',
			'bar'
		)

		return uploader
			.uploadFile('/foobar.jpg', '/foo/bar/baz.jpg', 100, 1)
			.then((e) => {
				expect(require('@nextcloud/axios').__mkcolCnt).toBe(1)
				expect(require('@nextcloud/axios').__putCnt).toBe(4)
				expect(require('@nextcloud/axios').__moveCnt).toBe(1)

				expect(e.chunkNo).toBe(4)
				expect(e.complete).toBeTruthy()
			})
			.catch((e) => fail(e))
	})

	test('read from stream fails', () => {
		require('fs').__failing = true

		const uploader = new Upload(
			'https://remoteurl',
			'foospace',
			'foo',
			'bar'
		)

		return uploader
			.uploadFile('/foobar.jpg', '/foo/bar/baz.jpg', 100, 1)
			.catch((e) => {
				expect(require('@nextcloud/axios').__mkcolCnt).toBe(1)
				expect(require('@nextcloud/axios').__putCnt).toBe(0)
				expect(require('@nextcloud/axios').__moveCnt).toBe(0)

				expect(e.chunkNo).toBe(0)
				expect(e.success).toBeFalsy()
			})
	})

	test('mkcol fails', () => {
		const uploader = new Upload(
			'https://remoteurl',
			'foospace',
			'foo',
			'bar'
		)

		require('@nextcloud/axios').__failingMethod = 'mkcol'

		return uploader
			.uploadFile('/foobar.jpg', '/foo/bar/baz.jpg', 100, 1)
			.catch((e) => {
				expect(require('@nextcloud/axios').__mkcolCnt).toBe(1)
				expect(require('@nextcloud/axios').__putCnt).toBe(0)
				expect(require('@nextcloud/axios').__moveCnt).toBe(0)

				expect(e.chunkNo).toBeNull()
				expect(e.success).toBeFalsy()
			})
	})

	test('put fails, retries also fail', () => {
		const uploader = new Upload(
			'https://remoteurl',
			'foospace',
			'foo',
			'bar'
		)

		require('@nextcloud/axios').__failingMethod = 'put'

		return uploader
			.uploadFile('/foobar.jpg', '/foo/bar/baz.jpg', 100, 3)
			.catch((e) => {
				expect(require('@nextcloud/axios').__mkcolCnt).toBe(1)
				expect(require('@nextcloud/axios').__putCnt).toBe(6)
				expect(require('@nextcloud/axios').__moveCnt).toBe(0)

				expect(e.chunkNo).toBe(0)
				expect(e.success).toBeFalsy()
			})
	})

	test('put fails, retries pass', () => {
		const uploader = new Upload(
			'https://remoteurl',
			'foospace',
			'foo',
			'bar'
		)

		require('@nextcloud/axios').__failingMethod = 'put'
		require('@nextcloud/axios').__retriesTillPass = 2

		return uploader
			.uploadFile('/foobar.jpg', '/foo/bar/baz.jpg', 100, 3)
			.then((e) => {
				expect(require('@nextcloud/axios').__mkcolCnt).toBe(1)
				expect(require('@nextcloud/axios').__putCnt).toBe(7)
				expect(require('@nextcloud/axios').__moveCnt).toBe(1)

				expect(e.chunkNo).toBe(4)
				expect(e.success).toBeFalsy()
			})
	})

	test('move fails', () => {
		const uploader = new Upload(
			'https://remoteurl',
			'foospace',
			'foo',
			'bar'
		)

		require('@nextcloud/axios').__failingMethod = 'move'

		return uploader
			.uploadFile('/foobar.jpg', '/foo/bar/baz.jpg', 100, 3)
			.catch((e) => {
				expect(require('@nextcloud/axios').__mkcolCnt).toBe(1)
				expect(require('@nextcloud/axios').__putCnt).toBe(4)
				expect(require('@nextcloud/axios').__moveCnt).toBe(1)

				expect(e.chunkNo).toBe(4)
				expect(e.success).toBeFalsy()
			})
	})
})
