/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * @param timeout
 * @param data
 * @param signal
 */
// Fake cancellable timeout
// TODO: replace by import { setTimeout } from 'timers/promises' when min LTS is >= 16
// implemented in node 15
const timeout = (timeout: number, data = {}, signal: AbortSignal = new AbortController().signal) => {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(new DOMException('Aborted', 'AbortError'))
			return
		}
		signal.addEventListener('abort', () => {
			reject(new DOMException('Aborted', 'AbortError'))
		})

		setTimeout(() => {
			if (!signal?.aborted) {
				resolve(data)
			}
		}, timeout)
	})
}

export default {
	async request(data) {
		// Fake upload progress
		if (data.onUploadProgress) {
			await timeout(200)
			data.onUploadProgress()
		}

		// Simulate a 500ms request
		return await timeout(500, data, data.signal)
	},
}
