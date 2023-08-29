import type { Node } from '@nextcloud/files'

import { Uploader } from './uploader.js'
import UploadPicker from './components/UploadPicker.vue'

export { Status as UploaderStatus } from './uploader.js'
export { Upload, Status as UploadStatus } from './upload.js'

let _uploader: Uploader | null = null

type ConflictResolutionResult = {
	selected: File[],
	renamed: File[],
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
 */
export function upload(destinationPath: string, file: File): Uploader {

	// Init uploader and start uploading
	const uploader = getUploader()
	uploader.upload(destinationPath, file)

	return uploader
}

/**
 * Open the conflict resolver
 * @param {string} dirname the directory name
 * @param {(File|Node)[]} files the incoming files
 * @param {Node[]} conflicts the existing files
 * @return {Promise<ConflictResolutionResult>} the selected and renamed files
 */
export async function openConflictPicker(dirname: string, files: (File|Node)[], conflicts: Node[]): Promise<ConflictResolutionResult> {
	const { default: ConflictPicker } = await import('./components/ConflictPicker.vue')
	return new Promise((resolve, reject) => {
		const picker = new ConflictPicker({
			propsData: {
				dirname,
				files,
				conflicts,
			},
		})

		// Add listeners
		picker.$on('submit', (results: ConflictResolutionResult) => {
			// Return the results
			resolve(results)

			// Destroy the component
			picker.$destroy()
			picker.$el?.parentNode?.removeChild(picker.$el)
		})
		picker.$on('cancel', () => {
			reject(new Error('Canceled'))

			// Destroy the component
			picker.$destroy()
			picker.$el?.parentNode?.removeChild(picker.$el)
		})

		// Mount the component
		picker.$mount()
		document.body.appendChild(picker.$el)
	})
}

/** UploadPicker vue component */
export { UploadPicker }
