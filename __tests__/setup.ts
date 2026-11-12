// Missing is jsdom, ref: https://github.com/jsdom/jsdom/issues/2555
/**
 * SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import 'blob-polyfill'
import events from 'node:events'

// p-queue (>= 10) extends `EventTarget` and calls Node's `events.setMaxListeners(Infinity, this)`.
// In the jsdom environment the global `EventTarget` is jsdom's implementation, which Node rejects,
// so ignore those targets (only relevant for tests - in browsers `process` does not exist).
const originalSetMaxListeners = events.setMaxListeners
events.setMaxListeners = (n?: number, ...targets: Parameters<typeof originalSetMaxListeners>[1][]) => {
	try {
		originalSetMaxListeners(n, ...targets)
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ERR_INVALID_ARG_TYPE') {
			throw error
		}
	}
}
