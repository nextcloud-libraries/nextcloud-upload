<template>
	<form ref="form" class="upload-picker">
		<!-- New button -->
		<Button :disabled="disabled"
			@click="onClick">
			<template #icon>
				<Plus title=""
					:size="20" />
			</template>
		</Button>

		<div v-show="uploading" class="upload-picker__progress">
			<ProgressBar :error="hasFailure"
				:value="progress"
				size="medium" />
			<p>{{ timeLeft }}</p>
		</div>

		<!-- Cancel upload button -->
		<Button v-if="uploading"
			class="upload-picker__cancel"
			type="tertiary"
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
import Button from '@nextcloud/vue/dist/Components/Button.js'
import Plus from 'vue-material-design-icons/Plus.vue'
import Cancel from 'vue-material-design-icons/Cancel.vue'
import ProgressBar from '@nextcloud/vue/dist/Components/ProgressBar.js'
import { getUploader } from '../lib/index.ts'
import { Uploader } from '../lib/uploader.ts'
import { Status as UploadStatus } from '../lib/upload.ts'
import makeEta from 'simple-eta'

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
			eta: null,
			timeLeft: '',
			uploadManager,
		}
	},

	computed: {
		totalQueueSize() {
			return this.uploadManager?.info?.size || 0
		},
		uploadedQueueSize() {
			return this.uploadManager?.info?.progress || 0
		},
		uploading() {
			return this.uploadManager.queue.length > 0
		},
		progress() {
			return Math.round(this.uploadedQueueSize / this.totalQueueSize * 100) || 0
		},
		hasFailure() {
			return this.uploadManager.queue.filter(upload => upload.status === UploadStatus.FAILED).length !== 0
		},
		isAssembling() {
			return this.uploadManager.queue.filter(upload => upload.status === UploadStatus.ASSEMBLING).length !== 0
		},
	},

	watch: {
		totalQueueSize(size) {
			this.eta = makeEta({ min: 0, max: size })
		},

		uploadedQueueSize(size) {
			this.eta.report(size)

			const estimate = Math.round(this.eta.estimate())
			if (estimate === Infinity) {
				this.timeLeft = 'estimating time left'
				return
			}
			if (estimate < 5) {
				this.timeLeft = 'a few seconds left'
				return
			}
			if (estimate > 60 * 60) {
				const hours = Math.round(estimate / (60 * 60))
				const minutes = Math.round(estimate % (60 * 60))
				this.timeLeft = `${hours} hours and ${minutes} minutes left`
				return
			}
			if (estimate > 60) {
				const minutes = Math.round(estimate / 60)
				this.timeLeft = `${minutes} minutes left`
				return
			}
			this.timeLeft = `${estimate} seconds left`
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
			const upload = files.map(file => {
				return uploadManager.upload(file.name, file)
			})
			this.$refs.form.reset()
			await Promise.all(upload)
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
	},
}
</script>

<style lang="scss" scoped>
.upload-picker {
	margin: 200px;
	display: inline-flex;
	height: 44px;
	align-items: center;

	&__progress {
		width: 200px
	}

	&__progress {
		margin-left: 8px;
		// Visually more pleasing
		margin-right: 20px;
	}
}
</style>
