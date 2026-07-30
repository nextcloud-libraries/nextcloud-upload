<!--
  - SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->
<template>
	<fieldset class="node-picker__wrapper" :data-cy-conflict-picker-fieldset="existing.basename">
		<legend>{{ existing.basename }}</legend>

		<!-- Existing file -->
		<NcCheckboxRadioSwitch v-if="!isSingle"
			:checked="isChecked(existing, oldSelected)"
			:required="!isEnoughSelected"
			:data-cy-conflict-picker-input-existing="existing.basename"
			@update:checked="onUpdateExistingChecked">
			<NodePickerCard :preview="existingPreview"
				:mtime="existingLastModified"
				:size="existingSize"
				:is-folder="isFolder(existing)"
				:label="t('Existing version')"
				:bold-date="existingNewer"
				:bold-size="existingLarger" />
		</NcCheckboxRadioSwitch>
		<NodePickerCard v-else
			:preview="existingPreview"
			:mtime="existingLastModified"
			:size="existingSize"
			:is-folder="isFolder(existing)"
			:label="t('Existing version')"
			:bold-date="existingNewer"
			:bold-size="existingLarger" />

		<!-- Points from the existing to the new version -->
		<ArrowRight class="node-picker__arrow" :size="20" />

		<!-- Incoming file -->
		<NcCheckboxRadioSwitch v-if="!isSingle"
			:checked="isChecked(incoming, newSelected)"
			:required="!isEnoughSelected"
			:data-cy-conflict-picker-input-incoming="existing.basename"
			@update:checked="onUpdateIncomingChecked">
			<NodePickerCard :preview="incomingPreview"
				:mtime="incomingLastModified"
				:size="incomingSize"
				:is-folder="isFolder(incoming)"
				:label="t('New version')"
				:bold-date="incomingNewer"
				:bold-size="incomingLarger" />
		</NcCheckboxRadioSwitch>
		<NodePickerCard v-else
			:preview="incomingPreview"
			:mtime="incomingLastModified"
			:size="incomingSize"
			:is-folder="isFolder(incoming)"
			:label="t('New version')"
			:bold-date="incomingNewer"
			:bold-size="incomingLarger" />
	</fieldset>
</template>

<script lang="ts">
import type { Node } from '@nextcloud/files'
import type { PropType } from 'vue'

import { defineComponent } from 'vue'
import { FileType } from '@nextcloud/files'
import { generateUrl } from '@nextcloud/router'

import ArrowRight from 'vue-material-design-icons/ArrowRight.vue'
import NcCheckboxRadioSwitch from '@nextcloud/vue/dist/Components/NcCheckboxRadioSwitch.js'

import { isFileSystemEntry, isFileSystemFileEntry } from '../../utils/filesystem.ts'
import { t } from '../../utils/l10n.ts'
import NodePickerCard from './NodePickerCard.vue'

const PREVIEW_SIZE = 64

