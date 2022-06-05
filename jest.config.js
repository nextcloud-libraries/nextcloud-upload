module.exports = {
	clearMocks: true,
	testEnvironment: 'jsdom',
	preset: 'ts-jest/presets/js-with-ts',
	globals: {
		'ts-jest': {
			tsconfig: '__tests__/tsconfig.json',
		},
	},
	transformIgnorePatterns: [
		'node_modules/(?!(p-limit|yocto-queue)/)',
	],
}
