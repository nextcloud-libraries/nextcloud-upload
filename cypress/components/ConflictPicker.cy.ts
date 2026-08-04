/**
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { File as NcFile } from '@nextcloud/files'
import ConflictPicker from '../../lib/dialogs/components/ConflictPicker.vue'

describe('ConflictPicker rendering', { testIsolation: true }, () => {
	let image: File

	before(() => {
		cy.fixture('image.jpg', null).then((content: Buffer) => {
			image = new File([content], 'image.jpg', { type: 'image/jpeg' })
		})
	})

	it('Renders default ConflictPicker', () => {
		const oldImage = new NcFile({
			id: 1,
			source: 'http://cloud.domain.com/remote.php/dav/files/user/image.jpg',
			mime: 'image/jpeg',
			size: 1000,
			owner: 'user',
			mtime: new Date('2021-01-01T00:00:00.000Z'),
		})

		cy.mount(ConflictPicker, {
			propsData: {
				dirname: 'Pictures',
				content: [oldImage],
				conflicts: [image],
			},
		})

		cy.get('[data-cy-conflict-picker]').should('exist')
		cy.get('[data-cy-conflict-picker] h2').should('have.text', 'Select file to keep')
		cy.get('[data-cy-conflict-picker-form]').should('be.visible')

		// A single conflict needs no select all and no checkboxes
		cy.get('[data-cy-conflict-picker-fieldset]').should('have.length', 1)
		cy.get('[data-cy-conflict-picker-fieldset="all"]').should('not.exist')
		cy.get('[data-cy-conflict-picker-fieldset="image.jpg"]').should('exist')
		cy.get('[data-cy-conflict-picker-form] input[type="checkbox"]').should('not.exist')

		// The folder name is highlighted in the description
		cy.get('#conflict-picker-description strong').should('have.text', 'Pictures')

		// Instead both options are offered as buttons
		cy.get('[data-cy-conflict-picker-skip]').should('not.exist')
		cy.get('[data-cy-conflict-picker-keep-both]').scrollIntoView().should('be.visible')
		cy.get('[data-cy-conflict-picker-submit]').should('be.visible')

		// Force close and cancel
		cy.get('[data-cy-conflict-picker-cancel]').click({ force: true })
	})

	it('Shows only the folder name, the root is called "All files"', () => {
		const oldImage = new NcFile({
			id: 1,
			source: 'http://cloud.domain.com/remote.php/dav/files/user/image.jpg',
			mime: 'image/jpeg',
			size: 1000,
			owner: 'user',
			mtime: new Date('2021-01-01T00:00:00.000Z'),
		})

		cy.mount(ConflictPicker, {
			propsData: {
				dirname: '/Photos/Sub folder',
				content: [oldImage],
				conflicts: [image],
			},
		})
		cy.get('#conflict-picker-description strong').should('have.text', 'Sub folder')

		cy.mount(ConflictPicker, {
			propsData: {
				dirname: '/',
				content: [oldImage],
				conflicts: [image],
			},
		})
		cy.get('#conflict-picker-description strong').should('have.text', 'All files')
	})

	it('Replaces the existing file', () => {
		const oldImage = new NcFile({
			id: 1,
			source: 'http://cloud.domain.com/remote.php/dav/files/user/image.jpg',
			mime: 'image/jpeg',
			size: 1000,
			owner: 'user',
			mtime: new Date('2021-01-01T00:00:00.000Z'),
		})

		const onSubmit = cy.spy().as('onSubmitSpy')
		cy.mount(ConflictPicker, {
			propsData: {
				dirname: 'Pictures',
				content: [oldImage],
				conflicts: [image],
			},
			listeners: {
				submit: onSubmit,
			},
		})

		cy.get('[data-cy-conflict-picker-submit]').click()

		cy.get('@onSubmitSpy').should('have.been.calledOnce').then((onSubmit) => {
			const results = (onSubmit as unknown as sinon.SinonSpy).firstCall.args[0]
			expect(results.selected).to.deep.equal([image])
			expect(results.renamed).to.have.length(0)
		})
	})

	it('Keeps both versions by renaming the new file', () => {
		const oldImage = new NcFile({
			id: 1,
			source: 'http://cloud.domain.com/remote.php/dav/files/user/image.jpg',
			mime: 'image/jpeg',
			size: 1000,
			owner: 'user',
			mtime: new Date('2021-01-01T00:00:00.000Z'),
		})

		const onSubmit = cy.spy().as('onSubmitSpy')
		cy.mount(ConflictPicker, {
			propsData: {
				dirname: 'Pictures',
				content: [oldImage],
				conflicts: [image],
			},
			listeners: {
				submit: onSubmit,
			},
		})

		cy.get('[data-cy-conflict-picker-keep-both]').click()

		cy.get('@onSubmitSpy').should('have.been.calledOnce').then((onSubmit) => {
			const results = (onSubmit as unknown as sinon.SinonSpy).firstCall.args[0]
			expect(results.selected).to.have.length(0)
			expect(results.renamed).to.have.length(1)
			expect((results.renamed[0] as File).name).to.equal('image (1).jpg')
		})
	})
})

describe('ConflictPicker resolving', () => {
	let images: File[] = []

	beforeEach(() => {
		images = []
		cy.fixture('image.jpg', null).then((content) => {
			images.push(new File([content], 'image1.jpg', { type: 'image/jpeg' }))
			images.push(new File([content], 'image2.jpg', { type: 'image/jpeg' }))
		})
	})

	it('Pick all incoming files', () => {
		const old1 = new NcFile({
			id: 1,
			source: 'http://cloud.domain.com/remote.php/dav/files/user/image1.jpg',
			mime: 'image/jpeg',
			size: 1000,
			owner: 'user',
			mtime: new Date('2021-01-01T00:00:00.000Z'),
		})
		const old2 = new NcFile({
			id: 2,
			source: 'http://cloud.domain.com/remote.php/dav/files/user/image2.jpg',
			mime: 'image/jpeg',
			size: 1000,
			owner: 'user',
			mtime: new Date('2021-01-01T00:00:00.000Z'),
		})

		const onSubmit = cy.spy().as('onSubmitSpy')
		const onCancel = cy.spy().as('onCancelSpy')
		cy.mount(ConflictPicker, {
			propsData: {
				dirname: 'Pictures',
				content: [old1, old2],
				conflicts: images,
			},
			listeners: {
				submit: onSubmit,
				cancel: onCancel,
			},
		})

		cy.get('[data-cy-conflict-picker-form]').should('be.visible')
		cy.get('[data-cy-conflict-picker-fieldset]').should('have.length', 3)

		// The new files are preselected, so we can continue right away
		cy.get('[data-cy-conflict-picker-input-incoming="all"] input').should('be.checked')
		cy.get('[data-cy-conflict-picker-submit]').click()

		cy.get('@onSubmitSpy').should('have.been.calledOnce').then((onSubmit) => {
			const results = (onSubmit as unknown as sinon.SinonSpy).firstCall.args[0]
			expect(results.selected).to.deep.equal(images)
			expect(results.renamed).to.have.length(0)
		})
		cy.get('@onCancelSpy').should('not.have.been.called')
	})

	it('Pick all existing files', () => {
		const old1 = new NcFile({
			id: 1,
			source: 'http://cloud.domain.com/remote.php/dav/files/user/image1.jpg',
			mime: 'image/jpeg',
			size: 1000,
			owner: 'user',
			mtime: new Date('2021-01-01T00:00:00.000Z'),
		})
		const old2 = new NcFile({
			id: 2,
			source: 'http://cloud.domain.com/remote.php/dav/files/user/image2.jpg',
			mime: 'image/jpeg',
			size: 1000,
			owner: 'user',
			mtime: new Date('2021-01-01T00:00:00.000Z'),
		})

		const onSubmit = cy.spy().as('onSubmitSpy')
		const onCancel = cy.spy().as('onCancelSpy')
		cy.mount(ConflictPicker, {
			propsData: {
				dirname: 'Pictures',
				content: [old1, old2],
				conflicts: images,
			},
			listeners: {
				submit: onSubmit,
				cancel: onCancel,
			},
		})

		cy.get('[data-cy-conflict-picker-form]').should('be.visible')
		cy.get('[data-cy-conflict-picker-fieldset]').should('have.length', 3)

		// Deselect the preselected new files and keep the existing ones instead
		cy.get('[data-cy-conflict-picker-input-incoming="all"] input').uncheck({ force: true })
		cy.get('[data-cy-conflict-picker-input-existing="all"] input').check({ force: true })
		cy.get('[data-cy-conflict-picker-submit]').click()

		cy.get('@onSubmitSpy').should('have.been.calledOnce').then((onSubmit) => {
			const results = (onSubmit as unknown as sinon.SinonSpy).firstCall.args[0]
			expect(results.selected).to.have.length(0)
			expect(results.renamed).to.have.length(0)
		})
		cy.get('@onCancelSpy').should('not.have.been.called')
	})

	it('Pick one existing and one new file', () => {
		const old1 = new NcFile({
			id: 1,
			source: 'http://cloud.domain.com/remote.php/dav/files/user/image1.jpg',
			mime: 'image/jpeg',
			size: 1000,
			owner: 'user',
			mtime: new Date('2021-01-01T00:00:00.000Z'),
		})
		const old2 = new NcFile({
			id: 2,
			source: 'http://cloud.domain.com/remote.php/dav/files/user/image2.jpg',
			mime: 'image/jpeg',
			size: 1000,
			owner: 'user',
			mtime: new Date('2021-01-01T00:00:00.000Z'),
		})

		const onSubmit = cy.spy().as('onSubmitSpy')
		const onCancel = cy.spy().as('onCancelSpy')
		cy.mount(ConflictPicker, {
			propsData: {
				dirname: 'Pictures',
				content: [old1, old2],
				conflicts: images,
			},
			listeners: {
				submit: onSubmit,
				cancel: onCancel,
			},
		})

		cy.get('[data-cy-conflict-picker-form]').should('be.visible')
		cy.get('[data-cy-conflict-picker-fieldset]').should('have.length', 3)
		// Keep the new image1 (preselected) but the existing image2
		cy.get('[data-cy-conflict-picker-input-incoming="image2.jpg"] input').uncheck({ force: true })
		cy.get('[data-cy-conflict-picker-input-existing="image2.jpg"] input').check({ force: true })
		cy.get('[data-cy-conflict-picker-submit]').click()

		// We only return the files to handle
		cy.get('@onSubmitSpy').should('have.been.calledOnce').then((onSubmit) => {
			const results = (onSubmit as unknown as sinon.SinonSpy).firstCall.args[0]
			expect(results.selected).to.deep.equal([images[0]])
			expect(results.renamed).to.have.length(0)
		})
		cy.get('@onCancelSpy').should('not.have.been.called')
	})

	it('Pick both versions files (rename existing)', () => {
		const old1 = new NcFile({
			id: 1,
			source: 'http://cloud.domain.com/remote.php/dav/files/user/image1.jpg',
			mime: 'image/jpeg',
			size: 1000,
			owner: 'user',
			mtime: new Date('2021-01-01T00:00:00.000Z'),
		})
		const old2 = new NcFile({
			id: 2,
			source: 'http://cloud.domain.com/remote.php/dav/files/user/image2.jpg',
			mime: 'image/jpeg',
			size: 1000,
			owner: 'user',
			mtime: new Date('2021-01-01T00:00:00.000Z'),
		})

		const onSubmit = cy.spy().as('onSubmitSpy')
		const onCancel = cy.spy().as('onCancelSpy')
		cy.mount(ConflictPicker, {
			propsData: {
				dirname: 'Pictures',
				content: [old1, old2],
				conflicts: images,
			},
			listeners: {
				submit: onSubmit,
				cancel: onCancel,
			},
		})

		cy.get('[data-cy-conflict-picker-form]').should('be.visible')
		cy.get('[data-cy-conflict-picker-fieldset]').should('have.length', 3)
		// The new files are preselected, additionally keep the existing ones
		cy.get('[data-cy-conflict-picker-input-existing="all"] input').check({ force: true })
		cy.get('[data-cy-conflict-picker-submit]').click()

		cy.get('@onSubmitSpy').should('have.been.calledOnce').then((onSubmit) => {
			const results = (onSubmit as unknown as sinon.SinonSpy).firstCall.args[0]
			expect(results.selected).to.have.length(0)
			expect(results.renamed).to.have.length(2)
			expect((results.renamed[0] as File).name).to.equal('image1 (1).jpg')
			expect((results.renamed[1] as File).name).to.equal('image2 (1).jpg')
		})
		cy.get('@onCancelSpy').should('not.have.been.called')
	})

	it('Skip all conflicts', () => {
		const old1 = new NcFile({
			id: 1,
			source: 'http://cloud.domain.com/remote.php/dav/files/user/image1.jpg',
			mime: 'image/jpeg',
			size: 1000,
			owner: 'user',
			mtime: new Date('2021-01-01T00:00:00.000Z'),
		})
		const old2 = new NcFile({
			id: 2,
			source: 'http://cloud.domain.com/remote.php/dav/files/user/image2.jpg',
			mime: 'image/jpeg',
			size: 1000,
			owner: 'user',
			mtime: new Date('2021-01-01T00:00:00.000Z'),
		})

		const onSubmit = cy.spy().as('onSubmitSpy')
		const onCancel = cy.spy().as('onCancelSpy')
		cy.mount(ConflictPicker, {
			propsData: {
				dirname: 'Pictures',
				content: [old1, old2],
				conflicts: images,
			},
			listeners: {
				submit: onSubmit,
				cancel: onCancel,
			},
		})

		cy.get('[data-cy-conflict-picker-form]').should('be.visible')
		cy.get('[data-cy-conflict-picker-fieldset]').should('have.length', 3)
		cy.get('[data-cy-conflict-picker-skip]').click()

		cy.get('@onSubmitSpy').should('have.been.calledOnce').then((onSubmit) => {
			const results = (onSubmit as unknown as sinon.SinonSpy).firstCall.args[0]
			expect(results.selected).to.have.length(0)
			expect(results.renamed).to.have.length(0)
		})
		cy.get('@onCancelSpy').should('not.have.been.called')
	})
})
