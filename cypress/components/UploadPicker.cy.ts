// dist file might not be built when running eslint only
// eslint-disable-next-line import/no-unresolved,n/no-missing-import
import { addNewFileMenuEntry } from '@nextcloud/files'
import { UploadPicker } from '../../dist/index.js'

describe('UploadPicker rendering', () => {
	it('Renders default UploadPicker', () => {
		cy.mount(UploadPicker)
		cy.get('form').should('have.class', 'upload-picker')
		cy.get('form input[type="file"]').should('exist')
	})
})

describe('NewFileMenu handling', () => {
	const propsData = {
		context: {
			basename: 'Folder',
			etag: '63071eedd82fe',
			fileid: '56',
			filename: '/Folder',
			hasPreview: false,
			lastmod: 1661410576,
			mime: 'httpd/unix-directory',
			month: '197001',
			permissions: 'CKGWDR',
			showShared: false,
			size: 2610077102,
			timestamp: 1661410,
			type: 'dir',
		},
	}
	const entry = {
		id: 'empty-file',
		displayName: 'Create empty file',
		templateName: 'New file',
		iconClass: 'icon-file',
		if: (fileInfo) => fileInfo.permissions.includes('CK'),
		handler() {},
	}

	before(() => {
		cy.spy(entry, 'handler')
		addNewFileMenuEntry(entry)
	})

	it('Open the New File Menu', () => {
		// Mount picker
		cy.mount(UploadPicker, { propsData })

		// Check and init aliases
		cy.get('form input[type="file"]').as('input').should('exist')
		cy.get('form .upload-picker__progress').as('progress').should('exist')
		cy.get('form .action-item__menutoggle')
			.as('menuButton')
			.should('exist')

		cy.get('@menuButton').click()
		cy.get('[data-upload-picker-add]').should('have.length', 1)
		cy.get('.upload-picker__menu-entry').should('have.length', 1)

		cy.get('.upload-picker__menu-entry')
			.click()
			.then(() => {
				expect(entry.handler).to.be.called
			})
	})

	it('Changes the context', () => {
		// Mount picker
		cy.mount(UploadPicker, { propsData })

		// Check and init aliases
		cy.get('form input[type="file"]').as('input').should('exist')
		cy.get('form .upload-picker__progress').as('progress').should('exist')
		cy.get('form .action-item__menutoggle')
			.as('menuButton')
			.should('exist')

		cy.get('@menuButton').click()
		cy.get('[data-upload-picker-add]').should('have.length', 1)
		cy.get('.upload-picker__menu-entry').should('have.length', 1)

		// Close menu
		cy.get('body').click()
		cy.get('[data-upload-picker-add]').should('not.be.visible')
		cy.get('.upload-picker__menu-entry').should('not.be.visible')

		cy.get('@component').then((component) => {
			component.setContext(
				Object.assign({}, propsData.context, { permissions: 'GR' })
			)
		})
		cy.get('form .action-item__menutoggle')
			.as('menuButton')
			.should('not.exist')
		cy.get('[data-upload-picker-add]').should('have.length', 1)
		cy.get('.upload-picker__menu-entry').should('not.exist')
	})
})

describe('UploadPicker valid uploads', () => {
	beforeEach(() => {
		// Mount picker
		cy.mount(UploadPicker).as('uploadPicker')

		// Check and init aliases
		cy.get('form input[type="file"]').as('input').should('exist')
		cy.get('form .upload-picker__progress').as('progress').should('exist')
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
			cy.get('form .upload-picker__progress')
				.as('progress')
				.should('be.visible')
		})
		cy.wait('@chunks').then(() => {
			cy.get('form .upload-picker__progress')
				.as('progress')
				.should('be.visible')
			cy.get('@progress')
				.children('progress')
				.should('not.have.value', '0')
		})
		cy.wait('@assembly', { timeout: 60000 }).then(() => {
			cy.get('form .upload-picker__progress')
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

		cy.get('form .upload-picker__progress')
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
		destination: '/',
	}

	it('Upload then changes the destination', () => {
		// Mount picker
		cy.mount(UploadPicker, { propsData })

		// Check and init aliases
		cy.get('form input[type="file"]').as('input').should('exist')
		cy.get('form .upload-picker__progress').as('progress').should('exist')

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
				'/remote.php/dav/files/user/image.jpg'
			)
		})

		cy.get('@component').then((component) => {
			component.setDestination('/Photos')
			// Wait for prop propagation
			expect(component.uploadManager.destination).to.equal('/Photos')
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
				'/remote.php/dav/files/user/Photos/image.jpg'
			)
		})
	})
})

describe('Root management', () => {
	const propsData = {
		root: null,
		destination: '/',
	}

	it('Upload then changes the root', () => {
		// Mount picker
		cy.mount(UploadPicker, { propsData })

		// Check and init aliases
		cy.get('form input[type="file"]').as('input').should('exist')
		cy.get('form .upload-picker__progress').as('progress').should('exist')

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
				'/remote.php/dav/files/user/image.jpg'
			)
		})

		cy.get('@component').then((component) => {
			component.setRoot('dav/photos/admin/albums')
			component.setDestination('/2022 Summer Vacations')
			// Wait for prop propagation
			expect(component.uploadManager.root).to.match(
				/dav\/photos\/admin\/albums$/i
			)
		})

		// Intercept single upload
		cy.intercept('PUT', '/remote.php/dav/photos/admin/albums/*/*', {
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
				'/remote.php/dav/photos/admin/albums/2022%20Summer%20Vacations/image.jpg'
			)
		})
	})
})