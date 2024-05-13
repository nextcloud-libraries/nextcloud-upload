import { File as NcFile } from '@nextcloud/files'
import ConflictPicker from '../../lib/components/ConflictPicker.vue'

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
			props: {
				dirname: 'Pictures',
				content: [oldImage],
				conflicts: [image],
			},
		})

		cy.get('[data-cy-conflict-picker]').should('exist')
		cy.get('[data-cy-conflict-picker] h2').should('have.text', '1 file conflict in Pictures')
		cy.get('[data-cy-conflict-picker-form]').should('be.visible')

		cy.get('[data-cy-conflict-picker-fieldset]').should('have.length', 2)
		cy.get('[data-cy-conflict-picker-fieldset="all"]').should('exist')
		cy.get('[data-cy-conflict-picker-fieldset="image.jpg"]').should('exist')

		cy.get('[data-cy-conflict-picker-skip]').scrollIntoView().should('be.visible')
		cy.get('[data-cy-conflict-picker-submit]').should('be.visible')

		// Force close and cancel
		cy.get('[data-cy-conflict-picker-skip]').click({ force: true })
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
			props: {
				dirname: 'Pictures',
				content: [old1, old2],
				conflicts: images,
			},
			attrs: {
				onSubmit,
				onCancel,
			},
		})

		cy.get('[data-cy-conflict-picker-form]').should('be.visible')
		cy.get('[data-cy-conflict-picker-fieldset]').should('have.length', 3)
		cy.get('[data-cy-conflict-picker-input-incoming="all"] input').check({ force: true })
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
			props: {
				dirname: 'Pictures',
				content: [old1, old2],
				conflicts: images,
			},
			attrs: {
				onSubmit,
				onCancel,
			},
		})

		cy.get('[data-cy-conflict-picker-form]').should('be.visible')
		cy.get('[data-cy-conflict-picker-fieldset]').should('have.length', 3)
		cy.get('[data-cy-conflict-picker-input-existing="all"] input').check({ force: true })
		cy.get('[data-cy-conflict-picker-submit]').click()

		cy.get('@onSubmitSpy').should('have.been.calledOnce').then((onSubmit) => {
			const results = (onSubmit as unknown as sinon.SinonSpy).firstCall.args[0]
			expect(results.selected).to.have.length(0)
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
			props: {
				dirname: 'Pictures',
				content: [old1, old2],
				conflicts: images,
			},
			attrs: {
				onSubmit,
				onCancel,
			},
		})

		cy.get('[data-cy-conflict-picker-form]').should('be.visible')
		cy.get('[data-cy-conflict-picker-fieldset]').should('have.length', 3)
		cy.get('[data-cy-conflict-picker-input-incoming="image1.jpg"] input').check({ force: true })
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

	it('Pick both versions files', () => {
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
			props: {
				dirname: 'Pictures',
				content: [old1, old2],
				conflicts: images,
			},
			attrs: {
				onSubmit,
				onCancel,
			},
		})

		cy.get('[data-cy-conflict-picker-form]').should('be.visible')
		cy.get('[data-cy-conflict-picker-fieldset]').should('have.length', 3)
		cy.get('[data-cy-conflict-picker-input-incoming="all"] input').check({ force: true })
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
			props: {
				dirname: 'Pictures',
				content: [old1, old2],
				conflicts: images,
			},
			attrs: {
				onSubmit,
				onCancel,
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
