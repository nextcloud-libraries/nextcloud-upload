/**
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { UserConfig } from 'vitest/node'
import config from './vite.config.ts'

export default async (env) => {
	const cfg = await config(env)
	// Node externals does not work with vitest
	cfg.plugins = cfg.plugins!.filter((plugin) => plugin && 'name' in plugin && plugin.name !== 'node-externals')

	cfg.test = {
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
	} as UserConfig
	return cfg
}
