import { basename, extname } from 'path'

/**
 * Get a unique name for a file based
 * on the existing directory content.
 * @param {string} name The original file name with extension
 * @param {string} names The existing directory content names
 * @return {string} A unique name
 * TODO: migrate to @nextcloud/files
 */
export function getUniqueName(name: string, names: string[]): string {
	const ext = extname(name)
	let newName = name
	let i = 1
	while (names.includes(newName)) {
		newName = `${basename(name, ext)} (${i++})${ext}`
	}
	return newName
}
