import { Uploader } from './uploader'
import UploadPicker from './components/UploadPicker.js'

declare global {
  interface Window {
    OC: any;
  }
}

let _uploader: Uploader

export function getUploader(): Uploader {
	const isPublic = document.querySelector('input[name="isPublic"][value="1"]') !== null

	// Init uploader and start uploading
	_uploader = new Uploader(isPublic)
	return _uploader
}

export function upload(path: string, file: File): Uploader {

	// Init uploader and start uploading
	_uploader = getUploader()
	_uploader.upload(path, file)

	return _uploader
}

export { UploadPicker }
