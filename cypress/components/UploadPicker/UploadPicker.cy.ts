/* eslint-disable no-unused-expressions */
/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// dist file might not be built when running eslint only
// eslint-disable-next-line import/no-unresolved,n/no-missing-import
import { Folder, Permission, addNewFileMenuEntry, type Entry } from '@nextcloud/files'
import { generateRemoteUrl } from '@nextcloud/router'
import { UploadPicker, UploadStatus, getUploader } from '../../../lib/index.ts'

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

describe('UploadPicker rendering', () => {
	afterEach(() => resetDocument())

	it('Renders default UploadPicker', () => {
		const propsData = {
			destination: new Folder({
				id: 56,
				owner: 'user',
				source: generateRemoteUrl('dav/files/user/Folder'),
				permissions: Permission.ALL,
				root: '/files/user',
			}),
		}
		cy.mount(UploadPicker, { propsData })
		cy.get('[data-cy-upload-picker]').should('be.visible')
		cy.get('[data-cy-upload-picker]').shouldHaveTrimmedText('New')
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').should('exist')
	})

	it('Does NOT render without a destination', () => {
		cy.mount(UploadPicker)
		cy.get('[data-cy-upload-picker]').should('not.exist')
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').should('not.exist')
	})
})

describe('UploadPicker valid uploads', () => {
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

		// Mount picker
		cy.mount(UploadPicker, { propsData }).as('uploadPicker')

		// Label is displayed before upload
		cy.get('[data-cy-upload-picker]').shouldHaveTrimmedText('New')

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')
	})

	afterEach(() => resetDocument())

	it('Uploads a file', () => {
		// Intercept single upload
		cy.intercept('PUT', '/remote.php/dav/files/*/*', (req) => {
			req.reply({
				statusCode: 201,
				delay: 2000,
			})
		}).as('upload')

		cy.get('@input').attachFile({
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(2 * 1024 * 1024)]),
			fileName: 'image.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		})

		cy.get('[data-cy-upload-picker] .upload-picker__progress')
			.as('progress')
			.should('be.visible')

		// Label gets hidden during upload
		cy.get('[data-cy-upload-picker]').should('not.have.text', 'New')

		cy.wait('@upload').then(() => {
			cy.get('[data-cy-upload-picker] .upload-picker__progress')
				.as('progress')
				.should('not.be.visible')

			// Label is displayed again after upload
			cy.get('[data-cy-upload-picker] button').shouldHaveTrimmedText('New')
		})
	})
})

describe('UploadPicker valid uploads', () => {
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

		// Mount picker
		cy.mount(UploadPicker, { propsData }).as('uploadPicker')

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')
	})

	afterEach(() => resetDocument())

	it('Uploads a file with chunking', () => {
		// Init and reset chunk request spy
		const chunksRequestsSpy = cy.spy()

		// Intercept tmp upload chunks folder creation
		cy.intercept('MKCOL', '/remote.php/dav/uploads/*/web-file-upload*', {
			statusCode: 201,
		}).as('init')

		// Intercept chunks upload
		cy.intercept({
			method: 'PUT',
			url: '/remote.php/dav/uploads/*/web-file-upload*/*',
		}, (req) => {
			chunksRequestsSpy()
			req.reply({
				statusCode: 201,
			})
		}).as('chunks')

		// Intercept final assembly request
		cy.intercept('MOVE', '/remote.php/dav/uploads/*/web-file-upload*/.file', (req) => {
			req.reply({
				statusCode: 204,
				// Fake assembling chunks
				delay: 2000,
			})
		}).as('assembly')

		// Start upload
		cy.get('@input').attachFile({
			// Fake file of 256 MB
			fileContent: new Blob([new ArrayBuffer(256 * 1024 * 1024)]),
			fileName: 'photos.zip',
			mimeType: 'application/zip',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		})

		cy.wait('@init').then(() => {
			cy.get('[data-cy-upload-picker] .upload-picker__progress')
				.as('progress')
				.should('be.visible')
		})
		cy.wait('@chunks').then(() => {
			cy.get('[data-cy-upload-picker] .upload-picker__progress')
				.as('progress')
				.should('be.visible')
			cy.get('@progress')
				.children('progress')
				.should('not.have.value', '0')
		})
		cy.wait('@assembly', { timeout: 60000 }).then(() => {
			cy.get('[data-cy-upload-picker] .upload-picker__progress')
				.as('progress')
				.should('not.be.visible')
			expect(chunksRequestsSpy).to.have.always.been.callCount(26)
		})
	})

	it('Uploads a file without chunking', () => {
		// Intercept single upload
		cy.intercept('PUT', '/remote.php/dav/files/*/*', {
			statusCode: 201,
		}).as('upload')

		cy.get('@input').attachFile({
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(5 * 1024 * 1024)]),
			fileName: 'image.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		})

		cy.get('[data-cy-upload-picker] .upload-picker__progress')
			.as('progress')
			.should('not.be.visible')
		cy.wait('@upload').then(() => {
			cy.get('@progress')
				.children('progress')
				.should('not.have.value', '0')
		})
	})
})

