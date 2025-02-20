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
Cypress.Commands.add('mount', (component, options = {}) => {
	// Setup options object
	options.extensions = options.extensions || {}
	options.extensions.plugins = options.extensions.plugins || []
	options.extensions.components = options.extensions.components || {}

	return mount(component, options)
})
