/*!
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Node } from '@nextcloud/files'
import type { AsyncComponent } from 'vue'

import Vue, { defineAsyncComponent } from 'vue'

export type ConflictResolutionResult<T extends File|FileSystemEntry|Node> = {
    selected: T[],
    renamed: T[],
}

export interface ConflictPickerOptions {
    /**
     * When this is set to true a hint is shown that conflicts in directories are handles recursively
     * You still need to call this function for each directory separately.
     */
    recursive?: boolean
}

/**
 * Open the conflict resolver
 * @param {string} dirname the directory name
 * @param {(File|Node)[]} conflicts the incoming files
 * @param {Node[]} content all the existing files in the directory
 * @param {ConflictPickerOptions} options Optional settings for the conflict picker
 * @return {Promise<ConflictResolutionResult>} the selected and renamed files
 */
export async function openConflictPicker<T extends File|FileSystemEntry|Node>(
	dirname: string | undefined,
	conflicts: T[],
	content: Node[],
	options?: ConflictPickerOptions,
): Promise<ConflictResolutionResult<T>> {
	const ConflictPicker = defineAsyncComponent(() => import('./components/ConflictPicker.vue')) as AsyncComponent
	return new Promise((resolve, reject) => {
		const picker = new Vue({
			name: 'ConflictPickerRoot',
			render: (h) => h(ConflictPicker, {
				props: {
					dirname,
					conflicts,
					content,
					recursiveUpload: options?.recursive === true,
				},
				on: {
					submit(results: ConflictResolutionResult<T>) {
						// Return the results
						resolve(results)

						// Destroy the component
						picker.$destroy()
						picker.$el?.parentNode?.removeChild(picker.$el)
					},
					cancel(error?: Error) {
						// Reject the promise
						reject(error ?? new Error('Canceled'))

						// Destroy the component
						picker.$destroy()
						picker.$el?.parentNode?.removeChild(picker.$el)
					},
				},
			}),
		})

		// Mount the component
		picker.$mount()
		document.body.appendChild(picker.$el)
	})
}
