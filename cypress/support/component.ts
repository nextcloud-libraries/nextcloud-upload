/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
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

// Ensure Cypress' browser has same polyfills as server
// eslint-disable-next-line n/no-extraneous-import
import 'core-js/stable/index.js'

import { mount } from '@cypress/vue2'

// @ts-expect-error Mock window so this is an internal property
window._oc_capabilities = { files: {} }

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
	const mounted = mount(component, optionsOrProps).then(() => {
		cy.wrap(instance).as('component')
		return mounted
	})
})
