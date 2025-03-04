<!--
  - SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->
# Changelog

## [v1.9.0](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.9.0) \(2025-03-04\)

### Added
* feat: add assembling status to UploadPicker by @skjnldsv in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1530
* feat(UploadPicker): Allow to set color to primary by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1606
* feat(uploader): add ETA implementation with upload speed information by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1627

### Fixed
* fix: fix eslint scripts by @Koc in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1518
* fix: include non conflicting files for upload by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1615
* fix(conflictpicker): force background on sticky header by @skjnldsv in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1635
* fix(uploader): Correctly (re)set progress on upload by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1603
* fix(uploader): properly propagate upload cancelled status by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1617

### Changed
* Updated translations
* Updated development dependencies
* chore(deps): bump @nextcloud/dialogs from 6.0.1 to 6.1.1
* chore(deps): bump @nextcloud/files from 3.10.1 to 3.10.2
* chore(deps): bump @nextcloud/l10n from 3.1.0 to 3.2.0
* chore(deps): bump axios from 1.7.9 to 1.8.1
* chore(deps): bump dompurify from 3.1.6 to 3.2.4
* chore(deps): bump elliptic from 6.6.0 to 6.6.1
* chore(deps): bump p-queue from 8.0.1 to 8.1.0
* test: adjust config for vitest v3 and await expect by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1600
* test: silence console output when testing logger by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1602

## [v1.8.0](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.8.0) \(2025-01-20\)

