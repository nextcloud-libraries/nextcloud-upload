/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type { ConflictResolutionResult, ConflictPickerOptions } from './ui/ui.ts'
export { openConflictPicker, uploadConflictHandler, UploadPicker } from './ui/ui.ts'

export type { IDirectory, Directory } from './core/utils/fileTree.ts'
export { getConflicts, hasConflict } from './core/utils/conflicts.ts'
export { Upload, Status as UploadStatus } from './core/upload.ts'
export * from './core/uploader'
export { getUploader, upload } from './core/getUploader.ts'
