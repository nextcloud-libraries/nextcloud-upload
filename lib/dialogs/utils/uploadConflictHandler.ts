/*!
 * SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Node } from '@nextcloud/files'
import type { IDirectory } from '../../utils/fileTree.ts'

import { showInfo, showWarning } from '@nextcloud/dialogs'
import { getUniqueName, InvalidFilenameError, validateFilename } from '@nextcloud/files'
import { basename } from '@nextcloud/paths'

import { getConflicts } from '../../utils/conflicts.ts'
import { openConflictPicker } from '../openConflictPicker.ts'
import { showInvalidFilenameDialog } from './dialog.ts'
import { t } from '../../utils/l10n.ts'
import logger from '../../utils/logger.ts'

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
