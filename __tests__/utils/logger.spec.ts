/**
 * SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { expect, test, vi } from 'vitest'
import logger from '../../lib/utils/logger'

// Just ensure correct app is set, rest is up to that library to test
test('logger', () => {
	const spy = vi.spyOn(window.console, 'warn')

	logger.warn('test')
	expect(spy).toHaveBeenCalled()
	expect(spy.mock.calls[0][1]).toHaveProperty('app', '@nextcloud/upload')
})
