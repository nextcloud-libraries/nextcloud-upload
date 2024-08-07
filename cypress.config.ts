/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { defineConfig } from 'cypress'
import { createAppConfig } from '@nextcloud/vite-config'

const viteConfig = await createAppConfig({}, {
	inlineCSS: true,
	nodePolyfills: true,
	emptyOutputDirectory: false,
	replace: {
		__TRANSLATIONS__: '[]',
	},
})({ mode: 'development', command: 'serve' })

viteConfig.build!.rollupOptions = undefined

export default defineConfig({
	projectId: 'v24ts6',

	// faster video processing
	videoCompression: false,

	component: {
		devServer: {
			framework: 'vue',
			bundler: 'vite',
			viteConfig,
		},
	},
})