describe('Destination management', () => {
	const propsData = {
		destination: new Folder({
			id: 56,
			owner: 'user',
			source: generateRemoteUrl('dav/files/user'),
			permissions: Permission.ALL,
			root: '/files/user',
		}),
	}

	afterEach(() => resetDocument())

	it('Upload then changes the destination', () => {
		// Mount picker
		cy.mount(UploadPicker, { propsData })

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')

		// Intercept single upload
		cy.intercept('PUT', '/remote.php/dav/files/*/**', {
			statusCode: 201,
		}).as('upload')

		cy.get('@input').attachFile({
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(5 * 1024 * 1024)]),
			fileName: 'image.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		})

		cy.wait('@upload').then((upload) => {
			expect(upload.request.url).to.have.string(
				'/remote.php/dav/files/user/image.jpg',
			)
		})

		cy.mount(UploadPicker, { propsData }).then(({ component }) => {
			const instance = component as InstanceType<typeof UploadPicker>
			instance.setDestination(new Folder({
				id: 56,
				owner: 'user',
				source: generateRemoteUrl('dav/files/user/Photos'),
				permissions: Permission.ALL,
				root: '/files/user',
			}))
			// Wait for prop propagation
			expect(instance.uploadManager.root).to.have.string('/remote.php/dav/files/user/Photos')
		})

		cy.get('@input').attachFile({
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(5 * 1024 * 1024)]),
			fileName: 'image.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		})

		cy.wait('@upload').then((upload) => {
			expect(upload.request.url).to.have.string(
				'/remote.php/dav/files/user/Photos/image.jpg',
			)
		})
	})
})

describe('Root management', () => {
	const propsData = {
		root: null,
		destination: new Folder({
			id: 56,
			owner: 'user',
			source: generateRemoteUrl('dav/files/user'),
			permissions: Permission.ALL,
			root: '/files/user',
		}),
	}

	afterEach(() => resetDocument())

	it('Upload then changes the root', () => {
		// Mount picker
		cy.mount(UploadPicker, { propsData })

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')

		// Intercept single upload
		cy.intercept('PUT', '/remote.php/dav/files/*/**', {
			statusCode: 201,
		}).as('upload')

		cy.get('@input').attachFile({
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(5 * 1024 * 1024)]),
			fileName: 'image.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		})

		cy.wait('@upload').then((upload) => {
			expect(upload.request.url).to.have.string(
				'/remote.php/dav/files/user/image.jpg',
			)
		})

		cy.mount(UploadPicker, { propsData }).then(({ component }) => {
			const instance = component as InstanceType<typeof UploadPicker>
			instance.setDestination(new Folder({
				id: 56,
				owner: 'user',
				source: generateRemoteUrl('dav/photos/user/albums/2022 Summer Vacations'),
				permissions: Permission.ALL,
				root: '/photos/user',
			}))
			// Wait for prop propagation
			expect(instance.uploadManager.root).to.have.string('/remote.php/dav/photos/user/albums/2022 Summer Vacations')
		})

		// Intercept single upload
		cy.intercept('PUT', '/remote.php/dav/photos/user/albums/*/*', {
			statusCode: 201,
		}).as('upload')

		cy.get('@input').attachFile({
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(5 * 1024 * 1024)]),
			fileName: 'image.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		})

		cy.wait('@upload').then((upload) => {
			expect(upload.request.url).to.have.string(
				'/remote.php/dav/photos/user/albums/2022%20Summer%20Vacations/image.jpg',
			)
		})
	})
})

