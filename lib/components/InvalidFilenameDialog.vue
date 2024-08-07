<!--
  - SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->
<template>
	<NcDialog :buttons="dialogButtons"
		:name="t('Invalid filename')"
		@close="$emit('close', { cancel: true })">
		<NcNoteCard severity="error">
			{{ getErrorText(error) }}
			{{ t('You can either rename the file, skip this file or cancel the whole operation.') }}
		</NcNoteCard>
		<NcTextField v-if="canRename"
			ref="textfield"
			class="invalid-filename-dialog__input"
			:error="!isValidName"
			:helper-text="validationError"
			:label="t('New filename')"
			:value.sync="newName" />
	</NcDialog>
</template>

<script lang="ts">
import type { ComponentPublicInstance, PropType } from 'vue'

import { InvalidFilenameError, InvalidFilenameErrorReason } from '@nextcloud/files'
import { defineComponent } from 'vue'
import { t } from '../utils/l10n'
import NcDialog from '@nextcloud/vue/dist/Components/NcDialog.js'
import NcTextField from '@nextcloud/vue/dist/Components/NcTextField.js'
import NcNoteCard from '@nextcloud/vue/dist/Components/NcNoteCard.js'

export default defineComponent({
	components: {
		NcDialog,
		NcNoteCard,
		NcTextField,
	},

	props: {
		error: {
			type: InvalidFilenameError,
			required: true,
		},
		/**
		 * @deprecated just for legacy reasons, replace with function from @nextcloud/files in future
		 */
		validateFilename: {
			type: Function as PropType<(filename: string) => void>,
			required: true,
		},
	},

	setup() {
		return {
			t,
		}
	},

	data() {
		return {
			newName: '',
			validationError: '',
		}
	},

	computed: {
		isValidName(): boolean {
			return this.validationError === ''
		},

		isInvalidFileType(): boolean {
			return this.error.reason === InvalidFilenameErrorReason.Extension && this.error.segment.match(/^\.\w/) !== null
		},

		canRename(): boolean {
			return !this.isInvalidFileType
		},

		dialogButtons() {
			const buttons = [
				{
					label: t('Cancel'),
					type: 'error',
					callback: () => {
						this.$emit('close', { cancel: true })
					},
				},
				{
					label: t('Skip'),
					callback: () => {
						this.$emit('close', { skip: true })
					},
				},
			] as unknown[]

			// Only add the rename option if possible
			if (this.canRename) {
				buttons.push({
					label: t('Rename'),
					type: 'primary',
					disabled: !this.isValidName,
					callback: () => {
						this.$emit('close', { rename: this.newName.trimEnd() })
					},
				})
			}

			return buttons
		},
	},
	watch: {
		error: {
			handler() {
				this.validationError = this.getErrorText(this.error)
				this.newName = this.error.filename
			},
			immediate: true,
		},

		newName() {
			try {
				this.validateFilename(this.newName.trimEnd())
				this.validationError = ''
			} catch (error) {
				this.validationError = this.getErrorText(error as InvalidFilenameError)
			} finally {
				const textfield = (this.$refs.textfield as ComponentPublicInstance)?.$el.querySelector('input')
				if (textfield) {
					textfield.setCustomValidity(this.validationError)
					textfield.reportValidity()
				}
			}
		},
	},

	methods: {
		getErrorText(error: InvalidFilenameError): string {
			switch (error.reason) {
			case InvalidFilenameErrorReason.Character:
				return t('"{segment}" is not allowed inside a file or folder name.', { segment: error.segment })
			case InvalidFilenameErrorReason.ReservedName:
				return t('"{segment}" is a forbidden file or folder name.', { segment: error.segment })
			case InvalidFilenameErrorReason.Extension:
				return error.segment.match(/\.\w/)
					? t('"{segment}" is a forbidden file type.', { segment: error.segment })
					: t('Filenames must not end with "{segment}".', { segment: error.segment })
			}
		},
	},
})
</script>

<style scoped>
.invalid-filename-dialog__input {
	/* Ensure the helper text can always be shown without jumping */
	min-height: calc(var(--default-clickable-area) + 4 * var(--default-font-size));
}
</style>
