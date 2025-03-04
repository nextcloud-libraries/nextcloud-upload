/**
 * SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// dist file might not be built when running eslint only
// eslint-disable-next-line import/no-unresolved,n/no-missing-import
import { Folder, Permission } from '@nextcloud/files'
import { generateRemoteUrl } from '@nextcloud/router'
import { UploadPicker, getUploader } from '../../../lib/index.ts'
import { basename } from 'path'

let state: string | undefined
before(() => {
	cy.window().then((win) => {
		state = win.document.body.innerHTML
	})
})

const resetDocument = () => {
	if (state) {
		cy.window().then((win) => {
			win.document.body.innerHTML = state!
		})
	}
}

describe('UploadPicker: invalid filenames (legacy prop)', { testIsolation: true }, () => {

	// Cypress shares the module state between tests, we need to reset it
	// ref: https://github.com/cypress-io/cypress/issues/25441
	beforeEach(() => {
		getUploader(false, true)
		// Intercept single upload
		cy.intercept('PUT', '/remote.php/dav/files/*/*', (req) => {
			req.reply({
				statusCode: 201,
				delay: 2000,
			})
		}).as('upload')
	})

	afterEach(() => resetDocument())

	it('Fails a file if forbidden character', () => {
		// Make sure we reset the destination
		// so other tests do not interfere
		const propsData = {
			destination: new Folder({
				id: 56,
				owner: 'user',
				source: generateRemoteUrl('dav/files/user'),
				permissions: Permission.ALL,
				root: '/files/user',
			}),
			forbiddenCharacters: ['$', '#', '~', '&'],
		}

		// Mount picker
		cy.mount(UploadPicker, { propsData }).as('uploadPicker')

		// Label is displayed before upload
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-add]').should('contain.text', 'New')

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')

		// Upload 2 files
		cy.get('@input').attachFile([{
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(2 * 1024 * 1024)]),
			fileName: 'invalid-image$.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		}, {
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(2 * 1024 * 1024)]),
			fileName: 'valid-image.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		}])

		cy.get('[data-cy-upload-picker] .upload-picker__progress')
			.as('progress')
			.should('not.be.visible')

		// There is the dialog for the invalid filename
		cy.contains('[role="dialog"]', 'Invalid filename')
			.should('be.visible')
			.and('contain.text', '"$" is not allowed')
		// And upload was not called yet
		cy.get('@upload.all').should('have.length', 0)
	})

	it('Can skip invalid files', () => {
		// Make sure we reset the destination
		// so other tests do not interfere
		const propsData = {
			destination: new Folder({
				id: 56,
				owner: 'user',
				source: generateRemoteUrl('dav/files/user'),
				permissions: Permission.ALL,
				root: '/files/user',
			}),
			forbiddenCharacters: ['$', '#', '~', '&'],
		}

		// Mount picker
		cy.mount(UploadPicker, { propsData }).as('uploadPicker')

		cy.wait(4000)

		// Label is displayed before upload
		cy.get('[data-cy-upload-picker]').contains('New').should('be.visible')

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')

		// Upload 2 files
		cy.get('@input').attachFile([{
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(2 * 1024 * 1024)]),
			fileName: 'invalid-image$.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		}, {
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(2 * 1024 * 1024)]),
			fileName: 'valid-image.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		}])

		// See there is the skip option
		cy.contains('[role="dialog"]', 'Invalid filename')
			.should('be.visible')
			.contains('button', 'Skip')
			.click()

		cy.wait('@upload')
		// Should have been called only once
		cy.get('@upload.all').should('have.length', 1)
	})
})

