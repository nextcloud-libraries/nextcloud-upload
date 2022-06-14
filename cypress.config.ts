import { defineConfig } from 'cypress'
import webpackConfig from '@nextcloud/webpack-vue-config'
import webpackRules from '@nextcloud/webpack-vue-config/rules'

// Remove babel js loader and let cypress use its own
// Babel was creating issues with the testing, we don't actually need it
// But having one babel.config.js is impacting cypress
delete webpackRules.RULE_JS
webpackConfig.module.rules = Object.values(webpackRules)

// Cypress handle its own output
delete webpackConfig.output

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
