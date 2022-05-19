import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import styles from 'rollup-plugin-styles'
import typescript from '@rollup/plugin-typescript'
import vue from 'rollup-plugin-vue2';

const external = [
	'@nextcloud/auth',
	'@nextcloud/axios',
	'@nextcloud/logger',
	'@nextcloud/router',
	'axios',
	'buffer',
	'crypto-browserify',
	'p-cancelable',
	'p-limit',
]

export default [
	{
		input: './lib/index.ts',
		external,
		plugins: [
			nodeResolve(),
			vue(),
			typescript({
				tsconfig: './tsconfig.json',
				compilerOptions: { target: 'es5' },
			}),
			commonjs(),
			styles(),
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
		plugins: [
			nodeResolve(),
			vue(),
			typescript(),
			commonjs(),
			styles(),
		],
		output: [
			{
				file: 'dist/index.esm.js',
				format: 'esm',
				sourcemap: true,
			},
		],
	},
]