describe('UploadPicker notify testing', () => {
	const listeners = {
		uploaded: () => {},
		failed: () => {},
	}

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

		cy.spy(listeners, 'uploaded')
		cy.spy(listeners, 'failed')

		// Mount picker
		cy.mount(UploadPicker, {
			propsData,
			listeners,
		}).as('uploadPicker')

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')
	})

	afterEach(() => resetDocument())

	it('Uploads a file without chunking', () => {
		const notify = cy.spy()
		const uploader = getUploader()
		uploader.addNotifier(notify)

		// Intercept single upload
		cy.intercept('PUT', '/remote.php/dav/files/*/*', {
			statusCode: 201,
		}).as('upload')

		cy.get('@input').attachFile({
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(5 * 1024 * 1024)]),
			fileName: 'image.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		})

		cy.get('[data-cy-upload-picker] .upload-picker__progress')
			.as('progress')
			.should('not.be.visible')
		cy.wait('@upload').then(() => {
			cy.get('@progress')
				.children('progress')
				.should('not.have.value', '0')
			expect(notify).to.be.calledTwice
			// The image upload
			expect(notify.getCall(0).args[0].file.name).to.eq('image.jpg')
			expect(notify.getCall(0).args[0].status).to.eq(UploadStatus.FINISHED)
			// The meta upload
			expect(notify.getCall(1).args[0].status).to.eq(UploadStatus.FINISHED)
			expect(notify.getCall(1).args[0].file.name).to.eq('')
			expect(notify.getCall(1).args[0].file.type).to.eq('httpd/unix-directory')
			// the listeners
			expect(listeners.failed).to.not.be.called
			expect(listeners.uploaded).to.be.calledTwice
		})
	})

	it('Fails a file without chunking', () => {
		const notify = cy.spy()
		const uploader = getUploader()
		uploader.addNotifier(notify)

		// Intercept single upload
		cy.intercept('PUT', '/remote.php/dav/files/*/*', {
			statusCode: 403,
		}).as('upload')

		cy.get('@input').attachFile({
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(5 * 1024 * 1024)]),
			fileName: 'image.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		})

		cy.get('[data-cy-upload-picker] .upload-picker__progress')
			.as('progress')
			.should('not.be.visible')
		cy.wait('@upload').then(() => {
			cy.get('@progress')
				.children('progress')
				.should('not.have.value', '0')
			expect(notify).to.be.calledTwice
			// The image upload
			expect(notify.getCall(0).args[0].file.name).to.eq('image.jpg')
			expect(notify.getCall(0).args[0].status).to.eq(UploadStatus.FAILED)
			// The meta upload
			expect(notify.getCall(1).args[0].status).to.eq(UploadStatus.FAILED)
			expect(notify.getCall(1).args[0].file.name).to.eq('')
			expect(notify.getCall(1).args[0].file.type).to.eq('httpd/unix-directory')
			// the listeners
			expect(listeners.uploaded).to.not.be.called
			expect(listeners.failed).to.be.calledTwice
		})
	})
})
