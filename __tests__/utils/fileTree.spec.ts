/**
 * SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { describe, expect, it } from 'vitest'
import { Directory } from '../../lib/core/utils/fileTree.ts'

describe('file tree utils', () => {
	it('Can create a directory', () => {
		const dir = new Directory('base')
		// expected no exception
		expect(dir.name).toBe(dir.webkitRelativePath)
		expect(dir.name).toBe('base')
	})

	it('Can create a virtual root directory', () => {
		const dir = new Directory('')
		// expected no exception
		expect(dir.name).toBe(dir.webkitRelativePath)
		expect(dir.name).toBe('')
	})

	it('Can create a nested directory', () => {
		const dir = new Directory('base/name')
		// expected no exception
		expect(dir.name).toBe('name')
		expect(dir.webkitRelativePath).toBe('base/name')
	})

	it('Can add a direct child to the directory', async () => {
		const dir = new Directory('base')
		await dir.addChild(new File(['a'.repeat(1024)], 'my-file'))

		// expected no exception
		expect(dir.name).toBe('base')
		expect(dir.children).toHaveLength(1)
		expect(dir.children[0].name).toBe('my-file')
	})

	it('Can add multiple direct children to the directory', async () => {
		const dir = new Directory('base')
		await dir.addChildren([new File(['a'.repeat(1024)], 'my-file'), new File([], 'other-file')])

		// expected no exception
		expect(dir.name).toBe('base')
		expect(dir.children).toHaveLength(2)
		expect(dir.children.map((file) => file.name)).toEqual(['my-file', 'other-file'])
	})

	it('Can create a virtual root with content', async () => {
		const dir = new Directory('')
		await dir.addChildren([new File(['I am bar.txt'], 'a/bar.txt')])
		expect(dir.name).toBe('')

		expect(dir.children).toHaveLength(1)
		expect(dir.children[0]).toBeInstanceOf(Directory)
		expect(dir.children[0].name).toBe('a')
		expect(dir.children[0].webkitRelativePath).toBe('a')

		const dirA = dir.children[0] as Directory
		expect(dirA.children).toHaveLength(1)
		expect(await dirA.children[0].text()).toBe('I am bar.txt')
	})

	it('Reads the size from the content', async () => {
		const dir = new Directory('base')
		await dir.addChild(new File(['a'.repeat(1024)], 'my-file'))

		// expected no exception
		expect(dir.children).toHaveLength(1)
		expect(dir.size).toBe(1024)
	})

	it('Reads the lastModified from the content', async () => {
		const dir = new Directory('base')
		await dir.addChildren([new File(['a'.repeat(1024)], 'my-file', { lastModified: 999 })])
		// expected no exception
		expect(dir.children).toHaveLength(1)
		expect(dir.lastModified).toBe(999)
	})

	it('Keeps its orginal name', () => {
		// The conflict picker will force-overwrite the name attribute so we emulate this
		const dir = new Directory('base')
		expect(dir.name).toBe('base')
		expect(dir.originalName).toBe('base')

		Object.defineProperty(dir, 'name', { value: 'other-base' })
		expect(dir.name).toBe('other-base')
		expect(dir.originalName).toBe('base')
	})

	it('can add a child', async () => {
		const dir = new Directory('base')
		expect(dir.children).toHaveLength(0)

		await dir.addChild(new File(['a'.repeat(1024)], 'my-file'))
		expect(dir.children).toHaveLength(1)
		expect(dir.children[0].name).toBe('my-file')
	})

	it('can add a child to existing ones', async () => {
		const dir = new Directory('base')
		await dir.addChild(new File(['a'.repeat(1024)], 'my-file'))
		expect(dir.children).toHaveLength(1)

		await dir.addChild(new File(['a'.repeat(1024)], 'my-other-file'))
		expect(dir.children).toHaveLength(2)
		expect(dir.children[0].name).toBe('my-file')
		expect(dir.children[1].name).toBe('my-other-file')
	})

	it('Can detect invalid children added', async () => {
		const dir = new Directory('base/valid')

		await expect(() => dir.addChild(new File([], 'base/invalid/foo.txt'))).rejects.toThrowError(/File .+ is not a child of .+/)
	})

	it('Can get a child', async () => {
		const dir = new Directory('base')
		await dir.addChild(new File([], 'base/file'))

		expect(dir.getChild('file')).toBeInstanceOf(File)
	})

	it('returns null if child is not found', async () => {
		const dir = new Directory('base/valid')

		expect(dir.getChild('foo')).toBeNull()
	})

	it('Can add nested children', async () => {
		const dir = new Directory('a')
		await dir.addChild(new File(['I am file D'], 'a/b/c/d.txt'))

		expect(dir.children).toHaveLength(1)
		expect(dir.children[0]).toBeInstanceOf(Directory)
		const dirB = dir.children[0] as Directory
		expect(dirB.webkitRelativePath).toBe('a/b')
		expect(dirB.name).toBe('b')

		expect(dirB.children).toHaveLength(1)
		expect(dirB.children[0]).toBeInstanceOf(Directory)
		const dirC = dirB.children[0] as Directory
		expect(dirC.name).toBe('c')
		expect(dirC.webkitRelativePath).toBe('a/b/c')

		expect(dirC.children).toHaveLength(1)
		expect(await dirC.children[0].text()).toBe('I am file D')
	})

	it('Can add to existing nested children', async () => {
		// First we start like the "can add nested" test
		const dir = new Directory('a')
		await dir.addChild(new File(['I am file D'], 'a/b/c/d.txt'))

		// But now we add a second file
		await dir.addChild(new File(['I am file E'], 'a/b/e.txt'))

		expect(dir.children).toHaveLength(1)
		expect(dir.children[0]).toBeInstanceOf(Directory)
		const dirB = dir.children[0] as Directory
		expect(dirB.webkitRelativePath).toBe('a/b')
		expect(dirB.name).toBe('b')

		expect(dirB.children).toHaveLength(2)
		expect(dirB.getChild('c')).toBeInstanceOf(Directory)
		expect(dirB.getChild('e.txt')).toBeInstanceOf(File)
		expect(await dirB.getChild('e.txt')!.text()).toBe('I am file E')
	})

	it('updates the stats when adding new children', async () => {
		const dir = new Directory('base')

		expect(dir.size).toBe(0)

		await dir.addChild(new File(['a'.repeat(1024)], 'my-file', { lastModified: 999 }))
		expect(dir.size).toBe(1024)
		expect(dir.lastModified).toBe(999)

		await dir.addChild(new File(['a'.repeat(1024)], 'my-other-file', { lastModified: 8888 }))
		expect(dir.size).toBe(2048)
		expect(dir.lastModified).toBe(8888)

		await dir.addChild(new File(['a'.repeat(1024)], 'my-older-file', { lastModified: 500 }))
		expect(dir.size).toBe(3072)
		expect(dir.lastModified).toBe(8888)
	})
})
