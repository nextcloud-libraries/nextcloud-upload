import type { Node } from '@nextcloud/files'

import { Uploader } from './uploader'
import UploadPicker from './components/UploadPicker.vue'
import { createApp, defineAsyncComponent } from 'vue'

export type { Uploader } from './uploader'
export { Status as UploaderStatus } from './uploader'
export { Upload, Status as UploadStatus } from './upload'

let _uploader: Uploader | null = null

export type ConflictResolutionResult<T extends File|FileSystemEntry|Node> = {
	selected: T[],
	renamed: T[],
}
/**
 * Get an Uploader instance
 */
export function getUploader(): Uploader {
	const isPublic = document.querySelector('input[name="isPublic"][value="1"]') !== null

	if (_uploader instanceof Uploader) {
		return _uploader
	}

	// Init uploader
	_uploader = new Uploader(isPublic)
	return _uploader
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

interface ConflictPickerOptions {
	/**
	 * When this is set to true a hint is shown that conflicts in directories are handles recursivly
	 * You still need to call this function for each directory separatly.
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
	const ConflictPicker = defineAsyncComponent(() => import('./components/ConflictPicker.vue'))
	return new Promise((resolve, reject) => {
		const container = document.body.appendChild(document.createElement('div'))

		const picker = createApp(ConflictPicker, {
			dirname,
			conflicts,
			content,
			recursiveUpload: options?.recursive === true,
			onSubmit(results: ConflictResolutionResult<T>) {
				// Return the results
				resolve(results)

				// Destroy the component
				picker.unmount()
				container.remove()
			},
			onCancel(error?: Error) {
				// Reject the promise
				reject(error ?? new Error('Canceled'))

				// Destroy the component
				picker.unmount()
				container.remove()
			},
		})

		// Mount the component
		picker.mount(container)
	})
}

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
		const name = (node instanceof File || node instanceof FileSystemEntry) ? node.name : node.basename
		return contentNames.indexOf(name) !== -1
	})

	return conflicts
}

/** UploadPicker vue component */
export { UploadPicker }
