/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type { ConflictResolutionResult, ConflictPickerOptions } from './ui/ui.ts'
export { openConflictPicker, uploadConflictHandler, UploadPicker } from './ui/ui.ts'

export type { Directory, IDirectory, Eta, EtaEventsMap } from './core/core.ts'
export { EtaStatus, getConflicts, getUploader, hasConflict, upload, Upload, UploadStatus, Uploader, UploaderStatus } from './core/core.ts'
