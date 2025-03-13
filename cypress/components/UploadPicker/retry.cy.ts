/**
 * SPDX-FileCopyrightText: 2025 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Folder, Permission } from '@nextcloud/files'
import { getUploader, UploadPicker } from '../../../lib/index.ts'
import { generateRemoteUrl } from '@nextcloud/router'

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

describe('UploadPicker: retry requests', () => {

	beforeEach(() => {
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

		getUploader(false, true).pause()

		// Mount picker
		cy.mount(UploadPicker, {
			propsData,
		}).as('uploadPicker')

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')
	})

	afterEach(() => resetDocument())

	const testCases: [string, Parameters<Cypress.Chainable['intercept']>[2], number][] = [
		['retries on network error', { forceNetworkError: true }, 2],
		['retries on timeout', { statusCode: 504 }, 2],
		['retries when locked', { statusCode: 423 }, 2],
		['does not retry when insufficient storage', { statusCode: 507 }, 1],
	]
	for (const [testCase, response, requests] of testCases) {
		it(testCase, () => {
			let request = 0
			cy.intercept('PUT', '/remote.php/dav/files/user/file.txt', (rq) => {
				if (request++ === 0) {
					rq.reply(response)
				} else {
					rq.reply({ statusCode: 201 })
				}
			}).as('uploadRequest')

			// Start upload
			cy.get('@input')
				.attachFile({
					fileContent: new Blob([new ArrayBuffer(256 * 1024)]),
					fileName: 'file.txt',
					mimeType: 'text/plain',
				})
				.then(() => getUploader().start())

			cy.wait('@uploadRequest')

			// wait finished
			cy.get('[data-cy-upload-picker] .upload-picker__progress')
				.as('progress')
				.should('not.be.visible')

			cy.get('@uploadRequest.all')
				.should('have.length', requests)
		})
	}
})
