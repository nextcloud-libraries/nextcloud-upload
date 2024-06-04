import { beforeEach, describe, expect, test, vi } from 'vitest'
import { Uploader } from '../../lib/uploader.js'

import type { NextcloudUser } from '@nextcloud/auth'

const initialState = vi.hoisted(() => ({ loadState: vi.fn() }))
const auth = vi.hoisted(() => ({ getCurrentUser: vi.fn<never, NextcloudUser | null>(() => null) }))
vi.mock('@nextcloud/initial-state', () => initialState)
vi.mock('@nextcloud/auth', () => auth)

describe('uploader', () => {
	beforeEach(() => {
		vi.resetAllMocks()
		const node = document.getElementById('sharingToken')
		if (node) {
			document.body.removeChild(node)
		}
	})

	test('constructor sets default target folder for user', async () => {
		auth.getCurrentUser.mockImplementationOnce(() => ({ uid: 'my-user', displayName: 'User', isAdmin: false }))
		const uploader = new Uploader()
		expect(uploader.destination.source).match(/\/remote\.php\/dav\/files\/my-user\/?$/)
	})

	test('constructor sets default target folder for public share', async () => {
		initialState.loadState.mockImplementationOnce((app, key) => app === 'files_sharing' && key === 'sharingToken' ? 'token-123' : null)
		const uploader = new Uploader(true)
		expect(uploader.destination.source).match(/\/public\.php\/dav\/files\/token-123\/?$/)
	})

	test('constructor sets default target folder for legacy public share', async () => {
		const input = document.createElement('input')
		input.id = 'sharingToken'
		input.value = 'legacy-token'
		document.body.appendChild(input)
		const uploader = new Uploader(true)
		expect(uploader.destination.source).match(/\/public\.php\/dav\/files\/legacy-token\/?$/)
	})

	test('fails if no sharingToken on public share', async () => {
		expect(() => new Uploader(true)).toThrow(/No sharing token found/)
	})

	test('fails if not logged in and not on public share', async () => {
		expect(() => new Uploader()).toThrow(/User is not logged in/)
		expect(initialState.loadState).not.toBeCalled()
	})
})
