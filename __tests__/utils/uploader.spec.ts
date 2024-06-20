import type { Uploader } from '../../lib/uploader'
import type { NextcloudUser } from '@nextcloud/auth'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const auth = vi.hoisted(() => ({ getCurrentUser: vi.fn<never, NextcloudUser | null>(() => null) }))
vi.mock('@nextcloud/auth', () => auth)

describe('uploader', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.resetAllMocks()
		// Reset mocks of DOM
		document.body.innerHTML = ''
	})

	// wrapper to enforce reimport for mocking different dependency state
	const newUploader = async (...args: ConstructorParameters<typeof Uploader>) => {
		const { Uploader } = await import('../../lib/uploader.js')
		return new Uploader(...args)
	}

	test('constructor sets default target folder for user', async () => {
		auth.getCurrentUser.mockImplementation(() => ({ uid: 'my-user', displayName: 'User', isAdmin: false }))
		const uploader = await newUploader()
		expect(uploader.destination.source).match(/\/remote\.php\/dav\/files\/my-user\/?$/)
	})

	test('constructor sets default target folder for public share', async () => {
		const isPublicInput = document.createElement('input')
		isPublicInput.id = 'initial-state-files_sharing-isPublic'
		isPublicInput.value = btoa(JSON.stringify(true))
		document.body.appendChild(isPublicInput)

		const input = document.createElement('input')
		input.id = 'initial-state-files_sharing-sharingToken'
		input.value = btoa(JSON.stringify('modern-token'))
		document.body.appendChild(input)

		const uploader = await newUploader(true)
		expect(uploader.destination.source).match(/\/public\.php\/dav\/files\/modern-token\/?$/)
	})

	test('constructor sets default target folder for legacy public share', async () => {
		const isPublicInput = document.createElement('input')
		isPublicInput.id = 'isPublic'
		isPublicInput.name = 'isPublic'
		isPublicInput.type = 'hidden'
		isPublicInput.value = '1'
		document.body.appendChild(isPublicInput)

		const input = document.createElement('input')
		input.id = 'sharingToken'
		input.name = 'sharingToken'
		input.type = 'hidden'
		input.value = 'legacy-token'
		document.body.appendChild(input)

		const uploader = await newUploader(true)
		expect(uploader.destination.source).match(/\/public\.php\/dav\/files\/legacy-token\/?$/)
	})

	test('fails if not logged in and not on public share', async () => {
		expect(async () => await newUploader()).rejects.toThrow(/User is not logged in/)
	})
})
