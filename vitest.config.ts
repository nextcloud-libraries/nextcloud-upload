import type { UserConfig } from 'vitest'
import config from './vite.config.ts'

export default async (env) => {
	const cfg = await config(env)
	// Node externals does not work with vitest
	cfg.plugins = cfg.plugins!.filter((plugin) => plugin && 'name' in plugin && plugin.name !== 'node-externals')

	cfg.test = {
		environment: 'jsdom',
		setupFiles: '__tests__/setup.ts',
		coverage: {
			include: ['lib/**'],
			// This makes no sense to test
			exclude: ['lib/utils/l10n.ts'],
			reporter: ['lcov', 'text'],
		},
		server: {
			deps: {
				inline: ['@nextcloud/files'],
			},
		},
	} as UserConfig
	return cfg
}
