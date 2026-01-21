/**
 * SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { InvalidFilenameError } from '@nextcloud/files'

import { spawnDialog } from '@nextcloud/vue/functions/dialog'
import { validateFilename } from '@nextcloud/files'
import { defineAsyncComponent } from 'vue'

/**
 * Show a dialog to let the user decide how to proceed with invalid filenames.
 * The returned promise resolves to false if the file should be skipped, and resolves to a string if it should be renamed.
 * The promise rejects when the user want to abort the operation.
 *
 * @param error the validation error
 */
export function showInvalidFilenameDialog(error: InvalidFilenameError): Promise<string | false> {
	const InvalidFilenameDialog = defineAsyncComponent(() => import('../components/InvalidFilenameDialog.vue'))

	const { promise, reject, resolve } = Promise.withResolvers<string | false>()
	spawnDialog(
		InvalidFilenameDialog,
		{
			error,
			validateFilename,
		},
		(...rest) => {
			const [{ skip, rename }] = rest as [{ cancel?: true, skip?: true, rename?: string }]
			if (skip) {
				resolve(false)
			} else if (rename) {
				resolve(rename)
			} else {
				reject()
			}
		},
	)
	return promise
}
