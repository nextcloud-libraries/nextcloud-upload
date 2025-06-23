/**
 * SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { uploadConflictHandler } from '../../lib/ui/utils/uploadConflictHandler.ts'
import { InvalidFilenameError, InvalidFilenameErrorReason, File as NcFile } from '@nextcloud/files'

const validateFilename = vi.hoisted(() => vi.fn(() => true))
const openConflictPicker = vi.hoisted(() => vi.fn())
const showInvalidFilenameDialog = vi.hoisted(() => vi.fn())

vi.mock('../../lib/index.ts', () => ({ openConflictPicker }))
vi.mock('../../lib/ui/utils/dialog.ts', () => ({ showInvalidFilenameDialog }))
vi.mock('@nextcloud/files', async (getModule) => {
	const original = await getModule()
	return {
		...original as any,
		validateFilename,
	}
})

describe('uploadConflictHandler', () => {
	const callback = vi.fn()
	const handler = uploadConflictHandler(callback)

	const file1 = new File([], 'image.jpg')
	const ncFile1 = new NcFile({ owner: 'test', source: 'http://example.com/remote.php/dav/files/test/image.jpg', mime: 'image/jpeg' })
	const file2 = new File([], 'document.md')
	const ncFile2 = new NcFile({ owner: 'test', source: 'http://example.com/remote.php/dav/files/test/document.md', mime: 'text/plain' })

	beforeEach(() => {
		vi.resetAllMocks()
		callback.mockRestore()
	})

	it('no conflicts on single file', async () => {
		callback.mockImplementationOnce(async () => [])
		const result = await handler([file1], '/')

		expect(callback).toBeCalledTimes(1)
		expect(callback).toBeCalledWith('/')

		expect(validateFilename).toBeCalledWith('image.jpg')
		expect(result).toEqual([file1])
	})

	it('conflicts on files - select new', async () => {
		callback.mockImplementationOnce(async () => [
			ncFile1,
			ncFile2
		])
		openConflictPicker.mockImplementationOnce(() => ({
			selected: [file1, file2],
			renamed: [],
		}))
		const result = await handler([file1, file2], '/')

		expect(callback).toBeCalledTimes(1)
		expect(callback).toBeCalledWith('/')

		expect(result).toEqual([file1, file2])
	})

	it('conflicts on files - select one new', async () => {
		callback.mockImplementationOnce(async () => [
			ncFile1,
			ncFile2
		])
		openConflictPicker.mockImplementationOnce(() => ({
			selected: [file1],
			renamed: [],
		}))
		const result = await handler([file1, file2], '/')

		expect(callback).toBeCalledTimes(1)
		expect(callback).toBeCalledWith('/')

		expect(result).toEqual([file1])
	})

	it('conflicts on files - rename', async () => {
		const renamedFile = new File([], 'image new name.jpg')

		callback.mockImplementationOnce(async () => [
			new NcFile({ owner: 'test', source: 'http://example.com/remote.php/dav/files/test/image.jpg', mime: 'image/jpeg' }),
		])
		openConflictPicker.mockImplementationOnce(() => ({
			selected: [],
			renamed: [renamedFile],
		}))

		const result = await handler([file1, file2], '/')

		expect(callback).toBeCalledTimes(1)
		expect(callback).toBeCalledWith('/')

		expect(result).toEqual([renamedFile, file2])
	})

	it('invalid filename - skip', async () => {
		const invalidFilename = new File([], '#some file.jpg')
		const exception = new InvalidFilenameError({ filename: invalidFilename.name, reason: InvalidFilenameErrorReason.Character, segment: '#' })

		callback.mockImplementationOnce(async () => [])
		validateFilename.mockImplementationOnce(() => {
			throw exception
		})
		showInvalidFilenameDialog.mockImplementationOnce(() => false)
		const result = await handler([invalidFilename], '/')

		expect(callback).toBeCalledTimes(1)
		expect(callback).toBeCalledWith('/')
		expect(validateFilename).toBeCalledTimes(1)
		expect(validateFilename).toBeCalledWith(invalidFilename.name)
		expect(showInvalidFilenameDialog).toBeCalledTimes(1)
		expect(showInvalidFilenameDialog).toBeCalledWith(exception)

		expect(result).toHaveLength(0)
	})

	it('invalid filename - rename', async () => {
		const invalidFilename = new File(['CONTENT'], '#some file.jpg')
		const exception = new InvalidFilenameError({ filename: invalidFilename.name, reason: InvalidFilenameErrorReason.Character, segment: '#' })

		callback.mockImplementationOnce(async () => [])
		validateFilename.mockImplementationOnce(() => {
			throw exception
		})
		showInvalidFilenameDialog.mockImplementationOnce(() => 'valid filename.jpg')
		const result = await handler([invalidFilename], '/')

		expect(callback).toBeCalledTimes(1)
		expect(callback).toBeCalledWith('/')
		expect(validateFilename).toBeCalledTimes(1)
		expect(validateFilename).toBeCalledWith('#some file.jpg')
		expect(showInvalidFilenameDialog).toBeCalledTimes(1)
		expect(showInvalidFilenameDialog).toBeCalledWith(exception)

		expect(result).toEqual([new File(['CONTENT'], 'valid filename.jpg')])
	})
})
