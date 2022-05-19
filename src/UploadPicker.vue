<template>
	<div class="upload-picker">
		<!-- New button -->
		<Button :disabled="disabled"
			@click="onClick">
			<template #icon>
				<Plus title=""
					:size="20" />
			</template>
		</Button>

		<ProgressBar v-show="uploading"
			:error="hasFailure"
			:value="progress"
			class="upload-picker__progress"
			size="medium" />

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
	</div>
</template>

<script>
import Button from '@nextcloud/vue/dist/Components/Button.js'
import Plus from 'vue-material-design-icons/Plus.vue'
import Cancel from 'vue-material-design-icons/Cancel.vue'
import ProgressBar from '@nextcloud/vue/dist/Components/ProgressBar.js'
import { getUploader } from '../lib/index.ts'
import { Uploader } from '../lib/uploader.ts'
import { Status } from '../lib/upload.ts'

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
			uploading: false,
			queue: uploadManager.queue,
		}
	},

	computed: {
		totalQueueSize() {
			return this.queue.map(upload => upload.size)
				.reduce((partialSum, a) => partialSum + a, 0)
		},
		uploadedQueueSize() {
			return this.queue.map(upload => upload.uploaded)
				.reduce((partialSum, a) => partialSum + a, 0)
		},
		progress() {
			return Math.round(this.uploadedQueueSize / this.totalQueueSize * 100) || 0
		},
		hasFailure() {
			return this.queue.filter(upload => upload.status === Status.FAILED).length !== 0
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
			this.uploading = true
			const upload = files.map(file => uploadManager.upload(file.name, file))
			await Promise.all(upload)
			this.uploading = false
		},

		/**
		 * Cancel ongoing queue
		 */
		onCancel() {
			this.queue.forEach(upload => {
				upload.cancel()
			})
			this.uploading = false
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
	min-width: 200px;

	&__progress {
		margin-left: 8px;
		margin-right: 8px;
	}
}
</style>
