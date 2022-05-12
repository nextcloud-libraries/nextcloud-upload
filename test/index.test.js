/**
 * @jest-environment jsdom
 */
describe('index', () => {
	test('exports Uploader', () => {
		expect(new (require('../lib/index.js'))(
			'https://remoteurl',
			'foospace',
			'foo',
			'bar'
		)).toBeInstanceOf(require('../lib/upload.js'))
	})
})
