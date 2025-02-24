/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { describe, expect, test } from 'vitest'
import { getMaxChunksSize } from '../../lib/utils/config.js'

describe('Max chunk size tests', () => {
	test('Returning valid config', () => {
		Object.assign(window, { OC: { appConfig: { files: { max_chunk_size: 15 * 1024 * 1024 } } } })
		expect(getMaxChunksSize()).toBe(15 * 1024 * 1024)
	})

	test('Returning valid config for chunking v2 minimum size', () => {
		Object.assign(window, { OC: { appConfig: { files: { max_chunk_size: 4 * 1024 * 1024 } } } })
		expect(getMaxChunksSize()).toBe(5 * 1024 * 1024)
	})

	test('Returning valid config for chunking v2 maximum chunk count', () => {
		Object.assign(window, { OC: { appConfig: { files: { max_chunk_size: 5 * 1024 * 1024 } } } })
		expect(getMaxChunksSize(50 * 1024 * 1024 * 10000)).toBe(5 * 1024 * 1024 * 10)
	})

	test('Returning disabled chunking config', () => {
		Object.assign(window, { OC: { appConfig: { files: { max_chunk_size: 0 } } } })
		expect(getMaxChunksSize()).toBe(0)

		Object.assign(window, { OC: { appConfig: { files: { max_chunk_size: -1 } } } })
		expect(getMaxChunksSize()).toBe(0)

		Object.assign(window, { OC: { appConfig: { files: { max_chunk_size: null } } } })
		expect(getMaxChunksSize()).toBe(0)
	})

	test('Returning invalid config', () => {
		Object.assign(window, { OC: { appConfig: { files: { max_chunk_size: 'test' } } } })
		expect(getMaxChunksSize()).toBe(10 * 1024 * 1024)

		Object.assign(window, { OC: { appConfig: { files: { max_chunk_size: undefined } } } })
		expect(getMaxChunksSize()).toBe(10 * 1024 * 1024)
	})
})
