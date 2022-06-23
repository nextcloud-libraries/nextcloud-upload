import { nodeResolve } from '@rollup/plugin-node-resolve'
import clean from '@rollup-extras/plugin-clean'
import commonjs from '@rollup/plugin-commonjs'
import fs from 'fs'
import gettextParser from 'gettext-parser'
import injectProcessEnv from 'rollup-plugin-inject-process-env'
import styles from 'rollup-plugin-styles'
import typescript from '@rollup/plugin-typescript'
import vue from 'rollup-plugin-vue2'

const external = [
	'@nextcloud/auth',
	'@nextcloud/axios',
	'@nextcloud/files',
	'@nextcloud/logger',
	'@nextcloud/router',
	'@nextcloud/vue',
	'@skjnldsv/sanitize-svg',
	'axios',
	'buffer',
	'crypto-browserify',
	'p-cancelable',
	'p-limit',
	'p-queue',
	'vue-material-design-icons',
]

const translations = fs
	.readdirSync('./l10n')
	.filter(name => name !== 'messages.pot' && name.endsWith('.pot'))
	.map(file => {
		const path = './l10n/' + file
		const locale = file.slice(0, -'.pot'.length)

		const po = fs.readFileSync(path)
		const json = gettextParser.po.parse(po)
		return {
			locale,
			json,
		}
	})

const config = output => ({
	input: './lib/index.ts',
	external,
	plugins: [
		nodeResolve(),
		vue(),
		typescript({
			compilerOptions: output.format === 'cjs'
				? { target: 'es5' }
				: {},
		}),
		commonjs(),
		styles(),
		injectProcessEnv({
			TRANSLATIONS: translations,
		}),
		clean(),
	],
	output: [output],
})

export default [
	{
		dir: 'dist',
		format: 'cjs',
		sourcemap: true,
	},
	{
		file: 'dist/index.esm.js',
		format: 'esm',
		sourcemap: true,
	},
].map(config)
