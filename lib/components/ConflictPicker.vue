<template>
	<NcModal class="conflict-picker"
		data-cy-conflict-picker
		:close-on-click-outside="false"
		:show="opened"
		size="large"
		@close="onCancel">
		<!-- Header -->
		<div class="conflict-picker__header">
			<h2 class="conflict-picker__title" v-text="name" />

			<!-- Description -->
			<p id="conflict-picker-description" class="conflict-picker__description">
				{{ t('Which files do you want to keep?') }}<br>
				{{ t('If you select both versions, the copied file will have a number added to its name.') }}
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
				<legend class="hidden-visually">{{ t('Select all checkboxes') }}</legend>
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
			<NodesPicker v-for="(node, index) in conflicts"
				ref="nodesPicker"
				:key="node.fileid"
				:incoming="files[index]"
				:existing="conflicts[index]"
				:new-selected.sync="newSelected"
				:old-selected.sync="oldSelected" />
		</form>

		<!-- Controls -->
		<div class="conflict-picker__controls">
			<NcButton data-cy-conflict-picker-skip @click="onSkip">
				<template #icon>
					<Close />
				</template>
				{{ skipButtonLabel }}
			</NcButton>
			<NcButton type="primary"
				:class="{ 'button-vue--disabled': !isEnoughSelected}"
				:title="isEnoughSelected ? '' : blockedTitle"
				native-type="submit"
				data-cy-conflict-picker-submit
				@click.stop.prevent="onSubmit">
				<template #icon>
					<ArrowRight />
				</template>
				{{ t('Continue') }}
			</NcButton>
		</div>
	</NcModal>
</template>

<script lang="ts">
import { Node } from '@nextcloud/files'
import { showError } from '@nextcloud/dialogs'
import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'
import NcCheckboxRadioSwitch from '@nextcloud/vue/dist/Components/NcCheckboxRadioSwitch.js'
import NcModal from '@nextcloud/vue/dist/Components/NcModal.js'
import Vue from 'vue'

import ArrowRight from 'vue-material-design-icons/ArrowRight.vue'
import Close from 'vue-material-design-icons/Close.vue'

import { n, t } from '../utils/l10n.ts'
import logger from '../utils/logger.ts'
import NodesPicker from './NodesPicker.vue'
import { basename, extname } from 'path'

