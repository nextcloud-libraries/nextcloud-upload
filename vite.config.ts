/**
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { createLibConfig } from '@nextcloud/vite-config'
import { codecovVitePlugin } from '@codecov/vite-plugin'

import { readdirSync, readFileSync } from 'fs'
import { po as poParser } from 'gettext-parser'
// eslint-disable-next-line n/no-extraneous-import
import { defineConfig, type UserConfigFn } from 'vite'

const translations = readdirSync('./l10n')
	.filter(name => name !== 'messages.pot' && name.endsWith('.pot'))
	.map(file => {
		const path = './l10n/' + file
		const locale = file.slice(0, -'.pot'.length)

		const po = readFileSync(path)
		const json = poParser.parse(po)
		return {
			locale,
			json,
		}
	})

export default defineConfig((env) => {
	return createLibConfig({
		index: 'lib/index.ts',
		core: 'lib/core/core.ts',
		components: 'lib/components/components.ts',
		ui: 'lib/ui/ui.ts',
	}, {
		libraryFormats: ['es', 'cjs'],
		nodeExternalsOptions: {
			// for subpath imports like '@nextcloud/l10n/gettext'
			include: [/^@nextcloud\//],
			// we should externalize vue SFC dependencies
			exclude: [/^vue-material-design-icons\//],
		},
		inlineCSS: true,

		replace: {
			__TRANSLATIONS__: JSON.stringify(translations),
		},
		DTSPluginOptions: {
			rollupTypes: env.mode === 'production',
		},

		config: {
			plugins: [
				// Put the Codecov vite plugin after all other plugins
				codecovVitePlugin({
					enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
					bundleName: '@nextcloud/upload',
					uploadToken: process.env.CODECOV_TOKEN,
				}),
			],
		},
	})(env)
}) as UserConfigFn
