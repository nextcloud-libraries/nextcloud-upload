<template>
	<fieldset class="node-picker__wrapper" :data-cy-conflict-picker-fieldset="existing.basename">
		<legend>{{ existing.basename }}</legend>

		<!-- Incoming file -->
		<NcCheckboxRadioSwitch :checked="isChecked(incoming, newSelected)"
			:required="!isEnoughSelected"
			:data-cy-conflict-picker-input-incoming="existing.basename"
			@update:checked="onUpdateIncomingChecked">
			<span class="node-picker node-picker--incoming">
				<!-- Icon or preview -->
				<FileSvg v-if="!incomingPreview" class="node-picker__icon" :size="48" />
				<img v-else
					class="node-picker__preview"
					:src="incomingPreview"
					:alt="t('Preview image')"
					loading="lazy">

				<!-- Description -->
				<span class="node-picker__desc">
					<span class="node-picker__name">{{ t('New version') }}</span>
					<span class="node-picker__mtime">{{ lastModified(incoming) }}</span>
					<span class="node-picker__size">{{ size(incoming) }}</span>
				</span>
			</span>
		</NcCheckboxRadioSwitch>

		<!-- Existing file -->
		<NcCheckboxRadioSwitch :checked="isChecked(existing, oldSelected)"
			:required="!isEnoughSelected"
			:data-cy-conflict-picker-input-existing="existing.basename"
			@update:checked="onUpdateExistingChecked">
			<span class="node-picker node-picker--existing">
				<!-- Icon or preview -->
				<FileSvg v-if="!existingPreview" class="node-picker__icon" :size="48" />
				<img v-else
					class="node-picker__preview"
					:src="existingPreview"
					:alt="t('Preview image')"
					loading="lazy">

				<!-- Description -->
				<span class="node-picker__desc">
					<span class="node-picker__name">{{ t('Existing version') }}</span>
					<span class="node-picker__mtime">{{ lastModified(existing) }}</span>
					<span class="node-picker__size">{{ size(existing) }}</span>
				</span>
			</span>
		</NcCheckboxRadioSwitch>
	</fieldset>
</template>

<script lang="ts">
import type { PropType } from 'vue'

import { File as NcFile, Folder, formatFileSize, FileType, Node } from '@nextcloud/files'
import { generateUrl } from '@nextcloud/router'
import moment from 'moment'
import Vue from 'vue'

import FileSvg from 'vue-material-design-icons/File.vue'
import NcCheckboxRadioSwitch from '@nextcloud/vue/dist/Components/NcCheckboxRadioSwitch.js'

import { t } from '../utils/l10n.ts'

const PREVIEW_SIZE = 64

export default Vue.extend({
	name: 'NodesPicker',

	components: {
		FileSvg,
		NcCheckboxRadioSwitch,
	},

	props: {
		incoming: {
			type: [Node, File, NcFile, Folder],
			required: true,
		},
		existing: {
			type: [NcFile, Folder],
			required: true,
		},
		newSelected: {
			type: Array as PropType<(File|Node)[]>,
			required: true,
		},
		oldSelected: {
			type: Array as PropType<Node[]>,
			required: true,
		},
	},

	data() {
		return {
			asyncPreview: null,
		}
	},

	computed: {
		/**
		 * Whether the incoming or existing file is selected.
		 * This is used by the parent component to ensure
		 * that the user has selected at least one of the two files.
		 */
		isEnoughSelected(): boolean {
			return this.isChecked(this.incoming, this.newSelected)
				|| this.isChecked(this.existing, this.oldSelected)
		},

		incomingPreview() {
			// If we generated a preview image, use it
			if (this.asyncPreview) {
				return this.asyncPreview
			}
			return this.previewUrl(this.incoming)
		},
		existingPreview() {
			return this.previewUrl(this.existing)
		},
	},

	methods: {
		lastModified(node: File|Node): string {
			const lastModified = node instanceof File
				? new Date(node.lastModified)
				: node.mtime
			if (lastModified) {
				return moment(lastModified).format('LLL')
			}
			return t('Last modified date unknown')
		},
		size(node: File|Node): string {
			if (node.size) {
				return formatFileSize(node.size, true)
			}
			return t('Unknown size')
		},
		previewUrl(node: File|Node) {
			if (node instanceof File) {
				this.previewImage(node).then((url: string) => {
					this.asyncPreview = url
				})
				return
			}

			if (node.type === FileType.Folder) {
				return null
			}

			try {
				const previewUrl = node.attributes.previewUrl
					|| generateUrl('/core/preview?fileId={fileid}', {
						fileid: node.fileid,
					})
				const url = new URL(window.location.origin + previewUrl)

				// Request tiny previews
				url.searchParams.set('x', PREVIEW_SIZE.toString())
				url.searchParams.set('y', PREVIEW_SIZE.toString())
				url.searchParams.set('mimeFallback', 'true')
				return url.href
			} catch (e) {
				return null
			}
		},

		isChecked(node: Node, selected: Node[]): boolean {
			return selected.includes(node)
		},

		onUpdateChecked(node: Node, selection: string): void {
			this.$emit(`update:${selection}`, ...args)
		},
		onUpdateIncomingChecked(checked) {
			if (checked) {
				this.$emit('update:newSelected', [this.incoming, ...this.newSelected])
			} else {
				this.$emit('update:newSelected', this.newSelected.filter((node) => node !== this.incoming))
			}
		},
		onUpdateExistingChecked(checked) {
			if (checked) {
				this.$emit('update:oldSelected', [this.existing, ...this.oldSelected])
			} else {
				this.$emit('update:oldSelected', this.oldSelected.filter((node) => node !== this.existing))
			}
		},

		/**
		 * Get the preview Image of a file
		 * @param file the soon-to-be-uploaded File
		 */
		async previewImage(file: File): Promise<string|null> {
			return new Promise((resolve) => {
				if (file.type.startsWith('image/')) {
					const reader = new FileReader()
					reader.onload = async (e) => {
						const result = e?.target?.result
						if (result instanceof ArrayBuffer) {
							const blob = new Blob([result], { type: file.type })
							const url = URL.createObjectURL(blob)
							resolve(url)
							return
						}
						resolve(null)
					}
					reader.readAsArrayBuffer(file)
				}
			})
		},

		t,
	},
})
</script>

<style lang="scss" scoped>
$height: 64px;

.node-picker__wrapper {
	// last fieldset does not have a border
	&:not(:last-of-type) {
		border-bottom: 1px solid var(--color-border);
	}
}

.node-picker {
	display: flex;
	align-items: center;
	height: $height;

	&__icon, &__preview {
		height: $height;
		width: $height;
		margin: 0 var(--secondary-margin);
		display: block;
		flex: 0 0 $height;
	}

	&__icon {
		color: var(--color-text-maxcontrast);
	}

	&__preview {
		overflow: hidden;
		border-radius: calc(var(--border-radius) * 2);
		background-position: center;
		background-size: cover;
	}

	&__desc {
		display: flex;
		flex-direction: column;
		span {
			white-space: nowrap;
		}
	}
}
</style>
