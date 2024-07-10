/**
 * SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { beforeAll, describe, expect, test } from 'vitest'
import { isFileSystemDirectoryEntry, isFileSystemEntry, isFileSystemFileEntry } from '../../lib/utils/filesystem'

describe('File and Directory API helpers', () => {
	describe('Without browser support', () => {
		beforeAll(() => {
			// @ts-expect-error This is not optional, but we need this removed for testing
			delete window.FileSystemEntry
			// @ts-expect-error This is not optional, but we need this removed for testing
			delete window.FileSystemFileEntry
			// @ts-expect-error This is not optional, but we need this removed for testing
			delete window.FileSystemDirectoryEntry
		})

		test('isFileSystemDirectoryEntry', () => {
			expect(isFileSystemDirectoryEntry({ })).toBe(false)
		})
		test('isFileSystemFileEntry', () => {
			expect(isFileSystemFileEntry({ })).toBe(false)
		})
		test('isFileSystemEntry', () => {
			expect(isFileSystemEntry({ })).toBe(false)
		})
	})

	describe('With browser support', () => {
		beforeAll(() => {
			// @ts-expect-error Mocking the class - as of today (2024) neither jsdom nor happy-dom support this
			window.FileSystemEntry = class A {}
			// @ts-expect-error Mocking the class - as of today (2024) neither jsdom nor happy-dom support this
			window.FileSystemFileEntry = class B extends window.FileSystemEntry {}
			// @ts-expect-error Mocking the class - as of today (2024) neither jsdom nor happy-dom support this
			window.FileSystemDirectoryEntry = class C extends window.FileSystemEntry {}
		})

		test('isFileSystemDirectoryEntry with other object', () => {
			expect(isFileSystemDirectoryEntry({ })).toBe(false)
		})
		test('isFileSystemFileEntry with other object', () => {
			expect(isFileSystemFileEntry({ })).toBe(false)
		})
		test('isFileSystemEntry with other object', () => {
			expect(isFileSystemEntry({ })).toBe(false)
		})

		test('isFileSystemDirectoryEntry with real entry', () => {
			const object = new window.FileSystemDirectoryEntry()
			expect(isFileSystemDirectoryEntry(object)).toBe(true)
		})
		test('isFileSystemFileEntry with real entry', () => {
			const object = new window.FileSystemFileEntry()
			expect(isFileSystemFileEntry(object)).toBe(true)
		})
		test('isFileSystemEntry with real entry', () => {
			const object = new window.FileSystemEntry()
			expect(isFileSystemEntry(object)).toBe(true)
		})
	})
})
