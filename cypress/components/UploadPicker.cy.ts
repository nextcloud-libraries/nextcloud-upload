/* eslint-disable no-unused-expressions */
// dist file might not be built when running eslint only
// eslint-disable-next-line import/no-unresolved,n/no-missing-import
import { Folder, Permission, addNewFileMenuEntry, type Entry } from '@nextcloud/files'
import { generateRemoteUrl } from '@nextcloud/router'
import { UploadPicker, getUploader } from '../../lib/index.ts'

describe('UploadPicker rendering', () => {
	afterEach(() => {
		// Make sure we clear the body
		cy.window().then((win) => {
			win.document.body.innerHTML = '<div data-cy-root></div>'
		})
	})

	it('Renders default UploadPicker', () => {
		const props = {
			destination: new Folder({
				id: 56,
				owner: 'user',
				source: generateRemoteUrl('dav/files/user/Folder'),
				permissions: Permission.ALL,
				root: '/files/user',
			}),
		}
		cy.mount(UploadPicker, { props })
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
		const props = {
			destination: new Folder({
				id: 56,
				owner: 'user',
				source: generateRemoteUrl('dav/files/user'),
				permissions: Permission.ALL,
				root: '/files/user',
			}),
		}

		// Mount picker
		cy.mount(UploadPicker, { props }).as('uploadPicker')

		// Label is displayed before upload
		cy.get('[data-cy-upload-picker]').shouldHaveTrimmedText('New')

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')
	})

	afterEach(() => {
		// Make sure we clear the body
		cy.window().then((win) => {
			win.document.body.innerHTML = '<div data-cy-root></div>'
		})
	})

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

describe('UploadPicker invalid uploads', () => {

	afterEach(() => {
		// Make sure we clear the body
		cy.window().then((win) => {
			win.document.body.innerHTML = '<div data-cy-root></div>'
		})
	})

	it('Fails a file if forbidden character', () => {
		// Make sure we reset the destination
		// so other tests do not interfere
		const props = {
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
		cy.mount(UploadPicker, { props }).as('uploadPicker')

		// Label is displayed before upload
		cy.get('[data-cy-upload-picker]').shouldHaveTrimmedText('New')

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')

		// Intercept single upload
		cy.intercept('PUT', '/remote.php/dav/files/*/*', (req) => {
			req.reply({
				statusCode: 201,
				delay: 2000,
			})
		}).as('upload')

		// Upload 2 files
		cy.get('@input').attachFile({
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(2 * 1024 * 1024)]),
			fileName: 'invalid-image$.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		})

		cy.get('@input').attachFile({
			// Fake file of 5 MB
			fileContent: new Blob([new ArrayBuffer(2 * 1024 * 1024)]),
			fileName: 'valid-image.jpg',
			mimeType: 'image/jpeg',
			encoding: 'utf8',
			lastModified: new Date().getTime(),
		})

		cy.get('[data-cy-upload-picker] .upload-picker__progress')
			.as('progress')
			.should('not.be.visible')

		cy.wait('@upload')
		// Should not have been called more than once as the first file is invalid
		cy.get('@upload.all').should('have.length', 1)
		cy.get('body').should('contain', '"$" is not allowed inside a file name.')
	})
})

describe('NewFileMenu handling', () => {
	const props = {
		destination: new Folder({
			id: 56,
			owner: 'user',
			source: generateRemoteUrl('dav/files/user/Folder'),
			permissions: Permission.ALL,
			root: '/files/user',
		}),
	}
	const entry = {
		id: 'empty-file',
		displayName: 'Create empty file',
		templateName: 'New file',
		iconClass: 'icon-file',
		enabled: (folder: Folder) => (folder.permissions & Permission.CREATE) !== 0,
		handler() {},
	} as Entry

	before(() => {
		cy.spy(entry, 'handler')
		addNewFileMenuEntry(entry)
	})

	afterEach(() => {
		// Make sure we clear the body
		cy.window().then((win) => {
			win.document.body.innerHTML = '<div data-cy-root></div>'
		})
	})

	it('Open the New File Menu', () => {
		// Mount picker
		cy.mount(UploadPicker, { props })

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')
		cy.get('[data-cy-upload-picker] .action-item__menutoggle')
			.as('menuButton')
			.should('exist')

		cy.get('@menuButton').click()
		cy.get('[data-cy-upload-picker-add]').should('have.length', 1)
		cy.get('.upload-picker__menu-entry').should('have.length', 1)

		cy.get('.upload-picker__menu-entry')
			.click()
			.then(() => {
				expect(entry.handler).to.be.called
			})
	})

	it('Changes the context', () => {
		// Mount picker
		cy.mount(UploadPicker, { props })

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')
		cy.get('[data-cy-upload-picker] .action-item__menutoggle')
			.as('menuButton')
			.should('exist')

		cy.get('@menuButton').click()
		cy.get('[data-cy-upload-picker-add]').should('have.length', 1)
		cy.get('.upload-picker__menu-entry').should('have.length', 1)

		// Close menu
		cy.get('body').click()
		cy.get('[data-cy-upload-picker-add]').should('not.be.visible')
		cy.get('.upload-picker__menu-entry').should('not.be.visible')

		cy.get('@component').then((component) => {
			component.setDestination(new Folder({
				id: 56,
				owner: 'user',
				source: generateRemoteUrl('dav/files/user/Folder'),
				permissions: Permission.NONE,
				root: '/files/user',
			}))
		})

		// Menu should not be visible anymore
		cy.get('[data-cy-upload-picker] .action-item__menutoggle')
			.as('menuButton')
			.should('not.exist')
		cy.get('[data-cy-upload-picker-add]').should('have.length', 1)
		cy.get('.upload-picker__menu-entry').should('not.exist')
	})
})

describe('UploadPicker valid uploads', () => {
	beforeEach(() => {
		// Make sure we reset the destination
		// so other tests do not interfere
		const props = {
			destination: new Folder({
				id: 56,
				owner: 'user',
				source: generateRemoteUrl('dav/files/user'),
				permissions: Permission.ALL,
				root: '/files/user',
			}),
		}

		// Mount picker
		cy.mount(UploadPicker, { props }).as('uploadPicker')

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')
	})

	afterEach(() => {
		// Make sure we clear the body
		cy.window().then((win) => {
			win.document.body.innerHTML = '<div data-cy-root></div>'
		})
	})

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
	const props = {
		destination: new Folder({
			id: 56,
			owner: 'user',
			source: generateRemoteUrl('dav/files/user'),
			permissions: Permission.ALL,
			root: '/files/user',
		}),
	}

	afterEach(() => {
		// Make sure we clear the body
		cy.window().then((win) => {
			win.document.body.innerHTML = '<div data-cy-root></div>'
		})
	})

	it('Upload then changes the destination', () => {
		// Mount picker
		cy.mount(UploadPicker, { props })

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

		cy.get('@component').then((component) => {
			component.setDestination(new Folder({
				id: 56,
				owner: 'user',
				source: generateRemoteUrl('dav/files/user/Photos'),
				permissions: Permission.ALL,
				root: '/files/user',
			}))
			// Wait for prop propagation
			expect(component.uploadManager.root).to.have.string('/remote.php/dav/files/user/Photos')
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
	const props = {
		root: null,
		destination: new Folder({
			id: 56,
			owner: 'user',
			source: generateRemoteUrl('dav/files/user'),
			permissions: Permission.ALL,
			root: '/files/user',
		}),
	}

	afterEach(() => {
		// Make sure we clear the body
		cy.window().then((win) => {
			win.document.body.innerHTML = '<div data-cy-root></div>'
		})
	})

	it('Upload then changes the root', () => {
		// Mount picker
		cy.mount(UploadPicker, { props })

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

		cy.get('@component').then((component) => {
			component.setDestination(new Folder({
				id: 56,
				owner: 'user',
				source: generateRemoteUrl('dav/photos/user/albums/2022 Summer Vacations'),
				permissions: Permission.ALL,
				root: '/photos/user',
			}))
			// Wait for prop propagation
			expect(component.uploadManager.root).to.have.string('/remote.php/dav/photos/user/albums/2022 Summer Vacations')
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
		onUploaded: () => {},
		onFailed: () => {},
	}

	beforeEach(() => {
		// Make sure we reset the destination
		// so other tests do not interfere
		const props = {
			destination: new Folder({
				id: 56,
				owner: 'user',
				source: generateRemoteUrl('dav/files/user'),
				permissions: Permission.ALL,
				root: '/files/user',
			}),
		}

		cy.spy(listeners, 'onUploaded')
		cy.spy(listeners, 'onFailed')

		// Mount picker
		cy.mount(UploadPicker, {
			props,
			attrs: listeners,
		}).as('uploadPicker')

		// Check and init aliases
		cy.get('[data-cy-upload-picker] [data-cy-upload-picker-input]').as('input').should('exist')
		cy.get('[data-cy-upload-picker] .upload-picker__progress').as('progress').should('exist')
	})

	afterEach(() => {
		// Make sure we clear the body
		cy.window().then((win) => {
			win.document.body.innerHTML = '<div data-cy-root></div>'
		})
	})

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
			expect(notify).to.be.calledOnce
			expect(listeners.onUploaded).to.be.calledOnce
			expect(listeners.onFailed).to.not.be.called
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
			expect(notify).to.be.calledOnce
			expect(listeners.onUploaded).to.not.be.called
			expect(listeners.onFailed).to.be.calledOnce
		})
	})
})
