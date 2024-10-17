/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
export const getCurrentUser = function() {
	return {
		uid: 'test',
		displayName: 'Test',
		isAdmin: false,
	}
}

/** Mock the request token */
export function getRequestToken() {
	return 'request-token'
}

/** Mock that receives a parameter (callback) */
export function onRequestTokenUpdate() {
}
