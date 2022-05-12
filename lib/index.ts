import { Uploader } from "./upload"

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

export function upload(path: string, data: Buffer): Uploader {

	// Init uploader and start uploading
	_uploader = getUploader()
	_uploader.upload(path, data)

	return _uploader
}