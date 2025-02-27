/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { Node } from '@nextcloud/files'
import type { AsyncComponent } from 'vue'

import { isPublicShare } from '@nextcloud/sharing/public'
import Vue, { defineAsyncComponent } from 'vue'

import { Uploader } from './uploader/uploader'
import UploadPicker from './components/UploadPicker.vue'

export type { IDirectory, Directory } from './utils/fileTree'
export { getConflicts, hasConflict, uploadConflictHandler } from './utils/conflicts'
export { Upload, Status as UploadStatus } from './upload'
export * from './uploader/index.ts'

export type ConflictResolutionResult<T extends File|FileSystemEntry|Node> = {
	selected: T[],
	renamed: T[],
}

/**
 * Get the global Uploader instance.
 *
 * Note: If you need a local uploader you can just create a new instance,
 * this global instance will be shared with other apps.
 *
 * @param isPublic Set to true to use public upload endpoint (by default it is auto detected)
 * @param forceRecreate Force a new uploader instance - main purpose is for testing
 */
export function getUploader(isPublic: boolean = isPublicShare(), forceRecreate = false): Uploader {
	if (forceRecreate || window._nc_uploader === undefined) {
		window._nc_uploader = new Uploader(isPublic)
	}

	return window._nc_uploader
}

/**
 * Upload a file
 * This will init an Uploader instance if none exists.
 * You will be able to retrieve it with `getUploader`
 *
 * @param {string} destinationPath the destination path
 * @param {File} file the file to upload
 * @return {Uploader} the uploader instance
 */
export function upload(destinationPath: string, file: File): Uploader {
	// Init uploader and start uploading
	const uploader = getUploader()
	uploader.upload(destinationPath, file)

	return uploader
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

/** UploadPicker vue component */
export { UploadPicker }
