/**
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { createLibConfig } from '@nextcloud/vite-config'
import { translations } from './build/translations.ts'


export default createLibConfig({
	index: 'lib/index.ts',
}, {
	libraryFormats: process.env.BUILD_STEP === 'CJS' ? ['cjs'] : ['es'],
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
	DtsPluginOptions: process.env.BUILD_STEP === 'CJS' ? false : {
		vue: true,
		parallel: false,
	},
	config: {
		build: {
			emptyOutDir: process.env.BUILD_STEP !== 'CJS',
		}
	}
})
