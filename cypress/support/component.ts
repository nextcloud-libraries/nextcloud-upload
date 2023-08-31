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

import './commands'

import { mount } from 'cypress/vue2'

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
	const oldMounted = component?.mounted || false

	// Override the mounted method to expose
	// the component instance to cypress
	if (component) {
		component.mounted = function() {
			instance = this
			if (oldMounted) {
				oldMounted()
			}
		}
	}

	// Expose the component with cy.get('@component')
	return mount(component, optionsOrProps).then(() => {
		return cy.wrap(instance).as('component')
	})
})