### Added
* feat: add upload menu shortcuts [\#1529](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1529) \([skjnldsv](https://github.com/skjnldsv)\)

### Fixed
* fix(NodesPicker): Use preview fit cover [\#1548](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1548) \([provokateurin](https://github.com/provokateurin)\)

### Changed
* Updated translations
* Updated development dependencies
* chore(deps): bump nanoid to 3.3.8 [\#1523](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1523)
* chore(deps): bump @nextcloud/files to 3.10.1 [\#1527](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1527)

## [v1.7.1](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.7.1) \(2024-12-10\)
### Fixed
* fix(uploader): only monitor the queue being idle when we know we are finishing the upload [\#1521](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1521) \([skjnldsv](https://github.com/skjnldsv)\)

### Changed
* chore(deps): Bump @nextcloud/files to 3.10.0
* chore(deps): Bump @nextcloud/sharing to 0.2.4
* chore(deps): Bump axios to 1.7.9
* Translations updates

**Full Changelog**: https://github.com/nextcloud-libraries/nextcloud-upload/compare/v1.7.0...v1.7.1

## [v1.7.0](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.7.0) \(2024-11-13\)

### Added
* feat: Add `uploadConflictHandler` to handle conflict resolution by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1442
* feat: Respect parallel count config by @provokateurin in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1444

### Fixed
* fix: Fix adding children to directory (file tree) for batch uploading by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1463

### Changed
* chore: Add more debug logging to trace errors by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1432
* chore(deps): Bump @nextcloud/dialogs from 5.3.7 to 6.0.1 by @dependabot in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1469
* chore(deps): Bump @nextcloud/files from 3.9.0 to 3.9.1 by @dependabot in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1452
* chore(deps): Bump crypto-browserify from 3.12.0 to 3.12.1 by @dependabot in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1450
* chore(deps): Bump elliptic from 6.5.7 to 6.6.0 by @dependabot in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1461
* test: Cleanup test setup by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1441
* Translations updates

## New Contributors
* @provokateurin made their first contribution in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1444

**Full Changelog**: https://github.com/nextcloud-libraries/nextcloud-upload/compare/v1.6.1...v1.7.0

## [v1.6.1](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.6.1) \(2024-09-26\)

### Fixed
* fix: Fix errors when FileSystemFileEntry is unsupported [\#1417](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1417) \([Pytal](https://github.com/Pytal)\)
* fix(l10n): Add proper config to align languages with Nextcloud language tags [\#1421](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1421) \([susnux](https://github.com/susnux)\)

### Changed
* Updated translations
* Updated development dependencies
* chore: Bump `@nextcloud/files` to 3.9.0
* chore: Bump `dompurify` to 3.1.6
* chore: Bump `@nextcloud/axios` to 2.5.1

## [v1.6.0](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.6.0) \(2024-09-05\)

### Added
* feat(uploader): Allow to specify custom headers [\#1366](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1366) \([susnux](https://github.com/susnux)\)
* feat(UploadPicker): Allow to disable the "new"-menu [\#1373](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1373) \([susnux](https://github.com/susnux)\)

### Fixed
* fix(Uploader): The mtime should be a valid UNIX timestamp [\#1368](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1368) \([susnux](https://github.com/susnux)\)
* fix(uploader): validation of the destination should not compare the class [\#1369](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1369) \([susnux](https://github.com/susnux)\)
* fix(UploadPicker): Show menu if folders are enabled [\#1372](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1372) \([susnux](https://github.com/susnux)\)
* fix: Make the default uploader global [\#1370](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1370) \([susnux](https://github.com/susnux)\)

### Changed
* Updated translations
* chore: Bump `axios` to 1.7.7
* chore: Bump `@nextcloud/dialogs` to 5.3.7
* Updated development dependencies
* chore(ci): also run node on main push [\#1367](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1367) \([skjnldsv](https://github.com/skjnldsv)\)

## [v1.5.0](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.5.0) \(2024-08-16\)
### Added
* feat(UploadPicker): Use `@nextcloud/files` filename validation by default [\#1310](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1310) \([susnux](https://github.com/susnux)\)

### Fixed
* fix(uploader): Make sure every request is added to the job queue [\#1326](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1326) \([susnux](https://github.com/susnux)\)

### Changed
* Updated translations
* chore: Bump @nextcloud/auth to 2.4.0
* chore: Bump @nextcloud/files to 3.8.0
* chore: Bump axios to 1.7.4

## [v1.4.3](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.4.3) \(2024-08-07\)
### Fixed
* fix: Always request current content when triggering a menu entry by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1313
* fix: Remove outdated languages that are blocking the real translations by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1282
* fix(UploadPicker): Do not hardcode the height but use the CSS variable by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1309

## What's Changed
* chore: Bump @nextcloud/files from 3.5.1 to 3.7.0 by @dependabot
* chore: Bump @nextcloud/paths from 2.1.0 to 2.2.1 by @dependabot
* chore: Bump @nextcloud/sharing from 0.2.2 to 0.2.3 by @dependabot
* chore: Bump @types/node from 20.14.10 to 22.1.0 by @dependabot
* chore: Bump @vitest/coverage-v8 from 2.0.2 to 2.0.5 by @dependabot
* chore: Bump axios from 1.7.2 to 1.7.3 by @dependabot
* chore: Bump axios-retry from 4.4.1 to 4.5.0 by @dependabot
* chore: Bump blob-polyfill from 7.0.20220408 to 8.0.20240630 by @dependabot
* chore: Bump cypress from 13.13.0 to 3.13.2 by @dependabot
* chore: Bump cypress-io/github-action from 6.7.1 to 6.7.2 by @dependabot
* chore: Bump fast-xml-parser from 4.3.2 to 4.4.1 by @dependabot
* chore: Bump jsdom from 24.1.0 to 24.1.1 by @dependabot
* chore: Bump typedoc from 0.26.4 to 0.26.5 by @dependabot
* chore: Bump typescript from 5.4.5 to 5.5.4 by @dependabot
* chore: Bump vite from 5.3.3 to 5.3.5 by @dependabot
* chore: Bump webdav from 5.6.0 to 5.7.1 by @dependabot
* chore: monitor bundle size with codecov by @skjnldsv in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1290
* feat: add cypress selectors for new menu entries by @skjnldsv in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1289
* Translations updates

**Full Changelog**: https://github.com/nextcloud-libraries/nextcloud-upload/compare/v1.4.2...v1.4.3

## [v1.4.2](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.4.2) \(2024-07-11\)
### Fixed
* fix(uploader): increase max concurrency to 5 [\#1256](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1256) \([skjnldsv](https://github.com/skjnldsv)\)
* fix: Use other menu entries instead of new ones twice [\#1269](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1269) \([juliushaertl](https://github.com/juliushaertl)\)
* fix: Allow remote URL with protocol [\#1271](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1271) \([susnux](https://github.com/susnux)\)

### Changed
* Add SPDX header [\#1278](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1278) \([AndyScherzinger](https://github.com/AndyScherzinger)\)
* Update translations
* chore: add transifex-conventional-rebase.yml
* chore: Bump @nextcloud/dialogs from 5.3.2 to 5.3.5
* Update development dependencies

## [v1.4.1](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.4.1) \(2024-06-24\)
### Fixed
* fix: Prevent issues with Chromium based browsers [\#1250](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1250) \([susnux](https://github.com/susnux)\)

## [v1.4.0](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.4.0) (2024-06-21)
[Full Changelog](https://github.com/nextcloud-libraries/nextcloud-upload/compare/v1.3.0...v1.4.0)

### Added
* Added retry capability for uploading files [\#1233](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1233) \([Koc](https://github.com/Koc)\)

### Fixed
* fix: Adjust `isPublic` detection for uploader [\#1234](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1234) \([susnux](https://github.com/susnux)\)

### Changed
* refactor: Use `getUniqueName` from `@nextcloud/files` [\#1244](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1244) \([susnux](https://github.com/susnux)\)
* refactor: Use public-share aware functions from `@nextcloud/files` and `@nextcloud/sharing` [\#1245](https://github.com/nextcloud-libraries/nextcloud-upload/pull/1245) \([susnux](https://github.com/susnux)\)
* chore: Bump @cypress/vue2 from 2.1.0 to 2.1.1
* chore: Bump @nextcloud/dialogs from 5.3.1 to 5.3.2
* chore: Bump braces from 3.0.2 to 3.0.3
* chore: Bump codecov/codecov-action from 4.4.1 to 4.5.0
* chore: Bump cypress-io/github-action from 6.7.0 to 6.7.1
* chore: Bump ws from 8.17.0 to 8.17.1
* chore: Bump @nextcloud/files from 3.4.1 to 3.5.0
* chore: Bump cypress from 13.11.0 to 13.12.0
* chore: Bump @types/node from 20.14.6 to 20.14.7
* chore: Bump axios-retry from 4.4.0 to 4.4.1

## [v1.3.0](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.3.0) (2024-06-06)
[Full Changelog](https://github.com/nextcloud-libraries/nextcloud-upload/compare/v1.2.0...v1.3.0)

### Added
* feat: Implement upload on public shares using dav endpoint v2 by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1225

### Changed
* refactor: Only import from nextcloud-axios not axios directly by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1224
* Updated translations
* chore(deps): Bump @nextcloud/files from 3.3.1 to 3.4.0 by @dependabot in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1220
* chore(deps): Bump @types/node to 20.14.2 by @dependabot in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1227

## [v1.2.0](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.2.0) (2024-05-23)
[Full Changelog](https://github.com/nextcloud-libraries/nextcloud-upload/compare/v1.1.1...v1.2.0)

### Added
* feat(NodesPicker): Add support for FileSystemEntry by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1165
* feat(ConflictPicker): Allow to use `FileSystemEntry` by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1166
* feat: Allow to upload directories and allow bulk upload by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1175
* feat: Split new-menu entries into `upload` `new` and *other* by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1206
* feat(ConflictPicker): refresh preview on etag change by @skjnldsv in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1214

### Fixed
* fix(ConflictPicker): Ensure component works also if browser does not support FileSystemEntry by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1171
* fix(ConflictPicker): Allow to set recursive upload note + fix types for conflict utils functions by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1176
* fix(docs): Add parameter docs for `getUploader` by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1207

### Changed
* Updated translations
* fix(tests): Add tests for filesystem helpers by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1174
* fix: Refactor logger and fix badges in README by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1173
* build(deps): Bump @nextcloud/dialogs to 5.3.1
* build(deps): Bump @nextcloud/auth to 2.3.0
* build(deps): Bump @nextcloud/router to 3.0.1
* build(deps): Bump @nextcloud/files to 3.2.1
* build(deps): Bump @nextcloud/l10n to 3.1.0
* build(deps): Bump @nextcloud/logger to 3.0.2
* build(deps): Bump axios to 1.7.2

## [v1.1.1](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.1.1) (2024-04-15)
[Full Changelog](https://github.com/nextcloud-libraries/nextcloud-upload/compare/v1.1.0...v1.1.1)

### :bug: Fixed bugs
* fix: Drop dependency on moment.js by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1155
* fix(upload): Do not read chunks into memory but just stream file chunks by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1153

### Changed
* Updated development dependencies
* Updated translations
* Updated @nextcloud/dialogs from 5.2.0 to 5.3.0

## [v1.1.0](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.1.0) (2024-04-02)
[Full Changelog](https://github.com/nextcloud-libraries/nextcloud-upload/compare/v1.0.5...v1.1.0)

### Features :rocket:
* feat: allow to specify the root of an upload by @skjnldsv in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1131
* feat: allow to specify forbidden characters by @arublov in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1132

### Bug Fixes :bug:
* fix: conflict picker by @skjnldsv in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1123
* fix: migrate conflictpicker to NcDialog and remove incorrect semantic closing icon by @emoral435 in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1113
* fix(ConflictPicker): Use action slot instead of custom wrapper for buttons by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1117

### Changed
* build(deps-dev): Bump @cypress/vue2 from 2.0.1 to 2.1.0 by @dependabot
* build(deps-dev): Bump @tsconfig/cypress from 1.0.1 to 1.0.2 by @dependabot
* build(deps-dev): Bump @types/node from 20.11.17 to 20.12.2 by @dependabot
* build(deps-dev): Bump @vitest/coverage-istanbul from 1.2.2 to 1.4.0 by @dependabot
* build(deps-dev): Bump cypress from 13.6.4 to 13.7.0 by @dependabot
* build(deps-dev): Bump typedoc from 0.25.8 to 0.25.12 by @dependabot
* build(deps-dev): Bump typescript from 5.3.3 to 5.4.3 by @dependabot
* build(deps): Bump @nextcloud/dialogs from 5.1.1 to 5.1.2 by @dependabot
* build(deps): Bump @nextcloud/files from 3.1.0 to 3.1.1 by @dependabot
* build(deps): Bump axios from 1.6.7 to 1.6.8 by @dependabot
* build(deps): Bump codecov/codecov-action from 4.0.1 to 4.1.1 by @dependabot
* build(deps): Bump dorny/paths-filter from 3.0.0 to 3.0.2 by @dependabot
* Translations updates

## New Contributors
* @emoral435 made their first contribution in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1113

## [v1.0.5](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.0.5) (2024-02-13)
[Full Changelog](https://github.com/nextcloud-libraries/nextcloud-upload/compare/v1.0.4...v1.0.5)

### :bug: Fixed bugs
* fix: also add `X-OC-Mtime` header to final chunks move by @skjnldsv in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1038
* fix: properly handle chunk upload failure by @skjnldsv in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1042
* fix: Add upload progress for non-chunked uploads by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1080
* fix: do not try to slice in chunk larger than the File itself by @skjnldsv in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1057
* fix: Some issues with `package.json` by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1088

### Changed
* Require NPM v10 to be compatible with LTS Node 20
* Updated translations
* Updated dependencies
* Updated development dependencies
* Migrate cypress config to use to vite by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/999
* chore: add block-unconventional-commits.yml by @skjnldsv in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1082

## [v1.0.4](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.0.4) (2023-12-15)

[Full Changelog](https://github.com/nextcloud-libraries/nextcloud-upload/compare/v1.0.3...v1.0.4)

### :bug: Fixed bugs
* fix(uploader): encode destination by @skjnldsv in https://github.com/nextcloud-libraries/nextcloud-upload/pull/996
* fix(uploader): fix PUT content-type by @skjnldsv in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1002
* fix(UploadPicker): Add label for upload progress and connect progress with description [a11y] by @susnux in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1000

### Dependencies & translations
* build(deps-dev): Bump @types/node from 20.10.3 to 20.10.4 by @dependabot in https://github.com/nextcloud-libraries/nextcloud-upload/pull/990
* build(deps): Bump actions/upload-artifact from 3 to 4 by @dependabot in https://github.com/nextcloud-libraries/nextcloud-upload/pull/998
* build(deps): Bump p-queue from 7.4.1 to 8.0.1 by @dependabot in https://github.com/nextcloud-libraries/nextcloud-upload/pull/997
* Updates for project Nextcloud upload library by @transifex-integration in https://github.com/nextcloud-libraries/nextcloud-upload/pull/1003
* Updates for project Nextcloud upload library by @transifex-integration in https://github.com/nextcloud-libraries/nextcloud-upload/pull/993

## [v1.0.3](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.0.3) (2023-12-07)

[Full Changelog](https://github.com/nextcloud-libraries/nextcloud-upload/compare/v1.0.2...v1.0.3)

### :bug: Fixed bugs

* fix: do not flood with Vue errors when using in `NcBreadcrumbs` by externalizing Vue dependency [\#985](https://github.com/nextcloud-libraries/nextcloud-upload/pull/985) ([ShGKme](https://github.com/ShGKme))

## [v1.0.2](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.0.2) (2023-11-29)

## What's Changed
* Updates for project Nextcloud upload library by @transifex-integration in https://github.com/nextcloud-libraries/nextcloud-upload/pull/961
* Updates for project Nextcloud upload library by @transifex-integration in https://github.com/nextcloud-libraries/nextcloud-upload/pull/962
* Updates for project Nextcloud upload library by @transifex-integration in https://github.com/nextcloud-libraries/nextcloud-upload/pull/963
* Updates for project Nextcloud upload library by @transifex-integration in https://github.com/nextcloud-libraries/nextcloud-upload/pull/964
* Updates for project Nextcloud upload library by @transifex-integration in https://github.com/nextcloud-libraries/nextcloud-upload/pull/965
* Updates for project Nextcloud upload library by @transifex-integration in https://github.com/nextcloud-libraries/nextcloud-upload/pull/966
* Updates for project Nextcloud upload library by @transifex-integration in https://github.com/nextcloud-libraries/nextcloud-upload/pull/967
* enable dependabot by @szaimen in https://github.com/nextcloud-libraries/nextcloud-upload/pull/969
* build(deps-dev): Bump @types/node from 20.9.0 to 20.10.0 by @dependabot in https://github.com/nextcloud-libraries/nextcloud-upload/pull/972
* build(deps-dev): Bump typedoc from 0.25.3 to 0.25.4 by @dependabot in https://github.com/nextcloud-libraries/nextcloud-upload/pull/978
* build(deps): Bump @nextcloud/dialogs from 5.0.0-beta.6 to 5.0.3 by @dependabot in https://github.com/nextcloud-libraries/nextcloud-upload/pull/976
* Updates for project Nextcloud upload library by @transifex-integration in https://github.com/nextcloud-libraries/nextcloud-upload/pull/968
* build(deps): Bump peter-evans/create-or-update-comment from 3.0.2 to 3.1.0 by @dependabot in https://github.com/nextcloud-libraries/nextcloud-upload/pull/970
* build(deps): Bump cypress-io/github-action from 5.8.3 to 6.6.0 by @dependabot in https://github.com/nextcloud-libraries/nextcloud-upload/pull/971
* build(deps): Bump actions/checkout from 3 to 4 by @dependabot in https://github.com/nextcloud-libraries/nextcloud-upload/pull/974
* build(deps): Bump actions/setup-node from 3 to 4 by @dependabot in https://github.com/nextcloud-libraries/nextcloud-upload/pull/973

## New Contributors
* @szaimen made their first contribution in https://github.com/nextcloud-libraries/nextcloud-upload/pull/969

**Full Changelog**: https://github.com/nextcloud-libraries/nextcloud-upload/compare/v1.0.1...v1.0.2

## [v1.0.1](https://github.com/nextcloud-libraries/nextcloud-upload/tree/v1.0.1) (2023-11-17)

[Full Changelog](https://github.com/nextcloud-libraries/nextcloud-upload/compare/v1.0.0...v1.0.1)

### :bug: Fixed bugs

- fix: Do not block if the filetype is unknown to the browser [\#955](https://github.com/nextcloud-libraries/nextcloud-upload/pull/955) ([juliushaertl](https://github.com/juliushaertl))
- fix\(upload\): attach response to failed uploads too [\#953](https://github.com/nextcloud-libraries/nextcloud-upload/pull/953) ([skjnldsv](https://github.com/skjnldsv))
- Fix "Add" label to "New" [\#957](https://github.com/nextcloud-libraries/nextcloud-upload/pull/957) ([jancborchardt](https://github.com/jancborchardt))



\* *This Changelog was automatically generated by [github_changelog_generator](https://github.com/github-changelog-generator/github-changelog-generator)*
