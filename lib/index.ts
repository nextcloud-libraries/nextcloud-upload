/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { Node } from '@nextcloud/files'
import type { AsyncComponent } from 'vue'

import { isPublicShare } from '@nextcloud/sharing/public'

import { Uploader } from './uploader/uploader'
import UploadPicker from './vue/components/UploadPicker.vue'

export type { IDirectory, Directory } from './utils/fileTree'
export { getConflicts, hasConflict } from './utils/conflicts.ts'
export { uploadConflictHandler } from './dialogs/utils/uploadConflictHandler.ts'
export { Upload, Status as UploadStatus } from './upload'
export * from './uploader/index.ts'
export { openConflictPicker } from './dialogs/openConflictPicker.ts'
export type { ConflictResolutionResult, ConflictPickerOptions } from './dialogs/openConflictPicker.ts'

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

/** UploadPicker vue component */
export { UploadPicker }
