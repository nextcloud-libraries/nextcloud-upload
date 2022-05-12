module.exports = {
	clearMocks: true,
	collectCoverage: true,
	collectCoverageFrom: ['src/*.js'],
	coverageDirectory: 'coverage/',
	coverageReporters: ['html'],
	testEnvironment: 'jsdom',
}
