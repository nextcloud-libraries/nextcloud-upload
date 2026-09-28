/**
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createLibConfig } from '@nextcloud/vite-config'
import { translations } from './build/translations'
import { defineConfig } from 'vitest/config'

export default createLibConfig({
	index: 'lib/index.ts',
}, {
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
	DtsPluginOptions: false,
	config: defineConfig({
		test: {
			environment: 'jsdom',
			environmentOptions: {
				jsdom: {
					url: 'https://cloud.example.com/index.php/apps/test',
				},
			},
			setupFiles: '__tests__/setup.ts',
			coverage: {
				include: ['lib/**'],
				// This makes no sense to test
				exclude: ['lib/utils/l10n.ts'],
				reporter: ['lcov', 'text'],
			},
			pool: 'vmForks',
		},
	}),
})