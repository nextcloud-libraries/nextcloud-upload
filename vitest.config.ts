import config from './vite.config'

export default async (env) => {
	const cfg = await config(env)
	// Node externals does not work with vitest
	cfg.plugins = cfg.plugins!.filter((plugin) => plugin && plugin.name !== 'node-externals')

	cfg.test = {
		environment: 'jsdom',
		coverage: {
			include: ['lib/**'],
			exclude: ['lib/utils/logger.ts'],
			provider: 'istanbul',
			reporter: ['lcov', 'text'],
		},
	}
	return cfg
}
