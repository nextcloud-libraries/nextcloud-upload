/**
 * SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { beforeAll, beforeEach, describe, expect, it, test, vi } from 'vitest'
import { Uploader } from '../lib/uploader'
import * as nextcloudAuth from '@nextcloud/auth'
import * as nextcloudFiles from '@nextcloud/files'

// This mocks auth to always return the `test` user by default
vi.mock('@nextcloud/auth')
vi.mock('@nextcloud/files', async (getModule) => {
	const original: typeof nextcloudFiles = await getModule()
	return { ...original }
})

beforeAll(() => {
	vi.spyOn(nextcloudFiles, 'davRemoteURL', 'get').mockReturnValue('http://cloud.example.com/remote.php/dav')
	vi.spyOn(nextcloudFiles, 'davRootPath', 'get').mockReturnValue('/files/test')
})

describe('Uploader', () => {
	beforeEach(() => {
		// Reset mocks of DOM
		document.body.innerHTML = ''
	})

	describe('Constructor', () => {
		it('sets default target folder for user', async () => {
			const uploader = new Uploader()
			expect(uploader.destination.source).match(/\/remote\.php\/dav\/files\/test\/?$/)
		})

		it('sets default target folder for public share', async () => {
			// public share values
			vi.spyOn(nextcloudFiles, 'davRemoteURL', 'get')
				.mockReturnValueOnce('http://cloud.example.com/public.php/dav')
			vi.spyOn(nextcloudFiles, 'davRootPath', 'get')
				.mockReturnValueOnce('/files/share-token')
				.mockReturnValueOnce('/files/share-token')

			const uploader = new Uploader(true)
			expect(uploader.destination.source).match(/\/public\.php\/dav\/files\/share-token\/?$/)
			expect(uploader.destination.owner).toBe('anonymous')
		})

		it('fails if not logged in and not on public share', async () => {
			vi.spyOn(nextcloudAuth, 'getCurrentUser').mockImplementationOnce(() => null)
			await expect(async () => new Uploader()).rejects.toThrow(/User is not logged in/)
		})
	})

	describe('custom headers', () => {
		test('default to none', () => {
			const uploader = new Uploader()
			expect(uploader.customHeaders).toEqual({})
		})

		test('can set custom header', () => {
			const uploader = new Uploader()
			uploader.setCustomHeader('X-NC-Nickname', 'jane')
			expect(uploader.customHeaders).toEqual({ 'X-NC-Nickname': 'jane' })
		})

		test('can unset custom header', () => {
			const uploader = new Uploader()
			uploader.setCustomHeader('X-NC-Nickname', 'jane')
			expect(uploader.customHeaders).toEqual({ 'X-NC-Nickname': 'jane' })
			uploader.deleteCustomerHeader('X-NC-Nickname')
			expect(uploader.customHeaders).toEqual({})
		})

		test('can unset custom header', () => {
			const uploader = new Uploader()
			uploader.setCustomHeader('X-NC-Nickname', 'jane')
			expect(uploader.customHeaders).toEqual({ 'X-NC-Nickname': 'jane' })
			uploader.deleteCustomerHeader('X-NC-Nickname')
			expect(uploader.customHeaders).toEqual({})
		})

		test('can set an empty header', () => {
			// This is valid as per RFC7230
			const uploader = new Uploader()
			uploader.setCustomHeader('Host', '')
			expect(uploader.customHeaders).toEqual({ Host: '' })
		})
	})

	describe('destination', () => {
		test('can overwrite the destination', () => {
			const uploader = new Uploader()
			expect(uploader.destination.path).toBe('/')

			const newDestination = new nextcloudFiles.Folder({
				owner: 'test',
				source: 'http://example.com/remote.php/dav/files/test/some/folder',
				root: '/files/test',
			})

			expect(() => { uploader.destination = newDestination }).not.toThrow()
			expect(uploader.destination.path).toBe('/some/folder')
		})

		test('cannot unset destination', () => {
			const uploader = new Uploader()
			expect(uploader.destination.path).toBe('/')

			expect(() => { uploader.destination = undefined as never }).toThrowError(/invalid destination/i)
		})

		test('cannot set file as destination', () => {
			const uploader = new Uploader()
			expect(uploader.destination.path).toBe('/')

			const newDestination = new nextcloudFiles.File({
				owner: 'test',
				source: 'http://example.com/remote.php/dav/files/test/some/folder-like',
				root: '/files/test',
				mime: 'text/plain',
			})

			expect(() => { uploader.destination = newDestination as unknown as nextcloudFiles.Folder }).toThrowError(/invalid destination/i)
		})
	})
})
