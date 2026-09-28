/*!
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { po as poParser } from 'gettext-parser'
import { readdirSync, readFileSync } from "node:fs"

export const translations = readdirSync('./l10n')
	.filter(name => name !== 'messages.pot' && name.endsWith('.pot'))
	.map(file => {
		const path = './l10n/' + file
		const locale = file.slice(0, -'.pot'.length)

		const po = readFileSync(path)
		const json = poParser.parse(po)
		return {
			locale,
			json,
		}
	})
