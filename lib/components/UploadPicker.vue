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
		<NcButton v-if="(noMenu || newFileMenuEntries.length === 0) && !canUploadFolders"
			:disabled="disabled"
			data-cy-upload-picker-add
			data-cy-upload-picker-menu-entry="upload-file"
			type="secondary"
			@click="onTriggerPick()">
			<template #icon>
				<IconPlus :size="20" />
			</template>
			{{ buttonName }}
		</NcButton>
		<NcActions v-else
			:aria-label="buttonLabel"
			:menu-name="buttonName"
			type="secondary">
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
					<IconFolderUpload style="color: var(--color-primary-element)" :size="20" />
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

		<!-- Progressbar and status -->
		<div v-show="isUploading" class="upload-picker__progress">
			<NcProgressBar :aria-label="t('Upload progress')"
				:aria-describedby="progressTimeId"
				:error="hasFailure"
				:value="progress"
				size="medium" />
			<p :id="progressTimeId">
				{{ timeLeft }}
			</p>
		</div>

		<!-- Cancel upload button -->
		<NcButton v-if="isUploading"
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
			data-cy-upload-picker-input
			type="file"
			@change="onPick">
	</form>
</template>

<script lang="ts">
import type { Entry, Node } from '@nextcloud/files'
import type { PropType } from 'vue'
import type { Upload } from '../upload.ts'

import { Folder, NewMenuEntryCategory, getNewFileMenuEntries } from '@nextcloud/files'
import makeEta from 'simple-eta'
import Vue from 'vue'

import NcActionButton from '@nextcloud/vue/dist/Components/NcActionButton.js'
import NcActionCaption from '@nextcloud/vue/dist/Components/NcActionCaption.js'
import NcActionSeparator from '@nextcloud/vue/dist/Components/NcActionSeparator.js'
import NcActions from '@nextcloud/vue/dist/Components/NcActions.js'
import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'
import NcIconSvgWrapper from '@nextcloud/vue/dist/Components/NcIconSvgWrapper.js'
import NcProgressBar from '@nextcloud/vue/dist/Components/NcProgressBar.js'

import IconCancel from 'vue-material-design-icons/Cancel.vue'
import IconFolderUpload from 'vue-material-design-icons/FolderUpload.vue'
import IconPlus from 'vue-material-design-icons/Plus.vue'
import IconUpload from 'vue-material-design-icons/Upload.vue'

import { getUploader } from '../index.ts'
import { Status } from '../uploader.ts'
import { Status as UploadStatus } from '../upload.ts'
import { t } from '../utils/l10n.ts'
import logger from '../utils/logger.ts'
import { uploadConflictHandler } from '../utils/conflicts.ts'

export default Vue.extend({
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
		 * @default false
		 */
		noMenu: {
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
			t,

			// non reactive data / properties
			progressTimeId: `nc-uploader-progress-${Math.random().toString(36).slice(7)}`,
		}
	},

	data() {
		return {
			eta: null,
			timeLeft: '',

			newFileMenuEntries: [] as Entry[],
			uploadManager: getUploader(),
		}
	},

	computed: {
		menuEntriesUpload() {
			return this.newFileMenuEntries.filter((entry) => entry.category === NewMenuEntryCategory.UploadFromDevice)
		},

		menuEntriesNew() {
			return this.newFileMenuEntries.filter((entry) => entry.category === NewMenuEntryCategory.CreateNew)
		},

		menuEntriesOther() {
			return this.newFileMenuEntries.filter((entry) => entry.category === NewMenuEntryCategory.Other)
		},
		/**
		 * Check whether the current browser supports uploading directories
		 * Hint: This does not check if the current connection supports this, as some browsers require a secure context!
		 */
		canUploadFolders() {
			return this.allowFolders && 'webkitdirectory' in document.createElement('input')
		},

		totalQueueSize() {
			return this.uploadManager.info?.size || 0
		},

		uploadedQueueSize() {
			return this.uploadManager.info?.progress || 0
		},

		progress() {
			return Math.round(this.uploadedQueueSize / this.totalQueueSize * 100) || 0
		},

		queue() {
			return this.uploadManager.queue
		},

		hasFailure() {
			return this.queue?.filter((upload: Upload) => upload.status === UploadStatus.FAILED).length !== 0
		},
		isUploading() {
			return this.queue?.length > 0
		},
		isAssembling() {
			return this.queue?.filter((upload: Upload) => upload.status === UploadStatus.ASSEMBLING).length !== 0
		},
		isPaused() {
			return this.uploadManager.info?.status === Status.PAUSED
		},

		buttonLabel() {
			return this.noMenu ? t('Upload') : t('New')
		},

		// Hide the button text if we're uploading
		buttonName() {
			if (this.isUploading) {
				return undefined
			}
			return this.buttonLabel
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

		totalQueueSize(size) {
			this.eta = makeEta({ min: 0, max: size })
			this.updateStatus()
		},

		uploadedQueueSize(size) {
			this.eta?.report?.(size)
			this.updateStatus()
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

		// Update data on upload progress
		this.uploadManager.addNotifier(this.onUploadCompletion)

		logger.debug('UploadPicker initialised')
	},

	methods: {
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
		onPick() {
			const input = this.$refs.input as HTMLInputElement
			const files = input.files ? Array.from(input.files) : []

			this.uploadManager
				.batchUpload('', files, uploadConflictHandler(this.getContent))
				.catch((error) => logger.debug('Error while uploading', { error }))
				.finally(() => this.resetForm())
		},

		resetForm() {
			const form = this.$refs.form as HTMLFormElement
			form?.reset()
		},

		/**
		 * Cancel ongoing queue
		 */
		onCancel() {
			this.uploadManager.queue.forEach(upload => {
				upload.cancel()
			})
			this.resetForm()
		},

		updateStatus() {
			if (this.isPaused) {
				this.timeLeft = t('paused')
				return
			}

			const estimate = Math.round(this.eta!.estimate())

			if (estimate === Infinity) {
				this.timeLeft = t('estimating time left')
				return
			}
			if (estimate < 10) {
				this.timeLeft = t('a few seconds left')
				return
			}
			if (estimate > 60) {
				const date = new Date(0)
				date.setSeconds(estimate)
				const time = date.toISOString().slice(11, 11 + 8)
				this.timeLeft = t('{time} left', { time }) // TRANSLATORS time has the format 00:00:00
				return
			}
			this.timeLeft = t('{seconds} seconds left', { seconds: estimate })
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
			if (upload.status === UploadStatus.FAILED) {
				this.$emit('failed', upload)
			} else {
				this.$emit('uploaded', upload)
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
