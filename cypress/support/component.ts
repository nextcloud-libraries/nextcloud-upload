// ***********************************************************
// This example support/component.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-this-alias */

import './commands'

import { mount } from '@cypress/vue'

// Augment the Cypress namespace to include type definitions for
// your custom command.
// Alternatively, can be defined in cypress/support/component.d.ts
// with a <reference path="./component" /> at the top of your spec.
declare global {
	namespace Cypress {
		interface Chainable {
			mount: typeof mount
		}
	}
}

// Example use:
// cy.mount(MyComponent)
Cypress.Commands.add('mount', (component, optionsOrProps) => {
	let instance = null

	// Add our mounted method to expose the component instance to cypress

	// Support old vue 2 options
	if (component.options) {
		if (!component.options.mounted) {
			component.options.mounted = []
		}
		component.options.mounted.push(function() {
			instance = this
		})
	}

	// Support new vue 3 options
	if (typeof component?.mounted !== 'function') {
		component.mounted = function() {
			instance = this
		}
	} else {
		// If the component already has a mounted method, we need to chain them
		const originalMounted = component.mounted
		component.mounted = function() {
			originalMounted.call(this)
			instance = this
		}
	}

	// Expose the component with cy.get('@component')
	return mount(component, optionsOrProps).then(() => {
		return cy.wrap(instance).as('component')
	})
})