export default defineComponent({
	name: 'NodesPicker',

	components: {
		ArrowRight,
		NcCheckboxRadioSwitch,
		NodePickerCard,
	},

	props: {
		incoming: {
			type: [File, Object] as PropType<File|FileSystemEntry|Node>,
			required: true,
		},
		existing: {
			type: Object as PropType<Node>,
			required: true,
		},
		newSelected: {
			type: Array as PropType<(File|FileSystemEntry|Node)[]>,
			required: true,
		},
		oldSelected: {
			type: Array as PropType<Node[]>,
			required: true,
		},

		/**
		 * Single file mode: show both versions without checkboxes.
		 * The parent offers "Keep both" and "Replace" buttons instead.
		 */
		isSingle: {
			type: Boolean,
			default: false,
		},
	},

	data() {
		return {
			asyncPreview: null as string | null,
			incomingFile: null as File | null,
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
			if (!this.incomingFile) {
				return null
			}

			const preview = this.previewUrl(this.incomingFile)
			return preview ?? this.asyncPreview
		},

		incomingLastModified(): Date | null {
			if (!this.incomingFile) {
				return null
			}
			return this.lastModified(this.incomingFile)
		},

		incomingSize(): number | null {
			return this.incomingFile?.size ?? null
		},

		existingPreview() {
			return this.previewUrl(this.existing)
		},

		existingLastModified() {
			return this.lastModified(this.existing)
		},

		existingSize(): number | null {
			return this.existing.size ?? null
		},

		// Highlight the more recent date and the bigger size to ease comparison
		incomingNewer(): boolean {
			return this.isBigger(this.incomingLastModified?.getTime(), this.existingLastModified?.getTime())
		},
		existingNewer(): boolean {
			return this.isBigger(this.existingLastModified?.getTime(), this.incomingLastModified?.getTime())
		},
		incomingLarger(): boolean {
			return this.isBigger(this.incomingSize, this.existingSize)
		},
		existingLarger(): boolean {
			return this.isBigger(this.existingSize, this.incomingSize)
		},
	},

	watch: {
		/**
		 * Watch "incoming" to update "incomingFile"
		 */
		incoming: {
			// Run the watcher also on mount with initial "incoming" value
			immediate: true,
			async handler() {
				if (this.incoming instanceof File) {
					// If "incoming" is a file then just use that
					this.incomingFile = this.incoming
				} else if (isFileSystemFileEntry(this.incoming)) {
					// For FileSystemEntry we only support the file type
					this.incomingFile = await new Promise<File>((resolve, reject) => (this.incoming as FileSystemFileEntry).file(resolve, reject))
				} else {
					// We do not support directories here
					this.incomingFile = null
				}
			},
		},
	},

	methods: {
		/**
		 * Both values need to be known, otherwise there is nothing to compare.
		 * @param value the value to highlight if it is the bigger one
		 * @param other the value to compare against
		 */
		isBigger(value?: number | null, other?: number | null): boolean {
			if (!value || !other) {
				return false
			}
			return value > other
		},

		lastModified(node: File|Node): Date | null {
			const lastModified = node instanceof File
				? new Date(node.lastModified)
				: node.mtime
			return lastModified ?? null
		},
		previewUrl(node: File|Node) {
			if (node instanceof File) {
				this.previewImage(node).then((url: string | null) => {
					this.asyncPreview = url
				})
				return null
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

				// Etag to force refresh preview on change
				const etag = node.attributes?.etag || ''
				url.searchParams.set('v', etag.slice(0, 6))

				return url.href
			} catch (e) {
				return null
			}
		},

		isFolder(node: File|FileSystemEntry|Node): boolean {
			if (isFileSystemEntry(node)) {
				return node.isDirectory
			}
			// For typescript cast it as we are sure it is no FileSystemEntry here
			node = node as File|Node
			// Guess based on node type
			return node.type === FileType.Folder
				|| node.type === 'httpd/unix-directory'
		},

		isChecked(node: File|FileSystemEntry|Node, selected: (File|FileSystemEntry|Node)[]): boolean {
			return selected.includes(node)
		},

		onUpdateIncomingChecked(checked: boolean) {
			if (checked) {
				this.$emit('update:newSelected', [this.incoming, ...this.newSelected])
			} else {
				this.$emit('update:newSelected', this.newSelected.filter((node) => node !== this.incoming))
			}
		},
		onUpdateExistingChecked(checked: boolean) {
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
				if (file instanceof File && file.type.startsWith('image/')) {
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
				} else {
					resolve(null)
				}
			})
		},

		t,
	},
})
</script>

<style lang="scss" scoped>
.node-picker__wrapper {
	// last fieldset does not have a border
	&:not(:last-of-type) {
		border-bottom: 1px solid var(--color-border);
	}
}

.node-picker__arrow {
	justify-self: center;
	color: var(--color-text-maxcontrast);
}

// The arrow points from the existing to the new version
[dir="rtl"] .node-picker__arrow {
	transform: scaleX(-1);
}
</style>
