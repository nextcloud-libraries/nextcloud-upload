<!--
  - SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->
<template>
	<form v-if="destination"
		ref="form"
		:class="{'upload-picker--uploading': isUploading, 'upload-picker--paused': isPaused}"
		class="upload-picker"
		data-cy-upload-picker>
		<!-- New button -->
		<NcButton v-if="!haveMenu"
			:aria-label="buttonLabel"
			:disabled="disabled"
			data-cy-upload-picker-add
			data-cy-upload-picker-menu-entry="upload-file"
			:type="primary ? 'primary' : 'secondary'"
			@click="onTriggerPick()">
			<template #icon>
				<IconPlus :size="20" />
			</template>
			<template v-if="!isUploading" #default>
				{{ buttonLabel }}
			</template>
		</NcButton>

		<NcActions v-else
			:aria-label="buttonLabel"
			:menu-name="noLabel ? undefined : buttonLabel"
			:open.sync="openedMenu"
			:type="primary ? 'primary' : 'secondary'">
			<template #icon>
				<IconPlus :size="20" />
			</template>

			<NcActionCaption :name="t('Upload from device')" />

			<NcActionButton data-cy-upload-picker-add
				data-cy-upload-picker-menu-entry="upload-file"
				:close-after-click="true"
				@click="onTriggerPick()">
				<template #icon>
					<IconUpload :size="20" />
				</template>
				{{ t('Upload files') }}
			</NcActionButton>
			<NcActionButton v-if="canUploadFolders"
				close-after-click
				data-cy-upload-picker-add-folders
				data-cy-upload-picker-menu-entry="upload-folder"
				@click="onTriggerPick(true)">
				<template #icon>
					<IconFolderUpload :size="20" />
				</template>
				{{ t('Upload folders') }}
			</NcActionButton>

			<!-- App defined upload actions -->
			<template v-if="!noMenu">
				<NcActionButton v-for="entry in menuEntriesUpload"
					:key="entry.id"
					:icon="entry.iconClass"
					:close-after-click="true"
					:data-cy-upload-picker-menu-entry="entry.id"
					class="upload-picker__menu-entry"
					@click="onClick(entry)">
					<template v-if="entry.iconSvgInline" #icon>
						<NcIconSvgWrapper :svg="entry.iconSvgInline" />
					</template>
					{{ entry.displayName }}
				</NcActionButton>
			</template>

			<!-- Custom new file entries -->
			<template v-if="!noMenu && menuEntriesNew.length > 0">
				<NcActionSeparator />
				<NcActionCaption :name="t('Create new')" />
				<NcActionButton v-for="entry in menuEntriesNew"
					:key="entry.id"
					:icon="entry.iconClass"
					:close-after-click="true"
					:data-cy-upload-picker-menu-entry="entry.id"
					class="upload-picker__menu-entry"
					@click="onClick(entry)">
					<template v-if="entry.iconSvgInline" #icon>
						<NcIconSvgWrapper :svg="entry.iconSvgInline" />
					</template>
					{{ entry.displayName }}
				</NcActionButton>
			</template>

			<!-- other file entries -->
			<template v-if="!noMenu && menuEntriesOther.length > 0">
				<NcActionSeparator />
				<NcActionButton v-for="entry in menuEntriesOther"
					:key="entry.id"
					:icon="entry.iconClass"
					:close-after-click="true"
					:data-cy-upload-picker-menu-entry="entry.id"
					class="upload-picker__menu-entry"
					@click="onClick(entry)">
					<template v-if="entry.iconSvgInline" #icon>
						<NcIconSvgWrapper :svg="entry.iconSvgInline" />
					</template>
					{{ entry.displayName }}
				</NcActionButton>
			</template>
		</NcActions>

		<!-- Stable live region (do not remount — SRs announce text changes on an existing node). -->
		<div class="hidden-visually"
			role="status"
			aria-live="polite"
			aria-atomic="true"
			data-cy-upload-picker-status>
			{{ statusMessage }}
		</div>

		<!-- Progressbar and status -->
		<div v-show="isUploading" class="upload-picker__progress">
			<NcProgressBar :aria-label="t('Upload progress')"
				:aria-describedby="progressTimeId"
				:aria-valuetext="progressValueText"
				data-cy-upload-picker-progress
				:error="hasFailure"
				:value="uploadManager.eta.progress"
				size="medium" />
			<p :id="progressTimeId"
				data-cy-upload-picker-progress-label>
				<span v-if="isPaused">
					{{ t('paused') }}
				</span>
				<span v-else-if="isOnlyAssembling">
					<!-- TRANSLATORS: Chunks are assembled and the process runs -->
					{{ t('assembling') }}
				</span>
				<span v-else :title="etaTimeAndSpeed()">
					{{ uploadManager.eta.timeReadable }}
					<!-- the speed is included in the tooltip / title so we only show it in the text content if there is enough space (not showing "a few seconds left") -->
					<span v-if="uploadManager.eta.speedReadable && uploadManager.eta.time >= 60">
						({{ uploadManager.eta.speedReadable }})
					</span>
				</span>
			</p>
		</div>

		<!-- Cancel upload button -->
		<NcButton v-if="isUploading && !isOnlyAssembling"
			class="upload-picker__cancel"
			type="tertiary"
			:aria-label="t('Cancel uploads')"
			data-cy-upload-picker-cancel
			@click="onCancel">
			<template #icon>
				<IconCancel :size="20" />
			</template>
		</NcButton>

		<!-- Hidden files picker input -->
		<input ref="input"
			:accept="accept?.join?.(', ')"
			:multiple="multiple"
			class="hidden-visually"
			tabindex="-1"
			aria-hidden="true"
			data-cy-upload-picker-input
			type="file"
			@change="onPick">
	</form>
