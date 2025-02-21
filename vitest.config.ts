/**
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { UserConfig } from 'vitest/node'
import config from './vite.config.ts'

export default async (env) => {
	return {
		...await config(env),
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
		} as UserConfig,
	}
}
