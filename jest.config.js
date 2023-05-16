/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
	clearMocks: true,
	collectCoverageFrom: ['lib/**/*.ts'],
	testEnvironment: 'jsdom',
	preset: 'ts-jest/presets/js-with-ts-esm',
	extensionsToTreatAsEsm: ['.ts'],
	globals: {
		'ts-jest': {
			tsconfig: '__tests__/tsconfig.json',
		},
	},
	transformIgnorePatterns: [
		'node_modules/(?!(p-limit|yocto-queue)/)',
	],
}
