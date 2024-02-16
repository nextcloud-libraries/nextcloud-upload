# Changelog

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

