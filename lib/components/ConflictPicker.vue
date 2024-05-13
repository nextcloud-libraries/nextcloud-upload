<template>
	<NcDialog can-close
		class="conflict-picker"
		data-cy-conflict-picker
		:close-on-click-outside="false"
		:show="opened"
		:name="name"
		size="large"
		@closing="onCancel">
		<!-- Header -->
		<div class="conflict-picker__header">
			<!-- Description -->
			<p id="conflict-picker-description" class="conflict-picker__description">
				{{ t('Which files do you want to keep?') }}<br>
				{{ t('If you select both versions, the incoming file will have a number added to its name.') }}<br>
				<template v-if="recursiveUpload">
					{{ t('When an incoming folder is selected, the content is written into the existing folder and a recursive conflict resolution is performed.') }}
				</template>
				<template v-else>
					{{ t('When an incoming folder is selected, any conflicting files within it will also be overwritten.') }}
				</template>
			</p>
		</div>

		<!-- Main form and conflict picker -->
		<form ref="form"
			class="conflict-picker__form"
			aria-labelledby="conflict-picker-description"
			data-cy-conflict-picker-form
			@submit.prevent.stop="onSubmit">
			<!-- Select all checkboxes -->
			<fieldset class="conflict-picker__all" data-cy-conflict-picker-fieldset="all">
				<legend class="hidden-visually">
					{{ t('Select all checkboxes') }}
				</legend>
				<NcCheckboxRadioSwitch v-bind="selectAllNewBind"
					data-cy-conflict-picker-input-incoming="all"
					@update:checked="onSelectAllNew">
					{{ t('Select all new files') }}
				</NcCheckboxRadioSwitch>
				<NcCheckboxRadioSwitch v-bind="selectAllOldBind"
					data-cy-conflict-picker-input-existing="all"
					@update:checked="onSelectAllOld">
					{{ t('Select all existing files') }}
				</NcCheckboxRadioSwitch>
			</fieldset>

			<!-- Files loop -->
			<NodesPicker v-for="(node, index) in files"
				ref="nodesPicker"
				:key="node.fileid"
				v-model:new-selected="newSelected"
				v-model:old-selected="oldSelected"
				:incoming="conflicts[index]"
				:existing="files[index]" />
		</form>

		<!-- Controls -->
		<template #actions>
			<!-- Cancel the entire operation -->
			<NcButton :aria-label="t('Cancel')"
				:title="t('Cancel the entire operation')"
				data-cy-conflict-picker-cancel
				type="tertiary"
				@click="onCancel">
				<template #icon>
					<Close :size="20" />
				</template>
				{{ t('Cancel') }}
			</NcButton>

			<!-- Align right -->
			<span class="dialog__actions-separator" />

			<NcButton :aria-label="skipButtonLabel"
				data-cy-conflict-picker-skip
				@click="onSkip">
				<template #icon>
					<Close :size="20" />
				</template>
				{{ skipButtonLabel }}
			</NcButton>
			<NcButton :aria-label="t('Continue')"
				:class="{ 'button-vue--disabled': !isEnoughSelected}"
				:title="isEnoughSelected ? '' : blockedTitle"
				data-cy-conflict-picker-submit
				native-type="submit"
				type="primary"
				@click.stop.prevent="onSubmit">
				<template #icon>
					<ArrowRight :size="20" />
				</template>
				{{ t('Continue') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script lang="ts">
import type { Node } from '@nextcloud/files'
import type { PropType } from 'vue'
import type { ConflictResolutionResult } from '../index.ts'

import { basename, extname } from 'path'
import { defineComponent } from 'vue'
import { showError } from '@nextcloud/dialogs'

import ArrowRight from 'vue-material-design-icons/ArrowRight.vue'
import Close from 'vue-material-design-icons/Close.vue'
import NcCheckboxRadioSwitch from '@nextcloud/vue/dist/Components/NcCheckboxRadioSwitch.js'
import NcDialog from '@nextcloud/vue/dist/Components/NcDialog.js'
import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'

import { isFileSystemEntry } from '../utils/filesystem.ts'
import { n, t } from '../utils/l10n.ts'
import logger from '../utils/logger.ts'
import NodesPicker from './NodesPicker.vue'

export type NodesPickerRef = InstanceType<typeof NodesPicker>

export default defineComponent({
	name: 'ConflictPicker',

	components: {
		ArrowRight,
		Close,
		NcButton,
		NcCheckboxRadioSwitch,
		NcDialog,
		NodesPicker,
	},

	props: {
		/** Directory/context file name */
		dirname: {
			type: String,
			default: '',
		},

		/** All the existing files in the current directory */
		content: {
			type: Array as PropType<Node[]>,
			required: true,
		},

		/** New files being moved/uploaded */
		conflicts: {
			type: Array as PropType<(Node|File|FileSystemEntry)[]>,
			required: true,
		},

		/**
		 * If set to true no hint about overwriting directory content will be shown
		 */
		recursiveUpload: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['cancel', 'submit'],

	setup() {
		// Non reactive props
		return {
			blockedTitle: t('You need to select at least one version of each file to continue.'),
		}
	},

	data() {
		return {
			// computed list of conflicting files already present in the directory
			files: [] as Node[],

			opened: true,
			newSelected: [] as (Node|File|FileSystemEntry)[],
			oldSelected: [] as Node[],
		}
	},

	computed: {
		name() {
			if (this?.dirname?.trim?.() !== '') {
				return n('{count} file conflict in {dirname}', '{count} file conflicts in {dirname}', this.conflicts.length, {
					count: this.conflicts.length,
					dirname: this.dirname,
				})
			}
			return n('{count} file conflict', '{count} files conflict', this.conflicts.length, { count: this.conflicts.length })
		},

		skipButtonLabel() {
			return n('Skip this file', 'Skip {count} files', this.conflicts.length, { count: this.conflicts.length })
		},

		// Select all incoming files
		selectAllNewBind() {
			const label = this.isNoneNewSelected || this.isSomeNewSelected
				? this.t('Select all')
				: this.t('Unselect all')
			return {
				'aria-label': label,
				checked: this.isAllNewSelected,
				indeterminate: this.isSomeNewSelected,
				title: label,
			}
		},

		isAllNewSelected() {
			return this.newSelected.length === this.conflicts.length
		},
		isNoneNewSelected() {
			return this.newSelected.length === 0
		},
		isSomeNewSelected() {
			return !this.isAllNewSelected && !this.isNoneNewSelected
		},

		// Select all existing files
		selectAllOldBind() {
			const label = this.isNoneOldSelected || this.isSomeOldSelected
				? this.t('Select all')
				: this.t('Unselect all')
			return {
				'aria-label': label,
				checked: this.isAllOldSelected,
				indeterminate: this.isSomeOldSelected,
				title: label,
			}
		},

		isAllOldSelected() {
			return this.oldSelected.length === this.files.length
		},
		isNoneOldSelected() {
			return this.oldSelected.length === 0
		},
		isSomeOldSelected() {
			return !this.isAllOldSelected && !this.isNoneOldSelected
		},

		// Global handlings
		isEnoughSelected() {
			if (this.isAllOldSelected || this.isAllNewSelected) {
				return true
			}
			// If we're in an intermediate state, we need to check
			// if all files have at least one version selected.
			return (this.$refs?.nodesPicker as NodesPickerRef[])?.every?.(picker => picker.isEnoughSelected)
		},
	},

	mounted() {
		// Using map keep the same order
		this.files = this.conflicts.map((conflict: File|FileSystemEntry|Node) => {
			const name = (conflict instanceof File || isFileSystemEntry(conflict)) ? conflict.name : conflict.basename
			return this.content.find((node: Node) => node.basename === name)
		}).filter(Boolean) as Node[]

		if (this.conflicts.length === 0 || this.files.length === 0) {
			const error = new Error('ConflictPicker: files and conflicts must not be empty')
			this.onCancel(error)
			throw error
		}

		if (this.conflicts.length !== this.files.length) {
			const error = new Error('ConflictPicker: files and conflicts must have the same length. Make sure you filter out non conflicting files from the conflicts array.')
			this.onCancel(error)
			throw error
		}

		// Successful initialisation
		logger.debug('ConflictPicker initialised', { files: this.files, conflicts: this.conflicts, content: this.content })
	},

	methods: {
		onCancel(error?: Error) {
			this.opened = false
			this.$emit('cancel', error)
		},

		onSkip() {
			logger.debug('Conflict skipped. Ignoring all conflicting files')
			this.opened = false
			this.$emit('submit', {
				selected: [],
				renamed: [],
			} as ConflictResolutionResult)
		},

		onSubmit() {
			// Do not use a real button disabled state so
			// the user can still click and trigger the
			// form validation check.
			if (!this.isEnoughSelected) {
				this.scrollValidityInputIntoView();
				(this.$refs.form as HTMLFormElement).reportValidity()
				showError(this.blockedTitle)
				return
			}

			const selectedOldNames = (this.oldSelected as Node[]).map((node: Node) => node.basename) as string[]
			const directoryContent = this.content.map((node: Node) => node.basename) as string[]

			// Files that got selected twice (new and old) gets renamed
			const renamed = [] as (File|FileSystemEntry|Node)[]
			const toRename = (this.newSelected as (File|FileSystemEntry|Node)[]).filter((node) => {
				const name = (node instanceof File || isFileSystemEntry(node)) ? node.name : node.basename
				return selectedOldNames.includes(name)
			})

			// Rename files
			if (toRename.length > 0) {
				toRename.forEach(file => {
					const name = (file instanceof File || isFileSystemEntry(file)) ? file.name : file.basename
					const newName = this.getUniqueName(name, directoryContent)
					// If File, create a new one with the new name
					if (file instanceof File || isFileSystemEntry(file)) {
						// Keep the original file object and force rename
						Object.defineProperty(file, 'name', { value: newName })
						renamed.push(file)
						return
					}

					// Rename the node
					file.rename(newName)
					renamed.push(file)
				})
			}

			// Remove files that got renamed from the new selection
			const selected = (this.newSelected as (File|FileSystemEntry|Node)[]).filter((node) => {
				const name = (node instanceof File || isFileSystemEntry(node)) ? node.name : node.basename
				// files that are not in the old selection
				return !selectedOldNames.includes(name) && !toRename.includes(node)
			}) as (File|Node)[]

			logger.debug('Conflict resolved', { selected, renamed })
			this.opened = false
			this.$emit('submit', {
				selected,
				renamed,
			} as ConflictResolutionResult)
		},

		/**
		 * Get a unique name for a file based
		 * on the existing directory content.
		 * @param {string} name The original file name with extension
		 * @param {string} names The existing directory content names
		 * @return {string} A unique name
		 * TODO: migrate to @nextcloud/files
		 */
		getUniqueName(name: string, names: string[]): string {
			let newName = name
			let i = 1
			while (names.includes(newName)) {
				const ext = extname(name)
				newName = `${basename(name, ext)} (${i++})${ext}`
			}
			return newName
		},

		/**
		 * Scroll the first invalid input into view.
		 * This is needed because the browser uses behavior: "nearest" by default.
		 */
		scrollValidityInputIntoView() {
			const selector = '.checkbox-radio-switch input[type="checkbox"]'

			// Reset the custom validity of all checkboxes
			const checkboxes: HTMLInputElement[] = Array.from(this.$el.querySelectorAll(selector))
			checkboxes.forEach(input => input?.setCustomValidity?.(''))

			// Scroll the first invalid input into view if any
			const invalidInput = this.$el.querySelector(selector + ':invalid') as HTMLInputElement
			if (invalidInput) {
				invalidInput.setCustomValidity(this.blockedTitle)
				invalidInput.scrollIntoView({ behavior: 'instant', block: 'center' })
			}
		},

		onSelectAllNew(selected: boolean) {
			if (selected) {
				logger.debug('Selected all new files')
				this.newSelected = this.conflicts
			} else {
				logger.debug('Cleared new selection')
				this.newSelected = []
			}
		},

		onSelectAllOld(selected: boolean) {
			if (selected) {
				logger.debug('Selected all existing files')
				this.oldSelected = this.files
			} else {
				logger.debug('Cleared old selection')
				this.oldSelected = []
			}
		},

		t,
	},
})
</script>

<style lang="scss" scoped>
:deep(.modal-container__content) {
	// Make the form scroll instead
	display: flex;
	overflow: visible;
	flex-direction: column;
}

.conflict-picker {
	--margin: 36px;
	--secondary-margin: 18px;

	&__header {
		position: sticky;
		z-index: 10;
		top: 0;
		padding: 0 var(--margin);
		padding-bottom: var(--secondary-margin);
	}

	&__form {
		position: relative;
		overflow: auto;
		padding: 0 var(--margin);
		// overlap header bottom padding
		margin-top: calc(-1 * var(--secondary-margin));
	}

	fieldset {
		display: grid;
		width: 100%;
		margin-top: calc(var(--secondary-margin) * 1.5);
		padding-bottom: var(--secondary-margin);
		grid-template-columns: 1fr 1fr;

		:deep(legend) {
			display: flex;
			align-items: center;
			width: 100%;
			margin-bottom: calc(var(--secondary-margin) / 2);
		}

		&.conflict-picker__all {
			position: sticky;
			top: 0;
			margin: 0;
			padding: var(--secondary-margin) 0;
			background-image: linear-gradient(to top, transparent, var(--color-main-background-blur) 10%, var(--color-main-background) 15%);
			// Proper select all checkboxes alignment
			& + fieldset {
				margin-top: 0;
			}

			:deep(label) {
				font-weight: bold;
			}
		}
	}

	// Do not use a real disabled state so
	// the user can still click and trigger the
	// form validation check.
	.button-vue--disabled {
		cursor: default;
		opacity: .5;
		filter: saturate(.7);
	}

	:deep(.dialog__actions) {
		width: auto;
		margin-inline: 12px;
		span.dialog__actions-separator {
			margin-left: auto;
		}
	}
}

// Responsive layout
@media screen and (max-width: 768px) {
	.conflict-picker {
		--margin: var(--secondary-margin) !important;

		&__description {
			display: none !important;
		}

		fieldset {
			grid-template-columns: 1fr !important;
			&.conflict-picker__all {
				position: static;
			}
		}
	}
}

// Responsive layout
@media screen and (max-width: 512px) {
	.conflict-picker {
		:deep(.dialog__actions) {
			flex-wrap: wrap;
			span.dialog__actions-separator {
				// Make the second row wrap
				width: 100%;
			}
		}
	}
}
</style>