</template>

<script lang="ts">
import type { Entry, Node } from '@nextcloud/files'
import type { PropType } from 'vue'
import type { Upload } from '../../upload.ts'

import { defineComponent } from 'vue'
import { Folder, NewMenuEntryCategory, formatFileSize, getNewFileMenuEntries } from '@nextcloud/files'
// @ts-expect-error missing types
import { useHotKey } from '@nextcloud/vue/dist/Composables/useHotKey.js'

import NcActionButton from '@nextcloud/vue/dist/Components/NcActionButton.js'
import NcActionCaption from '@nextcloud/vue/dist/Components/NcActionCaption.js'
import NcActionSeparator from '@nextcloud/vue/dist/Components/NcActionSeparator.js'
import NcActions from '@nextcloud/vue/dist/Components/NcActions.js'
import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'
import NcIconSvgWrapper from '@nextcloud/vue/dist/Components/NcIconSvgWrapper.js'
import NcProgressBar from '@nextcloud/vue/dist/Components/NcProgressBar.js'

import IconCancel from 'vue-material-design-icons/Cancel.vue'
import IconFolderUpload from 'vue-material-design-icons/FolderUploadOutline.vue'
import IconPlus from 'vue-material-design-icons/Plus.vue'
import IconUpload from 'vue-material-design-icons/TrayArrowUp.vue'

import { getUploader } from '../../getUploader.ts'
import { UploaderStatus } from '../../uploader/uploader.ts'
import { Status as UploadStatus } from '../../upload.ts'
import { n, t } from '../../utils/l10n.ts'
import { uploadConflictHandler } from '../../dialogs/utils/uploadConflictHandler.ts'
import logger from '../../utils/logger.ts'

