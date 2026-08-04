<!--
  - SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->
<template>
	<span class="node-picker">
		<!-- Icon or preview -->
		<template v-if="!showPreview">
			<FolderSvg v-if="isFolder" class="node-picker__icon" :size="48" />
			<FileSvg v-else class="node-picker__icon" :size="48" />
		</template>
		<img v-else
			class="node-picker__preview"
			:src="preview"
			alt=""
			loading="lazy"
			@error="previewFailed = true">

		<!-- Description -->
		<span class="node-picker__desc">
			<NcDateTime v-if="mtime"
				:timestamp="mtime"
				:relative-time="false"
				:format="{ timeStyle: 'short', dateStyle: 'medium' }"
				class="node-picker__mtime"
				:class="{ 'node-picker__value--bold': boldDate }" />
			<span v-else class="node-picker__mtime">
				{{ t('Last modified date unknown') }}
			</span>
			<span class="node-picker__size" :class="{ 'node-picker__value--bold': boldSize }">
				{{ formattedSize }}
			</span>

			<!-- The column heading labels this visually, keep it for screen readers -->
			<span class="hidden-visually">{{ label }}</span>
		</span>
	</span>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { formatFileSize } from '@nextcloud/files'

import FileSvg from 'vue-material-design-icons/File.vue'
import FolderSvg from 'vue-material-design-icons/Folder.vue'
import NcDateTime from '@nextcloud/vue/dist/Components/NcDateTime.js'

import { t } from '../../utils/l10n.ts'

export default defineComponent({
	name: 'NodePickerCard',

	components: {
		FileSvg,
		FolderSvg,
		NcDateTime,
	},

	props: {
		/** Preview url, if any */
		preview: {
			type: String,
			default: null,
		},

		/** Last modified date, if known */
		mtime: {
			type: Date,
			default: null,
		},

		/** Size in bytes, if known */
		size: {
			type: Number,
			default: null,
		},

		/** Use the folder icon as fallback */
		isFolder: {
			type: Boolean,
			default: false,
		},

		/** Label for screen readers ("Existing version"/"New version") */
		label: {
			type: String,
			required: true,
		},

		/** Highlight the date as it is the more recent one */
		boldDate: {
			type: Boolean,
			default: false,
		},

		/** Highlight the size as it is the bigger one */
		boldSize: {
			type: Boolean,
			default: false,
		},
	},

	data() {
		return {
			// Previews can 404, fall back to the icon instead of a broken image
			previewFailed: false,
		}
	},

	computed: {
		showPreview(): boolean {
			return !!this.preview && !this.previewFailed
		},

		formattedSize(): string {
			if (this.size) {
				return formatFileSize(this.size, true)
			}
			return t('Unknown size')
		},
	},

	watch: {
		preview() {
			this.previewFailed = false
		},
	},

	methods: {
		t,
	},
})
</script>

<style lang="scss" scoped>
$height: 64px;

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
		object-fit: cover;
	}

	&__desc {
		display: flex;
		flex-direction: column;
		min-width: 0;
		span {
			white-space: nowrap;
		}
	}

	// Highlight whichever value differs, to ease comparison
	&__value--bold {
		font-weight: bold;
	}
}
</style>
