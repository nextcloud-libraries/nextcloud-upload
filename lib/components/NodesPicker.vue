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
				<template v-if="!incomingPreview">
					<FolderSvg v-if="isFolder(incoming)" class="node-picker__icon" :size="48" />
					<FileSvg v-else class="node-picker__icon" :size="48" />
				</template>
				<img v-else
					class="node-picker__preview"
					:src="incomingPreview"
					:alt="t('Preview image')"
					loading="lazy">

				<!-- Description -->
				<span class="node-picker__desc">
					<span class="node-picker__name">{{ t('New version') }}</span>
					<NcDateTime v-if="incomingLastModified"
						:timestamp="incomingLastModified"
						:relative-time="false"
						:format="{ timeStyle: 'short', dateStyle: 'medium' }"
						class="node-picker__mtime" />
					<span v-else class="node-picker__mtime">
						{{ t('Last modified date unknown') }}
					</span>
					<span class="node-picker__size">{{ incomingSize }}</span>
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
				<template v-if="!existingPreview">
					<FolderSvg v-if="isFolder(existing)" class="node-picker__icon" :size="48" />
					<FileSvg v-else class="node-picker__icon" :size="48" />
				</template>
				<img v-else
					class="node-picker__preview"
					:src="existingPreview"
					:alt="t('Preview image')"
					loading="lazy">

				<!-- Description -->
				<span class="node-picker__desc">
					<span class="node-picker__name">{{ t('Existing version') }}</span>
					<NcDateTime v-if="existingLastModified"
						:timestamp="existingLastModified"
						:relative-time="false"
						:format="{ timeStyle: 'short', dateStyle: 'medium' }"
						class="node-picker__mtime" />
					<span v-else class="node-picker__mtime">
						{{ t('Last modified date unknown') }}
					</span>
					<span class="node-picker__size">{{ size(existing) }}</span>
				</span>
			</span>
		</NcCheckboxRadioSwitch>
	</fieldset>
</template>

<script lang="ts">
import type { Node } from '@nextcloud/files'
import type { PropType } from 'vue'

import { defineComponent } from 'vue'
import { formatFileSize, FileType } from '@nextcloud/files'
import { generateUrl } from '@nextcloud/router'

import FileSvg from 'vue-material-design-icons/File.vue'
import FolderSvg from 'vue-material-design-icons/Folder.vue'
import NcDateTime from '@nextcloud/vue/dist/Components/NcDateTime.js'
import NcCheckboxRadioSwitch from '@nextcloud/vue/dist/Components/NcCheckboxRadioSwitch.js'

import { isFileSystemEntry } from '../utils/filesystem'
import { t } from '../utils/l10n.ts'

const PREVIEW_SIZE = 64

export default defineComponent({
	name: 'NodesPicker',

	components: {
		FileSvg,
		FolderSvg,
		NcCheckboxRadioSwitch,
		NcDateTime,
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
	},

	emits: ['update:newSelected', 'update:oldSelected'],

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

		incomingSize(): string {
			if (!this.incomingFile) {
				return t('Unknown size')
			}
			return this.size(this.incomingFile)
		},

		existingPreview() {
			return this.previewUrl(this.existing)
		},

		existingLastModified() {
			return this.lastModified(this.existing)
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
				} else if (this.incoming instanceof FileSystemFileEntry) {
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
		lastModified(node: File|Node): Date | null {
			const lastModified = node instanceof File
				? new Date(node.lastModified)
				: node.mtime
			return lastModified ?? null
		},
		size(node: File|Node): string {
			if (node.size) {
				return formatFileSize(node.size, true)
			}
			return t('Unknown size')
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

		&.folder-icon {
			color: var(--color-primary-element);
		}
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
