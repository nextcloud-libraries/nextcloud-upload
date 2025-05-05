<!--
  - SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->
# @nextcloud/upload

[![REUSE status](https://api.reuse.software/badge/github.com/nextcloud-libraries/nextcloud-upload)](https://api.reuse.software/info/github.com/nextcloud-libraries/nextcloud-upload)
[![npm last version](https://img.shields.io/npm/v/@nextcloud/upload.svg?style=flat-square)](https://www.npmjs.com/package/@nextcloud/upload)
![Codecov](https://img.shields.io/codecov/c/github/nextcloud-libraries/nextcloud-upload?style=flat-square)

Nextcloud upload helpers for Nextcloud apps 

## Usage
📘 [API documentation](https://nextcloud-libraries.github.io/nextcloud-upload)

## Development

### 📤 Releasing a new version

- Pull the latest changes from `main` or `stableX`
- Checkout a new branch with the tag name (e.g `v4.0.1`): `git checkout -b v<version>`
- Run `npm version patch --no-git-tag-version` (`npm version minor --no-git-tag-version` if minor).
  This will return a new version name, make sure it matches what you expect
- Generate the changelog content from the [release](https://github.com/nextcloud-libraries/nextcloud-upload/releases) page.
  Create a draft release, select the previous tag, click `generate` then paste the content to the `CHANGELOG.md` file
  1. adjust the links to the merged pull requests and authors so that the changelog also works outside of GitHub
     by running `npm run prerelease:format-changelog`.
     This will apply this regex: `by @([^ ]+) in ((https://github.com/)nextcloud-libraries/nextcloud-upload/pull/(\d+))`
     Which this as the replacement: `[\#$4]($2) \([$1]($3$1)\)`
  2. use the the version as tag AND title (e.g `v4.0.1`)
  3. add the changelog content as description (https://github.com/nextcloud-libraries/nextcloud-upload/releases)
- Commit, push and create PR
- Get your PR reviewed and merged
- Create a milestone with the follow-up version at https://github.com/nextcloud-libraries/nextcloud-upload/milestones
- Move all open tickets and PRs to the follow-up
- Close the milestone of the version you release
- Publish the previously drafted release on GitHub
  ![image](https://user-images.githubusercontent.com/14975046/124442568-2a952500-dd7d-11eb-82a2-402f9170231a.png)
