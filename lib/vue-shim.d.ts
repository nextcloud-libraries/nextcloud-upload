/**
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
declare module '*.vue' {
	import Vue from 'vue'
	export default Vue
}

declare module '@nextcloud/vue/functions/dialog' {
	import { Component, AsyncComponent } from 'vue'
	type SpawnDialogOptions = {
		/**
		 * Container to mount the dialog to
		 *
		 * @default document.body
		 */
		container?: Element | string;
	}
	export declare function spawnDialog(dialog: Component | AsyncComponent, props?: object, onClose?: (...rest: unknown[]) => void): void
	export declare function spawnDialog(dialog: Component | AsyncComponent, props?: object, options?: SpawnDialogOptions, onClose?: (...rest: unknown[]) => void): void
}
