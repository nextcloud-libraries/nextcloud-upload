/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type { IDirectory, Directory } from './utils/fileTree'
export { getConflicts, hasConflict } from './utils/conflicts.ts'
export { uploadConflictHandler } from './dialogs/utils/uploadConflictHandler.ts'
export { Upload, Status as UploadStatus } from './upload'
export * from './uploader/index.ts'
export { openConflictPicker } from './dialogs/openConflictPicker.ts'
export type { ConflictResolutionResult, ConflictPickerOptions } from './dialogs/openConflictPicker.ts'
export { getUploader, upload } from './getUploader.ts'
