// Making sure we're forcing the development mode
process.env.NODE_ENV = 'development'

import { defineConfig } from 'cypress'
import webpackConfig from '@nextcloud/webpack-vue-config'
import webpackRules from '@nextcloud/webpack-vue-config/rules'

webpackRules.RULE_TS = {
	test: /\.ts$/,
	use: [{
		loader: 'ts-loader',
		options: {
			// skip typechecking for speed
			transpileOnly: true,
		},
	}],
}
webpackConfig.module.rules = Object.values(webpackRules)

// Cypress handle its own output
delete webpackConfig.output
webpackConfig.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx', '.cjs', '.vue']

export default defineConfig({
	projectId: 'v24ts6',

	component: {
		devServer: {
			framework: 'vue',
			bundler: 'webpack',
			webpackConfig,
		},
	},
})
