/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export { default as UploadPicker } from './ui/components/UploadPicker.vue'
export type { IDirectory, Directory } from './core/utils/fileTree.ts'
export { getConflicts, hasConflict } from './core/utils/conflicts.ts'
export { uploadConflictHandler } from './ui/utils/uploadConflictHandler.ts'
export { Upload, Status as UploadStatus } from './core/upload.ts'
export * from './core/uploader'
export { openConflictPicker } from './ui/openConflictPicker.ts'
export type { ConflictResolutionResult, ConflictPickerOptions } from './ui/openConflictPicker.ts'
export { getUploader, upload } from './core/getUploader.ts'
