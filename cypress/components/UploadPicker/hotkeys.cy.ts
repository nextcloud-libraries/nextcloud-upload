/* eslint-disable no-unused-expressions */
/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// dist file might not be built when running eslint only
// eslint-disable-next-line import/no-unresolved,n/no-missing-import
import { Folder, Permission, addNewFileMenuEntry, type Entry } from '@nextcloud/files'
import { generateRemoteUrl } from '@nextcloud/router'
import { UploadPicker } from '../../../lib/index.ts'

describe('UploadPicker: hotkeys testing', () => {
	const propsData = {
		content: () => [],
		destination: new Folder({
			id: 56,
			owner: 'user',
			source: generateRemoteUrl('dav/files/user/Folder'),
			permissions: Permission.ALL,
			root: '/files/user',
		}),
	}

	before(() => {
		addNewFileMenuEntry({
			id: 'test',
			displayName: 'Test',
			iconSvgInline: '<svg></svg>',
			handler: (...args) => console.debug(args),
		} as Entry)
	})

	it('opens the upload menu when pressing shift+u', () => {
		cy.mount(UploadPicker, { propsData })

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')

		cy.get('[role="menu"]').should('not.exist')

		cy.get('body').type('{shift}u')
		cy.get('[role="menu"]').should('be.visible')
	})

	it('opens the upload menu when pressing shift+u on a Latin keyboard layout', () => {
		cy.mount(UploadPicker, { propsData })

		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').should('exist')
		cy.get('[role="menu"]').should('not.exist')

		cy.get('body').trigger('keydown', { key: 'U', code: 'KeyU', shiftKey: true, eventConstructor: 'KeyboardEvent' })
		cy.get('[role="menu"]').should('be.visible')
	})

	it('opens the upload menu when pressing shift+u on a non-Latin keyboard layout', () => {
		cy.mount(UploadPicker, { propsData })

		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').should('exist')
		cy.get('[role="menu"]').should('not.exist')

		// Russian layout: the physical "U" key produces "Г"
		cy.get('body').trigger('keydown', { key: 'Г', code: 'KeyU', shiftKey: true, eventConstructor: 'KeyboardEvent' })
		cy.get('[role="menu"]').should('be.visible')
	})

	it('closes the upload menu when pressing escape', () => {
		cy.mount(UploadPicker, { propsData })
			.then(({ component }) => {
				// force the menu to be opened
				component.openedMenu = true
			})

		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')

		cy.get('[role="menu"]').should('be.visible')

		cy.get('body').type('{esc}')
		cy.get('[role="menu"]').should('not.be.visible')
	})
})
