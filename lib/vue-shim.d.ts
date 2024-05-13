declare module '*.vue' {
	import type { Component } from 'vue'
	const component: Component
	export default component
}

declare module '@nextcloud/vue/dist/Components/*.js' {
	import type { Component } from 'vue'
	const component: Component
	export default component
}