export default defineComponent({
	name: 'UploadPicker',

	components: {
		IconCancel,
		IconFolderUpload,
		IconPlus,
		IconUpload,
		NcActionButton,
		NcActionCaption,
		NcActionSeparator,
		NcActions,
		NcButton,
		NcIconSvgWrapper,
		NcProgressBar,
	},

	props: {
		accept: {
			type: Array as PropType<string[]>,
			default: null,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		multiple: {
			type: Boolean,
			default: false,
		},

		/**
		 * Allow to disable the "new"-menu for this UploadPicker instance
		 */
		noMenu: {
			type: Boolean,
			default: false,
		},

		/**
		 * Allow to disable the button label
		 */
		noLabel: {
			type: Boolean,
			default: false,
		},

		/**
		 * Make the "New"-button primary color.
		 */
		primary: {
			type: Boolean,
			default: false,
		},

		destination: {
			type: Folder,
			default: undefined,
		},
		allowFolders: {
			type: Boolean,
			default: false,
		},
		/**
		 * List of file present in the destination folder
		 * It is also possible to provide a function that takes a relative path to the current directory and returns the content of it
		 * Note: If a function is passed it should return the current base directory when no path or an empty is passed
		 */
		content: {
			type: [Array, Function] as PropType<Node[]|((relativePath?: string) => Node[]|PromiseLike<Node[]>)>,
			default: () => [],
		},

		/**
		 * Overwrite forbidden characters (by default the capabilities of the server are used)
		 * @deprecated Deprecated and will be removed in the next major version
		 */
		forbiddenCharacters: {
			type: Array as PropType<string[]>,
			default: () => [],
		},
	},

	setup() {
		return {
			n,
			t,

			// non reactive data / properties
			progressTimeId: `nc-uploader-progress-${Math.random().toString(36).slice(7)}`,
		}
	},

	data() {
		return {
			newFileMenuEntries: [] as Entry[],
			openedMenu: false,
			uploadManager: getUploader(),
			/**
			 * Bumps when the upload queue changes so computed state re-evaluates
			 * (Uploader queue mutations are not always tracked by Vue).
			 */
			queueRevision: 0,
			/** Last progress percentage committed to the live region */
			lastAnnouncedProgress: -1,
			/** Live-region message for start / progress / completion */
			statusMessage: '',
		}
	},

	computed: {
		menuEntriesUpload(): Entry[] {
			return this.newFileMenuEntries.filter((entry) => entry.category === NewMenuEntryCategory.UploadFromDevice)
		},

		menuEntriesNew(): Entry[] {
			return this.newFileMenuEntries.filter((entry) => entry.category === NewMenuEntryCategory.CreateNew)
		},

		menuEntriesOther(): Entry[] {
			return this.newFileMenuEntries.filter((entry) => entry.category === NewMenuEntryCategory.Other)
		},

		/**
		 * Check whether the current browser supports uploading directories
		 * Hint: This does not check if the current connection supports this, as some browsers require a secure context!
		 */
		canUploadFolders(): boolean {
			return this.allowFolders && 'webkitdirectory' in document.createElement('input')
		},

		queue(): Upload[] {
			// Depend on queueRevision so Vue re-reads the uploader queue after mutations
			void this.queueRevision
			return this.uploadManager.queue as Upload[]
		},

		hasFailure(): boolean {
			return this.queue.some((upload: Upload) => upload.status === UploadStatus.FAILED)
		},
		isAssembling(): boolean {
			return this.queue.some((upload: Upload) => upload.status === UploadStatus.ASSEMBLING)
		},
		/**
		 * True while uploads are actively in progress.
		 * Finished / failed / cancelled items do not keep the progress UI visible.
		 */
		isUploading(): boolean {
			return this.queue.some((upload: Upload) => [
				UploadStatus.INITIALIZED,
				UploadStatus.UPLOADING,
				UploadStatus.ASSEMBLING,
			].includes(upload.status))
		},
		isOnlyAssembling(): boolean {
			return this.isAssembling
				&& this.queue.every((upload: Upload) => (
					// ignore empty uploads or meta uploads
					upload.size === 0
					// all the uploads are assembling or finished
					|| upload.status === UploadStatus.ASSEMBLING
					|| upload.status === UploadStatus.FINISHED
				))
		},
		isPaused(): boolean {
			return this.uploadManager.info?.status === UploaderStatus.PAUSED
		},

		buttonLabel(): string {
			return this.noMenu ? t('Upload') : t('New')
		},

		haveMenu(): boolean {
			return !((this.noMenu || this.newFileMenuEntries.length === 0) && !this.canUploadFolders)
		},

		/**
		 * Human-readable progress value for the progressbar (name / role / value).
		 */
		progressValueText(): string {
			const progress = Math.round(this.uploadManager.eta.progress)
			const totalSize = this.queue
				.filter((upload: Upload) => upload.size > 0)
				.reduce((sum: number, upload: Upload) => sum + upload.size, 0)
			if (totalSize > 0) {
				return t('Upload progress: {progress}%, total size {size}', {
					progress,
					size: formatFileSize(totalSize),
				})
			}
			return t('Upload progress: {progress}%', { progress })
		},
	},

	watch: {
		allowFolders: {
			immediate: true,
			handler() {
				if (typeof this.content !== 'function' && this.allowFolders) {
					logger.error('[UploadPicker] Setting `allowFolders` is only allowed if `content` is a function')
				}
			},
		},

		destination(destination) {
			this.setDestination(destination)
		},

		isPaused(isPaused) {
			if (isPaused) {
				this.$emit('paused', this.queue)
			} else {
				this.$emit('resumed', this.queue)
			}
		},
	},

	beforeMount() {
		// Prevent init with wrong destination
		if (this.destination) {
			this.setDestination(this.destination)
		}

		// Update data on upload progress / completion
		this.uploadManager.addNotifier(this.onUploadCompletion)
		// Eta fires `update` from Uploader.updateStats() on every upload progress callback
		this.uploadManager.eta.addEventListener('update', this.onEtaUpdate)
		this.uploadManager.eta.addEventListener('reset', this.onEtaReset)

		// Register hotkeys
		useHotKey('u', this.onKeyDown, {
			stop: true,
			prevent: true,
			shift: true,
		})

		useHotKey('Escape', this.onKeyDown, {
			stop: true,
			prevent: true,
		})

		logger.debug('UploadPicker initialised')
	},

	beforeDestroy() {
		this.uploadManager.eta.removeEventListener('update', this.onEtaUpdate)
		this.uploadManager.eta.removeEventListener('reset', this.onEtaReset)
	},

	methods: {
		etaTimeAndSpeed(): string {
			const speed = this.uploadManager.eta.speedReadable
			if (speed) {
				return `${this.uploadManager.eta.timeReadable} (${speed})`
			}
			return this.uploadManager.eta.timeReadable
		},

		/**
		 * Update the status live region (same DOM node, new text).
		 *
		 * @param message Message to announce
		 */
		commitStatusMessage(message: string) {
			if (message === this.statusMessage) {
				return
			}
			this.statusMessage = message
		},

		/**
		 * Announce upload start for the selected device files (name + size).
		 * @param files Files chosen in the file picker
		 */
		announceUploadStart(files: File[]) {
			const totalSize = files.reduce((sum, file) => sum + file.size, 0)
			const sizeLabel = totalSize > 0 ? formatFileSize(totalSize) : ''

			let message = t('Upload started')
			if (files.length === 1) {
				message = sizeLabel
					? t('Upload started: {name} ({size})', { name: files[0].name, size: sizeLabel })
					: t('Upload started: {name}', { name: files[0].name })
			} else if (files.length > 1) {
				message = sizeLabel
					? n('Upload started: {count} file ({size})', 'Upload started: {count} files ({size})', files.length, { count: files.length, size: sizeLabel })
					: n('Upload started: {count} file', 'Upload started: {count} files', files.length, { count: files.length })
			}
			this.lastAnnouncedProgress = -1
			this.commitStatusMessage(message)
		},

		announceUploadProgress() {
			const progress = Math.round(this.uploadManager.eta.progress)
			if (progress <= 0 || progress === this.lastAnnouncedProgress) {
				return
			}

			// First tick, each new 25% step, or 100%
			const crossedBucket = this.lastAnnouncedProgress < 0
				|| progress >= 100
				|| Math.floor(progress / 25) > Math.floor(this.lastAnnouncedProgress / 25)
			if (!crossedBucket) {
				return
			}

			this.lastAnnouncedProgress = progress
			const totalSize = this.queue
				.filter((upload: Upload) => upload.size > 0)
				.reduce((sum: number, upload: Upload) => sum + upload.size, 0)
			const message = totalSize > 0
				? t('Upload progress: {progress}%, total size {size}', {
					progress,
					size: formatFileSize(totalSize),
				})
				: t('Upload progress: {progress}%', { progress })

			this.commitStatusMessage(message)
		},

		announceUploadFinished(uploads: Upload[]) {
			const finished = uploads.filter((upload) => upload.status === UploadStatus.FINISHED && upload.size > 0)
			let message = t('Upload finished')
			if (finished.length === 1) {
				message = t('Upload of "{name}" finished', { name: finished[0].file.name })
			} else if (finished.length > 1) {
				message = n(
					'Upload finished: {count} file uploaded',
					'Upload finished: {count} files uploaded',
					finished.length,
					{ count: finished.length },
				)
			} else if (uploads.length === 0) {
				message = t('Upload has been skipped')
			}
			this.commitStatusMessage(message)
			this.lastAnnouncedProgress = -1
		},

		onEtaUpdate() {
			this.queueRevision++
			if (!this.isPaused) {
				this.announceUploadProgress()
			}
		},

		onEtaReset() {
			this.queueRevision++
			if (!this.isUploading) {
				this.lastAnnouncedProgress = -1
			}
		},
		/**
		 * Handle clicking a new-menu entry
		 * @param entry The entry that was clicked
		 */
		async onClick(entry: Entry) {
			entry.handler(
				this.destination!,
				await this.getContent().catch(() => []),
			)
		},

		/**
		 * Trigger file picker
		 * @param uploadFolders Upload folders
		 */
		onTriggerPick(uploadFolders = false) {
			const input = this.$refs.input as HTMLInputElement
			// Setup directory picking if enabled
			if (this.canUploadFolders) {
				input.webkitdirectory = uploadFolders
			}
			// Trigger click on the input to open the file picker
			this.$nextTick(() => input.click())
		},

		/**
		 * Helper for backwards compatibility that queries the content of the current directory
		 * @param path The current path
		 */
		async getContent(path?: string) {
			return Array.isArray(this.content) ? this.content : await this.content(path)
		},

		/**
		 * Start uploading
		 */
		async onPick() {
			const input = this.$refs.input as HTMLInputElement
			const files = input.files ? Array.from(input.files) : []
			this.announceUploadStart(files)

			try {
				const uploads = await this.uploadManager
					.batchUpload('', files, uploadConflictHandler(this.getContent))
				this.announceUploadFinished(uploads)
			} catch (error) {
				logger.debug('Error while uploading', { error })
				this.commitStatusMessage(t('Upload has been cancelled'))
			} finally {
				this.queueRevision++
				this.resetForm()
			}
		},

		resetForm() {
			const form = this.$refs.form as HTMLFormElement
			form?.reset()
		},

		/**
		 * Cancel ongoing queue
		 */
		onCancel() {
			this.uploadManager.queue.forEach((upload: Upload) => {
				upload.cancel()
			})
			this.commitStatusMessage(t('Upload has been cancelled'))
			this.queueRevision++
			this.resetForm()
		},

		setDestination(destination: Folder) {
			if (!this.destination) {
				logger.debug('Invalid destination')
				return
			}

			this.uploadManager.destination = destination

			// If the destination change, we need to refresh the menu
			this.newFileMenuEntries = getNewFileMenuEntries(destination)
		},

		onUploadCompletion(upload: Upload) {
			this.queueRevision++
			if (upload.status === UploadStatus.FAILED) {
				this.$emit('failed', upload)
			} else {
				this.$emit('uploaded', upload)
			}
		},

		onKeyDown(event: KeyboardEvent) {
			// Shift + u opens the menu
			if (event.key === 'u') {
				// If we have a menu, open it
				if (this.haveMenu) {
					this.openedMenu = true
					return
				}

				// Otherwise, trigger the default action
				this.onTriggerPick()
			}

			if (event.key === 'Escape' && this.openedMenu) {
				this.openedMenu = false
			}
		},
	},
})
</script>

<style lang="scss" scoped>
$progress-width: 200px;

.upload-picker {
	display: inline-flex;
	align-items: center;
	height: var(--default-clickable-area);

	&__progress {
		width: $progress-width;
		// Animate show/hide
		max-width: 0;
		transition: max-width var(--animation-quick) ease-in-out;

		// Align progress/text separation with the middle
		margin-top: 8px;

		p {
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}
	}

	&--uploading &__progress {
		max-width: $progress-width;

		// Visually more pleasing
		margin-right: 20px;
		margin-left: 8px;
	}

	&--paused &__progress {
		animation: breathing 3s ease-out infinite normal;
	}
}

@keyframes breathing {
	0% {
		opacity: .5;
	}
	25% {
		opacity: 1;
	}
	60% {
		opacity: .5;
	}
	100% {
		opacity: .5;
	}
}

</style>
