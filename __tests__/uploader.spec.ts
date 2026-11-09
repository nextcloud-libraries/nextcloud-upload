/**
 * SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, test, vi } from 'vitest'
import { Uploader } from '../lib/uploader'
import axios from '@nextcloud/axios'
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
			uploader.deleteCustomHeader('X-NC-Nickname')
			expect(uploader.customHeaders).toEqual({})
		})

		test('unsetting non-existent header is a no-op', () => {
			const uploader = new Uploader()
			uploader.setCustomHeader('X-NC-Nickname', 'jane')
			uploader.deleteCustomHeader('X-Non-Existent')
			expect(uploader.customHeaders).toEqual({ 'X-NC-Nickname': 'jane' })
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

	describe('batchUpload', () => {
		test('No upload when skipping all in conflict picker', async () => {
			const uploader = new Uploader()
			await uploader.batchUpload('/', [new File([], 'file.txt')], () => Promise.resolve([]))
			vi.spyOn(uploader, 'upload')
			expect(uploader.upload).not.toHaveBeenCalled()
		})

		test('Empty queue when skipping all in conflict picker', async () => {
			const uploader = new Uploader()
			await uploader.batchUpload('/', [new File([], 'file.txt')], () => Promise.resolve([]))
			expect(uploader.queue).toHaveLength(0)
		})

		test('keeps the initial destination when it changes during conflict resolution', async () => {
			const uploader = new Uploader()
			const initialRoot = uploader.root
			const file = new File([], 'file.txt')

			let startConflictResolution!: () => void
			const conflictResolutionStarted = new Promise<void>((resolve) => {
				startConflictResolution = resolve
			})

			let finishConflictResolution!: () => void
			const conflictResolutionFinished = new Promise<void>((resolve) => {
				finishConflictResolution = resolve
			})

			// Avoid a real HTTP upload. The third argument is what protects the
			// queued file from the shared uploader's later destination change.
			const upload = vi.spyOn(uploader, 'upload')
				.mockResolvedValue({} as Awaited<ReturnType<Uploader['upload']>>)

			const batch = uploader.batchUpload('/', [file], async (nodes) => {
				startConflictResolution()
				await conflictResolutionFinished
				return nodes
			})

			// batchUpload has captured its original root but is paused in its
			// asynchronous conflict callback, simulating navigation during upload.
			await conflictResolutionStarted
			uploader.destination = new nextcloudFiles.Folder({
				owner: 'test',
				source: 'http://cloud.example.com/remote.php/dav/files/test/other-folder',
				root: '/files/test',
			})

			finishConflictResolution()
			await batch

			expect(upload).toHaveBeenCalledTimes(1)
			expect(upload).toHaveBeenCalledWith(
				expect.any(String),
				file,
				initialRoot,
			)
		})

		describe('special characters in the destination', () => {
			const base = 'http://cloud.example.com/remote.php/dav/files/test'
			const mkcolUrls: string[] = []
			let putUrls: string[]
			let mkcolStatus: number
			let hangMkcol: boolean

			/**
			 * Create an uploader with the given (decoded) root
			 * @param source decoded root URL
			 */
			function uploaderFor(source: string): Uploader {
				const uploader = new Uploader()
				uploader.destination = new nextcloudFiles.Folder({
					owner: 'test',
					source,
					root: '/files/test',
				})
				return uploader
			}

			/**
			 * Create a file inside a folder structure
			 * @param relativePath path relative to the picked root, including the file name
			 */
			function fileAt(relativePath: string): File {
				const file = new File(['x'], 'file.txt')
				Object.defineProperty(file, 'webkitRelativePath', { value: relativePath })
				return file
			}

			beforeEach(() => {
				mkcolUrls.length = 0
				putUrls = []
				mkcolStatus = 201
				hangMkcol = false
				// davGetClient() patches webdav to call the global fetch
				vi.stubGlobal('fetch', vi.fn(async (url: string, options: { method: string, signal?: AbortSignal }) => {
					if (options.method === 'MKCOL') {
						mkcolUrls.push(url)
						if (hangMkcol) {
							await new Promise((_resolve, reject) => {
								options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
							})
						}
					}
					return new Response(null, { status: mkcolStatus })
				}))
				vi.spyOn(axios, 'request').mockImplementation(async (config) => {
					putUrls.push(config.url as string)
					return {} as never
				})
			})

			afterEach(() => {
				vi.unstubAllGlobals()
				vi.mocked(axios.request).mockRestore()
			})

			test.each([
				['plain control', '/plain', '/plain'],
				['hash', '/#test', '/%23test'],
				['hash in the middle', '/a#b', '/a%23b'],
				['question mark', '/q?x', '/q%3Fx'],
				['nested hash', '/#test/child', '/%23test/child'],
				['percent sign', '/100% done #1', '/100%25%20done%20%231'],
				['spaces and non-ASCII', '/é 日本', '/%C3%A9%20%E6%97%A5%E6%9C%AC'],
				['plus, ampersand and semicolon', '/a+b&c;d', '/a%2Bb%26c%3Bd'],
				['literal %2F and %23 text', '/a%2Fb%23c', '/a%252Fb%2523c'],
				['already percent-encoded looking name', '/a%20b', '/a%2520b'],
			])('%s', async (_name, decodedPath, encodedPath) => {
				const uploader = new Uploader()
				uploader.destination = new nextcloudFiles.Folder({
					owner: 'test',
					source: `${base}${decodedPath}`,
					root: '/files/test',
				})

				const file = new File(['x'], 'file.txt')
				Object.defineProperty(file, 'webkitRelativePath', { value: 'picked/file.txt' })

				const notified: string[] = []
				uploader.addNotifier((upload) => notified.push(upload.source))

				const uploads = await uploader.batchUpload('/', [file])

				expect(mkcolUrls).toEqual([`${base}${encodedPath}/picked/`])
				expect(putUrls).toEqual([`${base}${encodedPath}/picked/file.txt`])

				// Decoded values stay untouched for upload sources and events
				const sources = uploads.map((upload) => upload.source)
				expect(sources).toContain(`${base}${decodedPath}/picked`)
				expect(sources).toContain(`${base}${decodedPath}/picked/file.txt`)
				expect(notified).toContain(`${base}${decodedPath}/`)
				expect(notified).toContain(`${base}${decodedPath}/picked`)
			})

			test('special characters in child directory names', async () => {
				const uploader = new Uploader()
				const file = new File(['x'], 'file.txt')
				Object.defineProperty(file, 'webkitRelativePath', { value: '#d/100% x/file.txt' })

				const uploads = await uploader.batchUpload('/', [file])

				expect(mkcolUrls).toEqual([`${base}/%23d/`, `${base}/%23d/100%25%20x/`])
				expect(putUrls).toEqual([`${base}/%23d/100%25%20x/file.txt`])

				const sources = uploads.map((upload) => upload.source)
				expect(sources).toContain(`${base}/#d`)
				expect(sources).toContain(`${base}/#d/100% x`)
				expect(sources).toContain(`${base}/#d/100% x/file.txt`)
			})

			test.each([
				['spaces and non-ASCII', 'é 日本', '%C3%A9%20%E6%97%A5%E6%9C%AC'],
				['plus, ampersand and semicolon', 'a+b&c;d', 'a%2Bb%26c%3Bd'],
				['literal %2F and %23 text', 'a%2Fb%23c', 'a%252Fb%2523c'],
				['already percent-encoded looking name', 'a%20b', 'a%2520b'],
			])('folder name with %s', async (_name, decoded, encoded) => {
				const uploads = await uploaderFor(base).batchUpload('/', [fileAt(`${decoded}/file.txt`)])

				expect(mkcolUrls).toEqual([`${base}/${encoded}/`])
				expect(putUrls).toEqual([`${base}/${encoded}/file.txt`])
				expect(uploads.map((upload) => upload.source)).toContain(`${base}/${decoded}`)
			})

			test('trailing slash on the root', async () => {
				const uploads = await uploaderFor(`${base}/#test/`).batchUpload('/', [fileAt('picked/file.txt')])

				expect(mkcolUrls).toEqual([`${base}/%23test/picked/`])
				expect(putUrls).toEqual([`${base}/%23test/picked/file.txt`])
				expect(uploads.map((upload) => upload.source)).toContain(`${base}/#test/picked`)
			})

			test('explicit non-default port', async () => {
				const portBase = 'http://cloud.example.com:8080/remote.php/dav/files/test'
				const uploads = await uploaderFor(`${portBase}/#test`).batchUpload('/', [fileAt('picked/file.txt')])

				expect(mkcolUrls).toEqual([`${portBase}/%23test/picked/`])
				expect(putUrls).toEqual([`${portBase}/%23test/picked/file.txt`])
				expect(uploads.map((upload) => upload.source)).toContain(`${portBase}/#test/picked`)
			})

			test('hash only in a parent segment of the root with a destination', async () => {
				const uploads = await uploaderFor(`${base}/#parent`).batchUpload('/child', [fileAt('picked/file.txt')])

				expect(mkcolUrls).toEqual([`${base}/%23parent/child/picked/`])
				expect(putUrls).toEqual([`${base}/%23parent/child/picked/file.txt`])
				expect(uploads.map((upload) => upload.source)).toContain(`${base}/#parent/child/picked`)
			})

			test('existing directory (405) is ignored and uploads continue', async () => {
				mkcolStatus = 405
				const uploads = await uploaderFor(`${base}/#test`).batchUpload('/', [fileAt('picked/file.txt')])

				expect(mkcolUrls).toEqual([`${base}/%23test/picked/`])
				expect(putUrls).toEqual([`${base}/%23test/picked/file.txt`])
				expect(uploads).toHaveLength(2)
			})

			test('cancelling mid-batch rejects (p-cancelable CancelError) and uploads nothing', async () => {
				hangMkcol = true
				const batch = uploaderFor(`${base}/#test`).batchUpload('/', [fileAt('picked/file.txt')])

				await vi.waitFor(() => expect(mkcolUrls).toHaveLength(1))
				batch.cancel()

				// The outer PCancelable rejects itself with its own CancelError
				await expect(batch).rejects.toMatchObject({ name: 'CancelError' })
				expect(putUrls).toEqual([])
			})

			test('special characters in a public share root', async () => {
				const publicBase = 'http://cloud.example.com/public.php/dav/files'
				const uploader = new Uploader(true)
				uploader.destination = new nextcloudFiles.Folder({
					owner: 'anonymous',
					source: `${publicBase}/tok#en`,
					root: '/files/tok#en',
				})
				const file = new File(['x'], 'file.txt')
				Object.defineProperty(file, 'webkitRelativePath', { value: 'picked/file.txt' })

				const uploads = await uploader.batchUpload('/', [file])

				expect(mkcolUrls).toEqual([`${publicBase}/tok%23en/picked/`])
				expect(putUrls).toEqual([`${publicBase}/tok%23en/picked/file.txt`])
				expect(uploads.map((upload) => upload.source)).toContain(`${publicBase}/tok#en/picked`)
			})
		})
	})
})
