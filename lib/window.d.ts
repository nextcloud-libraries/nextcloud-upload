/// <reference types="@nextcloud/typings" />
/**
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
export {}

declare global {
	interface Window {
		OC: Nextcloud.v28.OC & {
			appConfig: {
				files: {
					max_chunk_size: number
				}
			}
		}
	}
}
