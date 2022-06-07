<template>
	<form ref="form" :class="{'upload-picker--uploading': isUploading, 'upload-picker--paused': isPaused}" class="upload-picker">
		<!-- New button -->
		<Button :disabled="disabled"
			@click="onClick">
			<template #icon>
				<Plus title=""
					:size="20" />
			</template>
			{{ uploadLabel }}
		</Button>

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
			@change="onPick">
	</form>
</template>

<script>
import { getUploader } from '../index.ts'
import Button from '@nextcloud/vue/dist/Components/Button.js'
import Cancel from 'vue-material-design-icons/Cancel.vue'
import makeEta from 'simple-eta'
import Plus from 'vue-material-design-icons/Plus.vue'
import ProgressBar from '@nextcloud/vue/dist/Components/ProgressBar.js'

import { Status as UploadStatus } from '../upload.ts'
import { t } from '../utils/l10n.ts'
import { Uploader, Status } from '../uploader.ts'

/**
 * @type {Uploader}
 */
const uploadManager = getUploader()

export default {
	name: 'UploadPicker',
	components: {
		Button,
		Cancel,
		Plus,
		ProgressBar,
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
	},

	data() {
		return {
			cancelLabel: t('Cancel uploads'),
			uploadLabel: t('Add'),
			eta: null,
			timeLeft: '',
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
			return this.uploadManager.queue.filter(upload => upload.status === UploadStatus.FAILED).length !== 0
		},
		isUploading() {
			return this.uploadManager.queue.length > 0
		},
		isAssembling() {
			return this.uploadManager.queue.filter(upload => upload.status === UploadStatus.ASSEMBLING).length !== 0
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
			if (estimate < 5) {
				this.timeLeft = t('a few seconds left')
				return
			}
			if (estimate > 60 * 60) {
				const hours = Math.round(estimate / (60 * 60))
				const minutes = Math.round(estimate % (60 * 60))
				this.timeLeft = t('{hours} hours and {minutes} minutes left', { hours, minutes })
				return
			}
			if (estimate > 60) {
				const minutes = Math.round(estimate / 60)
				this.timeLeft = t('{minutes} minutes left', { minutes })
				return
			}
			this.timeLeft = t('{estimate} seconds left', { estimate })
		},
	},
}
</script>

<style lang="scss" scoped>
$progress-width: 200px;

.upload-picker {
	display: inline-flex;
	align-items: center;
	height: 44px;
	margin: 200px; // TODO: remove margin

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
