/**
 * SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/**
 * Helpers to generate a file tree when the File and Directory API is used (e.g. Drag and Drop or <input type="file" webkitdirectory>)
 */

import { basename } from '@nextcloud/paths'
import { isFileSystemDirectoryEntry, isFileSystemFileEntry } from './filesystem.ts'

/**
 * This is a helper class to allow building a file tree for uploading
 * It allows to create virtual directories
 */
export class Directory extends File {

	private _originalName: string
	private _path: string
	private _children: Map<string, File|this>

	constructor(path: string, children?: Array<File|FileSystemEntry>) {
		super([], basename(path), { type: 'httpd/unix-directory', lastModified: 0 })
		this._children = new Map()
		this._originalName = basename(path)
		this._path = path

		if (children) {
			children.forEach((c) => this.addChild(c))
		}
	}

	get size(): number {
		return this.children.reduce((sum, file) => sum + file.size, 0)
	}

	get lastModified(): number {
		return this.children.reduce((latest, file) => Math.max(latest, file.lastModified), 0)
	}

	// We need this to keep track of renamed files
	get originalName(): string {
		return this._originalName
	}

	get children(): Array<File|Directory> {
		return Array.from(this._children.values())
	}

	get webkitRelativePath(): string {
		return this._path
	}

	getChild(name: string): File|Directory|null {
		return this._children.get(name) ?? null
	}

	async addChild(file: File|FileSystemEntry) {
		const rootPath = this._path && `${this._path}/`
		if (isFileSystemFileEntry(file)) {
			file = await new Promise<File>((resolve, reject) => (file as FileSystemFileEntry).file(resolve, reject))
		} else if (isFileSystemDirectoryEntry(file)) {
			const reader = file.createReader()
			const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject))
			this._children.set(file.name, new Directory(`${rootPath}${file.name}`, entries))
			return
		}

		// Make Typescript calm - we ensured it is not a file system entry above.
		file = file as File

		const filePath = file.webkitRelativePath ?? file.name
		// Handle plain files
		if (!filePath.includes('/')) {
			// Direct child of the directory
			this._children.set(file.name, file)
		} else {
			// Check if file is a child
			if (!filePath.startsWith(this._path)) {
				throw new Error(`File ${filePath} is not a child of ${this._path}`)
			}
			// If file is a child check if we need to nest it
			const relPath = filePath.slice(rootPath.length)
			const name = basename(relPath)
			// It is a direct child
			if (name === relPath) {
				this._children.set(name, file)
			} else {
				const base = relPath.slice(0, relPath.indexOf('/'))
				if (this._children.has(base)) {
					(this._children.get(base) as Directory).addChild(file)
				} else {
					this._children.set(base, new Directory(`${rootPath}${base}`, [file]))
				}
			}
		}
	}

}
