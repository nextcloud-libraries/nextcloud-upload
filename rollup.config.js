import typescript from '@rollup/plugin-typescript'

const external = ['crypto-browserify', 'buffer', '@nextcloud/axios', '@nextcloud/router', '@nextcloud/auth', '@nextcloud/logger']

export default [
	{
		input: './lib/index.ts',
		external,
		plugins: [
			typescript({
				tsconfig: './tsconfig.json',
				compilerOptions: { target: 'es5' },
			}),
		],
		output: [
			{
				dir: 'dist',
				format: 'cjs',
				sourcemap: true,
			},
		],
	},
	{
		input: 'lib/index.ts',
		external,
		plugins: [typescript()],
		output: [
			{
				file: 'dist/index.esm.js',
				format: 'esm',
				sourcemap: true,
			},
		],
	},
]