describe.only('UploadPicker: invalid filenames (server capabilities)', { testIsolation: true }, () => {

	afterEach(() => resetDocument())

	// Cypress shares the module state between tests, we need to reset it
	// ref: https://github.com/cypress-io/cypress/issues/25441
	beforeEach(() => {
		getUploader(false, true)

		// @ts-expect-error This is a private variable but we need to mock it
		window._oc_capabilities = {
			files: {
				forbidden_filenames: ['.htaccess'],
				forbidden_filename_characters: [':'],
				forbidden_filename_extensions: ['.exe'],
			},
		}

		// Intercept single upload
		cy.intercept('PUT', '/remote.php/dav/files/*/*', (req) => {
			req.reply({
				statusCode: 201,
				delay: 2000,
			})
		}).as('upload')
	})

	it('reports invalid filename for a file with forbidden character', () => {
		// Make sure we reset the destination
		// so other tests do not interfere
		const propsData = {
			destination: new Folder({
				id: 56,
				owner: 'user',
				source: generateRemoteUrl('dav/files/user'),
				permissions: Permission.ALL,
				root: '/files/user',
			}),
		}

		// Mount picker
		cy.mount(UploadPicker, { propsData }).as('uploadPicker')

		// Label is displayed before upload
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-add]').should('contain.text', 'New')

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-progress]').as('progress').should('exist')

		// Upload
		cy.get('@input').attachFile({
			fileContent: new Blob([new ArrayBuffer(1024 * 1024)]),
			fileName: 'invalid: character.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		})

		cy.get('@progress')
			.should('not.be.visible')

		cy.contains('[role="dialog"]', 'Invalid filename')
			.should('contain.text', '":" is not allowed')
			.should('be.visible')
	})

	it('reports invalid filename for a file with reserved name', () => {
		// Make sure we reset the destination
		// so other tests do not interfere
		const propsData = {
			destination: new Folder({
				id: 56,
				owner: 'user',
				source: generateRemoteUrl('dav/files/user'),
				permissions: Permission.ALL,
				root: '/files/user',
			}),
		}

		// Mount picker
		cy.mount(UploadPicker, { propsData }).as('uploadPicker')

		// Label is displayed before upload
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-add]').should('contain.text', 'New')

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-progress]').as('progress').should('exist')

		// Upload
		cy.get('@input').attachFile({
			fileContent: new Blob([new ArrayBuffer(1024 * 1024)]),
			fileName: '.htaccess',
			mimeType: 'text/plain',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		})

		cy.get('@progress')
			.should('not.be.visible')

		cy.contains('[role="dialog"]', 'Invalid filename')
			.should('contain.text', '".htaccess" is a forbidden')
			.should('be.visible')
	})

	it('reports invalid filename for a file with forbidden extension', () => {
		// Make sure we reset the destination
		// so other tests do not interfere
		const propsData = {
			destination: new Folder({
				id: 56,
				owner: 'user',
				source: generateRemoteUrl('dav/files/user'),
				permissions: Permission.ALL,
				root: '/files/user',
			}),
		}

		// Mount picker
		cy.mount(UploadPicker, { propsData }).as('uploadPicker')

		// Label is displayed before upload
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-add]').should('contain.text', 'New')

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-progress]').as('progress').should('exist')

		// Upload
		cy.get('@input').attachFile({
			fileContent: new Blob([new ArrayBuffer(1024 * 1024)]),
			fileName: 'bad.exe',
			mimeType: 'text/plain',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		})

		cy.get('@progress')
			.should('not.be.visible')

		cy.contains('[role="dialog"]', 'Invalid filename')
			.should('contain.text', '".exe" is a forbidden file type')
			.should('be.visible')
	})

	it('Can skip invalid files', () => {
		// Make sure we reset the destination
		// so other tests do not interfere
		const propsData = {
			destination: new Folder({
				id: 56,
				owner: 'user',
				source: generateRemoteUrl('dav/files/user'),
				permissions: Permission.ALL,
				root: '/files/user',
			}),
		}

		// Mount picker
		cy.mount(UploadPicker, { propsData }).as('uploadPicker')

		// Label is displayed before upload
		cy.get('[data-cy-upload-picker]').contains('New').should('be.visible')

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')

		// Upload 2 files
		cy.get('@input').attachFile([{
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(2 * 1024 * 1024)]),
			fileName: 'invalid: image.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		}, {
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(2 * 1024 * 1024)]),
			fileName: 'valid-image.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		}])

		// See there is the skip option
		cy.contains('[role="dialog"]', 'Invalid filename')
			.should('be.visible')
			.contains('button', 'Skip')
			.click()

		cy.wait('@upload')
		// Should have been called only once
		cy.get('@upload.all').should('have.length', 1)
	})

	it('Can cancel upload when encounter invalid files', () => {
		// Make sure we reset the destination
		// so other tests do not interfere
		const propsData = {
			destination: new Folder({
				id: 56,
				owner: 'user',
				source: generateRemoteUrl('dav/files/user'),
				permissions: Permission.ALL,
				root: '/files/user',
			}),
		}

		// Mount picker
		cy.mount(UploadPicker, { propsData }).as('uploadPicker')

		// Label is displayed before upload
		cy.get('[data-cy-upload-picker]').contains('New').should('be.visible')

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')

		// Upload two files
		cy.get('@input').attachFile([{
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(2 * 1024 * 1024)]),
			fileName: 'invalid: image.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		}, {
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(2 * 1024 * 1024)]),
			fileName: 'valid-image.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		}])

		cy.get('@progress')
			.should('not.be.visible')

		cy.contains('[role="dialog"]', 'Invalid filename')
			.should('be.visible')
			.contains('button', 'Cancel')
			.click()

		cy.get('@upload.all').should('have.length', 0)
	})

	it('Can rename invalid files', () => {
		// Make sure we reset the destination
		// so other tests do not interfere
		const propsData = {
			destination: new Folder({
				id: 56,
				owner: 'user',
				source: generateRemoteUrl('dav/files/user'),
				permissions: Permission.ALL,
				root: '/files/user',
			}),
		}

		// Mount picker
		cy.mount(UploadPicker, { propsData }).as('uploadPicker')

		// Label is displayed before upload
		cy.get('[data-cy-upload-picker]').contains('New').should('be.visible')

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')

		// Upload two files
		cy.get('@input').attachFile([{
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(2 * 1024 * 1024)]),
			fileName: 'invalid: image.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		}, {
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(2 * 1024 * 1024)]),
			fileName: 'valid-image.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		}])

		cy.get('[data-cy-upload-picker] .upload-picker__progress')
			.as('progress')
			.should('not.be.visible')

		cy.contains('[role="dialog"]', 'Invalid filename')
			.should('be.visible')
			.contains('button', 'Rename')
			.should('be.disabled')

		cy.contains('[role="dialog"]', 'Invalid filename')
			.find('input')
			.should('have.value', 'invalid: image.jpg')
			.type('{selectAll}now-valid.jpg')

		cy.contains('[role="dialog"]', 'Invalid filename')
			.should('be.visible')
			.contains('button', 'Rename')
			.click()

		cy.wait('@upload')
		// Should have been called two times with an valid name now
		cy.get('@upload.all').should('have.length', 2).then((array): void => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const requests = (array as unknown as any[]).map(({ request }) => basename(request.url))
			// The valid one is included
			expect(requests).to.contain('valid-image.jpg')
			// The invalid is NOT included
			expect(requests).to.not.contain('invalid: image.jpg')
			// The invalid was made valid
			expect(requests).to.contain('now-valid.jpg')
		})
	})
})
