const Event = require('../lib/event.js')

describe('event', () => {
	test('toString with message', () => {
		const str = new Event('filename', 42, 'Foo bar baz', true).toString()

		expect(str).toMatch(/filename/)
		expect(str).toMatch(/42/)
		expect(str).toMatch(/Foo bar baz/)
		expect(str).toMatch(/true/)
	});

	test('toString without message', () => {
		const str = new Event('filename', 42, undefined, true).toString()

		expect(str).toMatch(/filename/)
		expect(str).toMatch(/42/)
		expect(str).toMatch(/No message/)
		expect(str).toMatch(/true/)
	})
})
