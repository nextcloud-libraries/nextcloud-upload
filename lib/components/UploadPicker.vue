<template>
	<form v-if="destination"
		ref="form"
		:class="{'upload-picker--uploading': isUploading, 'upload-picker--paused': isPaused}"
		class="upload-picker"
		data-cy-upload-picker>
		<!-- New button -->
		<NcButton v-if="newFileMenuEntries && newFileMenuEntries.length === 0"
			:disabled="disabled"
			data-cy-upload-picker-add
			@click="onClick">
			<template #icon>
				<Plus title="" :size="20" decorative />
			</template>
			{{ addLabel }}
		</NcButton>

		<!-- New file menu -->
		<NcActions v-else :menu-title="addLabel">
			<template #icon>
				<Plus title="" :size="20" decorative />
			</template>
			<NcActionButton data-cy-upload-picker-add :close-after-click="true" @click="onClick">
				<template #icon>
					<Upload title="" :size="20" decorative />
				</template>
				{{ uploadLabel }}
			</NcActionButton>

			<!-- Custom new file entries -->
			<NcActionButton v-for="entry in newFileMenuEntries"
				:key="entry.id"
				:icon="entry.iconClass"
				:close-after-click="true"
				class="upload-picker__menu-entry"
				@click="entry.handler(destination, content)">
				<template #icon>
					<NcIconSvgWrapper :svg="entry.iconSvgInline" />
				</template>
				{{ entry.displayName }}
			</NcActionButton>
		</NcActions>

		<!-- Progressbar and status, hidden by css -->
		<div class="upload-picker__progress">
			<NcProgressBar :error="hasFailure"
				:value="progress"
				size="medium" />
			<p>{{ timeLeft }}</p>
		</div>

		<!-- Cancel upload button -->
		<NcButton v-if="isUploading"
			class="upload-picker__cancel"
			type="tertiary"
			:aria-label="cancelLabel"
			data-cy-upload-picker-cancel
			@click="onCancel">
			<template #icon>
				<Cancel title=""
					:size="20" />
			</template>
		</NcButton>

		<!-- Hidden files picker input -->
		<input v-show="false"
			ref="input"
			type="file"
			:accept="accept?.join?.(', ')"
			:multiple="multiple"
			data-cy-upload-picker-input
			@change="onPick">
	</form>
</template>

<script lang="ts">
import type { Entry, Node } from '@nextcloud/files'

import { getNewFileMenuEntries, Folder } from '@nextcloud/files'
import { showError } from '@nextcloud/dialogs'
import makeEta from 'simple-eta'
import Vue from 'vue'

import NcActionButton from '@nextcloud/vue/dist/Components/NcActionButton.js'
import NcActions from '@nextcloud/vue/dist/Components/NcActions.js'
import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'
import NcIconSvgWrapper from '@nextcloud/vue/dist/Components/NcIconSvgWrapper.js'
import NcProgressBar from '@nextcloud/vue/dist/Components/NcProgressBar.js'

import Cancel from 'vue-material-design-icons/Cancel.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Upload from 'vue-material-design-icons/Upload.vue'

import { getUploader, openConflictPicker } from '../index.ts'
import { Status } from '../uploader.ts'
import { Status as UploadStatus } from '../upload.ts'
import { t } from '../utils/l10n.ts'
import logger from '../utils/logger.ts'

export default Vue.extend({
	name: 'UploadPicker',
	components: {
		Cancel,
		NcActionButton,
		NcActions,
		NcButton,
		NcIconSvgWrapper,
		NcProgressBar,
		Plus,
		Upload,
	},

	props: {
		accept: {
			type: Array as () => string[],
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
		destination: {
			type: Folder,
			default: undefined,
		},
		/**
		 * List of file present in the destination folder
		 */
		content: {
			type: Array as () => Node[],
			default: () => [],
		},
	},

	data() {
		return {
			addLabel: t('Add'),
			cancelLabel: t('Cancel uploads'),
			uploadLabel: t('Upload files'),

			eta: null,
			timeLeft: '',

			newFileMenuEntries: [] as Entry[],
			uploadManager: getUploader(),
		}
	},

	computed: {
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
			return this.queue?.filter(upload => upload.status === UploadStatus.FAILED).length !== 0
		},
		isUploading() {
			return this.queue?.length > 0
		},
		isAssembling() {
			return this.queue?.filter(upload => upload.status === UploadStatus.ASSEMBLING).length !== 0
		},
		isPaused() {
			return this.uploadManager.info?.status === Status.PAUSED
		},
	},

	watch: {
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
		 * Trigger file picker
		 */
		onClick() {
			this.$refs.input.click()
		},

		/**
		 * Start uploading
		 */
		async onPick() {
			let files = [...this.$refs.input.files] as File[]

			// Detect conflicts
			const conflicts = this.content.filter((node: Node) => {
				return files.some((file: File) => node.basename === file.name)
			}) as Node[]

			// Resolve conflicts
			if (conflicts.length > 0) {
				// List of incoming files that are in conflict
				const compareFiles = conflicts.map((node: Node) => {
					return files.find((file: File) => node.basename === file.name)
				}).filter(Boolean) as File[]

				// List of incoming files that are NOT in conflict
				const uploads = files.filter((file: File) => {
					return !compareFiles.includes(file)
				})

				try {
					// Let the user choose what to do with the conflicting files
					const { selected, renamed } = await openConflictPicker(this.destination.dirname, compareFiles, conflicts)
					files = [...uploads, ...selected, ...renamed]
				} catch (error) {
					// User cancelled
					showError(t('Upload cancelled'))
					return
				}
			}

			files.forEach(file => {
				this.uploadManager.upload(file.name, file)
					.catch(() => {
						// Ignore errors, they are handled by the upload manager
					})
			})
			this.$refs.form.reset()
		},

		/**
		 * Cancel ongoing queue
		 */
		onCancel() {
			this.uploadManager.queue.forEach(upload => {
				upload.cancel()
			})
			this.$refs.form.reset()
		},

		updateStatus() {
			if (this.isPaused) {
				this.timeLeft = t('paused')
				return
			}

			const estimate = Math.round(this.eta.estimate())

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

		setDestination(destination) {
			if (!this.destination) {
				logger.debug('Invalid destination')
				return
			}

			logger.debug('Destination set', { destination })
			this.uploadManager.destination = destination

			// If the destination change, we need to refresh the menu
			this.newFileMenuEntries = getNewFileMenuEntries(destination)
		},

		onUploadCompletion(upload) {
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
	height: 44px;

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
