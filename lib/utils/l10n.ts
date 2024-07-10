/**
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { getGettextBuilder } from '@nextcloud/l10n/gettext'

const gtBuilder = getGettextBuilder()
	.detectLocale()

// @ts-expect-error __TRANSLATIONS__ is replaced by vite
__TRANSLATIONS__.map(data => gtBuilder.addTranslation(data.locale, data.json))

const gt = gtBuilder.build()

export const n = gt.ngettext.bind(gt) as typeof gt.ngettext
export const t = gt.gettext.bind(gt) as typeof gt.gettext
