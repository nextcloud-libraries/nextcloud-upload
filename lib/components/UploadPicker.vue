<template>
	<form ref="form"
		:class="{'upload-picker--uploading': isUploading, 'upload-picker--paused': isPaused}"
		class="upload-picker"
		data-upload-picker>
		<!-- New button -->
		<Button v-if="newFileMenuEntries.length === 0"
			:disabled="disabled"
			data-upload-picker-add
			@click="onClick">
			<template #icon>
				<Plus title="" :size="20" decorative />
			</template>
			{{ addLabel }}
		</Button>

		<!-- New file menu -->
		<Actions v-else :menu-title="addLabel">
			<template #icon>
				<Plus title="" :size="20" decorative />
			</template>
			<ActionButton data-upload-picker-add @click="onClick">
				<template #icon>
					<Upload title="" :size="20" decorative />
				</template>
				{{ uploadLabel }}
			</ActionButton>

			<!-- Custom new file entries -->
			<ActionButton v-for="entry in newFileMenuEntries"
				:key="entry.id"
				:icon="entry.iconClass"
				class="upload-picker__menu-entry"
				@click="entry.handler">
				<template #icon>
					<ActionIcon :svg="entry.iconSvgInline" />
				</template>
				{{ entry.displayName }}
			</ActionButton>
		</Actions>

		<!-- Progressbar and status, hidden by css -->
		<div class="upload-picker__progress">
			<ProgressBar :error="hasFailure"
				:value="progress"
				size="medium" />
			<p>{{ timeLeft }}</p>
		</div>

		<!-- Cancel upload button -->
		<Button v-if="isUploading"
			class="upload-picker__cancel"
			type="tertiary"
			:aria-label="cancelLabel"
			data-upload-picker-cancel
			@click="onCancel">
			<template #icon>
				<Cancel title=""
					:size="20" />
			</template>
		</Button>

		<!-- Hidden files picker input -->
		<input v-show="false"
			ref="input"
			type="file"
			:accept="accept"
			:multiple="multiple"
			data-upload-picker-input
			@change="onPick">
	</form>
</template>

<script>
import { getNewFileMenuEntries } from '@nextcloud/files'
import { getUploader } from '../index.ts'
import makeEta from 'simple-eta'

import ActionButton from '@nextcloud/vue/dist/Components/ActionButton.js'
import Actions from '@nextcloud/vue/dist/Components/Actions.js'
import Button from '@nextcloud/vue/dist/Components/Button.js'
import ProgressBar from '@nextcloud/vue/dist/Components/ProgressBar.js'

import Cancel from 'vue-material-design-icons/Cancel.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Upload from 'vue-material-design-icons/Upload.vue'

import { Status as UploadStatus } from '../upload.ts'
import { t } from '../utils/l10n.ts'
import { Uploader, Status } from '../uploader.ts'
import ActionIcon from './ActionIcon.vue'
import logger from '../utils/logger'

/** @type {Uploader} */
const uploadManager = getUploader()

export default {
	name: 'UploadPicker',
	components: {
		ActionButton,
		ActionIcon,
		Actions,
		Button,
		Cancel,
		Plus,
		ProgressBar,
		Upload,
	},

	props: {
		accept: {
			type: Array,
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
			type: String,
			default: '/',
		},
	},

	data() {
		return {
			addLabel: t('Add'),
			cancelLabel: t('Cancel uploads'),
			uploadLabel: t('Upload files'),

			eta: null,
			timeLeft: '',

			newFileMenuEntries: getNewFileMenuEntries(),
			uploadManager,
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
		hasFailure() {
			return this.uploadManager.queue?.filter(upload => upload.status === UploadStatus.FAILED).length !== 0
		},
		isUploading() {
			return this.uploadManager.queue?.length > 0
		},
		isAssembling() {
			return this.uploadManager.queue?.filter(upload => upload.status === UploadStatus.ASSEMBLING).length !== 0
		},
		isPaused() {
			return this.uploadManager.info?.status === Status.PAUSED
		},
	},

	watch: {
		totalQueueSize(size) {
			this.eta = makeEta({ min: 0, max: size })
			this.updateStatus()
		},

		uploadedQueueSize(size) {
			this.eta.report(size)
			this.updateStatus()
		},

		destination(destination) {
			this.setDestination(destination)
		}
	},

	beforeMount() {
		this.setDestination(this.destination)
		logger.debug(`UploadPicker initialised`)
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
			const files = [...this.$refs.input.files]
			files.forEach(file => {
				uploadManager.upload(file.name, file)
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
			logger.debug(`Destination path set to ${destination}`)
			this.uploadManager.destination = destination
		}
	},
}
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
		// Visually more pleasing
		margin-right: 20px;
		margin-left: 8px;

		p {
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}
	}

	&--uploading &__progress {
		max-width: $progress-width;
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
