/**
 * SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Node } from '@nextcloud/files'
import type { IDirectory } from '../utils/fileTree.ts'

import { showInfo, showWarning } from '@nextcloud/dialogs'
import { getUniqueName, InvalidFilenameError, validateFilename } from '@nextcloud/files'
import { basename } from '@nextcloud/paths'

import { openConflictPicker } from '../index.ts'
import { showInvalidFilenameDialog } from './dialog.ts'
import { t } from './l10n.ts'
import logger from './logger.ts'

/**
 * Check if there is a conflict between two sets of files
 * @param {Array<File|FileSystemEntry|Node>} files the incoming files
 * @param {Node[]} content all the existing files in the directory
 * @return {boolean} true if there is a conflict
 */
export function hasConflict(files: (File|FileSystemEntry|Node)[], content: Node[]): boolean {
	return getConflicts(files, content).length > 0
}

/**
 * Get the conflicts between two sets of files
 * @param {Array<File|FileSystemEntry|Node>} files the incoming files
 * @param {Node[]} content all the existing files in the directory
 * @return {boolean} true if there is a conflict
 */
export function getConflicts<T extends File|FileSystemEntry|Node>(files: T[], content: Node[]): T[] {
	const contentNames = content.map((node: Node) => node.basename)
	const conflicts = files.filter((node: File|FileSystemEntry|Node) => {
		const name = 'basename' in node ? node.basename : node.name
		return contentNames.indexOf(name) !== -1
	})

	return conflicts
}

/**
 * Helper function to create a conflict resolution callback for the `Uploader.batchUpload` method.
 *
 * This creates a callback that will open the conflict picker to resolve the conflicts.
 * In case of a rename the new name is validated and the invalid filename dialog is shown an error happens there.
 *
 * @param contentsCallback Callback to retrieve contents of a given path
 */
export function uploadConflictHandler(contentsCallback: (path: string) => Promise<Node[]>) {
	return async (nodes: Array<File|IDirectory>, path: string): Promise<Array<File|IDirectory>|false> => {
		try {
			const content = await contentsCallback(path).catch(() => [])
			const conflicts = getConflicts(nodes, content)

			// First handle conflicts as this might already remove invalid files
			if (conflicts.length > 0) {
				const { selected, renamed } = await openConflictPicker(path, conflicts, content, { recursive: true })
				nodes = [
					...nodes.filter((node) => !conflicts.includes(node)),
					...selected,
					...renamed,
				]
			}

			// We need to check all files for invalid characters
			const filesToUpload: Array<File|IDirectory> = []
			for (const file of nodes) {
				try {
					validateFilename(file.name)
					// No invalid name used on this file, so just continue
					filesToUpload.push(file)
				} catch (error) {
					// do not handle other errors
					if (!(error instanceof InvalidFilenameError)) {
						logger.error(`Unexpected error while validating ${file.name}`, { error })
						throw error
					}
					// Handle invalid path
					let newName = await showInvalidFilenameDialog(error)
					if (newName !== false) {
						// create a new valid path name
						newName = getUniqueName(newName, nodes.map((node) => node.name))
						Object.defineProperty(file, 'name', { value: newName })
						filesToUpload.push(file)
					}
				}
			}
			if (filesToUpload.length === 0 && nodes.length > 0) {
				const folder = basename(path)
				showInfo(folder
					? t('Upload of "{folder}" has been skipped', { folder })
					: t('Upload has been skipped'),
				)
			}
			return filesToUpload
		} catch (error) {
			logger.debug('Upload has been cancelled', { error })
			showWarning(t('Upload has been cancelled'))
			return false
		}
	}
}
