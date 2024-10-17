/**
 * SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { File, Folder } from '@nextcloud/files'
import { describe, expect, it } from 'vitest'
import { getConflicts, hasConflict } from '../../lib'

describe('hasConflict', () => {
	const file = new File({ owner: 'user', source: 'https://cloud.example.com/remote.php/dav/user/files/text.md', mime: 'text/markdown' })
	const folder = new Folder({ owner: 'user', source: 'https://cloud.example.com/remote.php/dav/user/files/folder' })

	it('no conflicts with empty files', () => {
		expect(hasConflict([], [file])).toBe(false)
	})

	it('no conflicts with empty content', () => {
		expect(hasConflict([file], [])).toBe(false)
	})

	it('no conflicts with both empty files and content', () => {
		expect(hasConflict([], [])).toBe(false)
	})

	it('has conflicts with same file', () => {
		expect(hasConflict([file], [file])).toBe(true)
	})

	it('has conflicts with ES file', () => {
		const esFile = new window.File([], 'text.md', { type: 'text/markdown' })
		expect(hasConflict([esFile], [file])).toBe(true)
	})

	it('has no conflicts with folder', () => {
		const esFile = new window.File([], 'text.md', { type: 'text/markdown' })
		const otherFile = new window.File([], 'other.txt', { type: 'text/plain' })
		expect(hasConflict([esFile, otherFile], [folder])).toBe(false)
	})
})

describe('getConflicts', () => {
	const file = new File({ owner: 'user', source: 'https://cloud.example.com/remote.php/dav/user/files/text.md', mime: 'text/markdown' })
	const folder = new Folder({ owner: 'user', source: 'https://cloud.example.com/remote.php/dav/user/files/folder' })

	it('no conflicts with empty files', () => {
		expect(getConflicts([], [file])).to.eql([])
	})

	it('no conflicts with empty content', () => {
		expect(getConflicts([file], [])).to.eql([])
	})

	it('no conflicts with both empty files and content', () => {
		expect(getConflicts([], [])).to.eql([])
	})

	it('has conflicts with same file', () => {
		expect(getConflicts([file], [file])).to.eql([file])
	})

	it('has conflicts with ES file', () => {
		const esFile = new window.File([], 'text.md', { type: 'text/markdown' })
		expect(getConflicts([esFile], [file])).to.eql([esFile])
	})

	it('returns only the conflicting file', () => {
		const esFile = new window.File([], 'text.md', { type: 'text/markdown' })
		const otherFile = new window.File([], 'other.txt', { type: 'text/plain' })
		expect(getConflicts([esFile, otherFile], [file])).to.eql([esFile])
	})

	it('has no conflicts with folder', () => {
		const esFile = new window.File([], 'text.md', { type: 'text/markdown' })
		const otherFile = new window.File([], 'other.txt', { type: 'text/plain' })
		expect(getConflicts([esFile, otherFile], [folder])).to.eql([])
	})
})
