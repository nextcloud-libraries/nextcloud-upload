/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
import 'cypress-file-upload';

import { mount } from '@cypress/vue'

Cypress.Commands.add('mount', (component, optionsOrProps = {}) => {
	mount(component, optionsOrProps)
})