export default Vue.extend({
	name: 'ConflictPicker',

	components: {
		ArrowRight,
		Close,
		NcButton,
		NcCheckboxRadioSwitch,
		NcModal,
		NodesPicker,
	},

	props: {
		/** Directory/context file name */
		dirname: {
			type: String,
			default: '',
		},

		/** Existing files to be replaced */
		conflicts: {
			type: Array as () => Node[],
			required: true,
		},
		/** New files being moved/uploaded */
		files: {
			type: Array as () => (Node|File)[],
			required: true,
		},
	},

	data() {
		return {
			opened: true,
			blockedTitle: t('You need to select at least one version of each file to continue.'),
			newSelected: [] as Node[],
			oldSelected: [] as Node[],
		}
	},

	computed: {
		name() {
			if (this?.dirname?.trim?.() !== '') {
				return n('{count} file conflict in {dirname}', '{count} file conflicts in {dirname}', this.files.length, {
					count: this.files.length,
					dirname: this.dirname,
				})
			}
			return n('{count} file conflict', '{count} files conflict', this.files.length, { count: this.files.length })
		},

		skipButtonLabel() {
			return n('Skip this file', 'Skip {count} files', this.files.length, { count: this.files.length })
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
			return this.newSelected.length === this.files.length
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
			return this.oldSelected.length === this.conflicts.length
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
			return this.$refs?.nodesPicker?.every?.(picker => picker.isEnoughSelected)
		},
	},

	beforeMount() {
		if (this.files.length === 0 || this.conflicts.length === 0) {
			this.onCancel()
			throw new Error('ConflictPicker: files and conflicts must not be empty')
		}

		if (this.files.length !== this.conflicts.length) {
			this.onCancel()
			throw new Error('ConflictPicker: files and conflicts must have the same length')
		}
	},

	methods: {
		onCancel() {
			this.opened = false
			this.$emit('cancel')
		},

		onSkip() {
			logger.debug('Conflict skipped. Ignoring all conflicting files')
			this.opened = false
			this.$emit('submit', {
				selected: [],
				renamed: [],
			})
		},

		onSubmit() {
			// Do not use a real button disabled state so
			// the user can still click and trigger the
			// form validation check.
			if (!this.isEnoughSelected) {
				this.scrollValidityInputIntoView()
				this.$refs.form.reportValidity()
				showError(this.blockedTitle)
				return
			}

			const selectedOldNames = this.oldSelected.map((node: Node) => node.basename) as string[]
			const directoryContent = this.conflicts.map((node: Node) => node.basename) as string[]

			// Files that got selected twice (new and old) gets renamed
			const renamed = [] as (File|Node)[]
			const toRename = this.newSelected.filter((node: File|Node) => {
				const name = (node instanceof File) ? node.name : node.basename
				return selectedOldNames.includes(name)
			}) as (File|Node)[]

			// Rename files
			if (toRename.length > 0) {
				toRename.forEach(file => {
					const name = (file instanceof File) ? file.name : file.basename
					const newName = this.getUniqueName(name, directoryContent)
					if (file instanceof File) {
						file = new File([file], newName, { type: file.type, lastModified: file.lastModified })
						renamed.push(file)
						return
					}
					file.rename(newName)
					renamed.push(file)
				})
			}

			// Remove files that got renamed from the new selection
			const selected = this.newSelected.filter((node: File|Node) => {
				const name = (node instanceof File) ? node.name : node.basename
				// files that are not in the old selection
				return !selectedOldNames.includes(name)
			}) as (File|Node)[]

			logger.debug('Conflict resolved', { selected, renamed })
			this.opened = false
			this.$emit('submit', {
				selected,
				renamed,
			})
		},

		/**
		 * Get a unique name for a file based
		 * on the existing directory content.
		 * @param name The original file name with extension
		 * @param names The existing directory content names
		 * @return A unique name
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
			const checkboxes = [...this.$el.querySelectorAll(selector)] as HTMLInputElement[]
			checkboxes.forEach(input => input?.setCustomValidity?.(''))

			// Scroll the first invalid input into view if any
			const invalidInput = this.$el.querySelector(selector + ':invalid') as HTMLInputElement
			if (invalidInput) {
				invalidInput.setCustomValidity(this.blockedTitle)
				invalidInput.scrollIntoView({ behavior: 'instant', block: 'center' })
			}
		},

		onSelectAllNew(selected) {
			if (selected) {
				logger.debug('Selected all new files')
				this.newSelected = this.files
			} else {
				logger.debug('Cleared new selection')
				this.newSelected = []
			}
		},

		onSelectAllOld(selected) {
			if (selected) {
				logger.debug('Selected all existing files')
				this.oldSelected = this.conflicts
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
		padding: var(--margin);
		padding-bottom: 0;
	}

	&__form {
		position: relative;
		overflow: auto;
		padding: 0 var(--margin);
		// 12 px to underlap the header and controls
		// and have the gradient background visible
		padding-bottom: 12px;
		margin-bottom: -12px;
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

	&__controls {
		z-index: 10;
		display: flex;
		justify-content: flex-end;
		padding: var(--secondary-margin);
		border-radius: var(--border-radius-large);
		background-image: linear-gradient(to bottom, transparent, var(--color-main-background-blur) 10%, var(--color-main-background) 15%);
		button {
			margin-left: var(--secondary-margin);

			// Do not use a real disabled state so
			// the user can still click and trigger the
			// form validation check.
			&.button-vue--disabled {
				cursor: default;
				opacity: .5;
				filter: saturate(.7);
			}
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

</style>
