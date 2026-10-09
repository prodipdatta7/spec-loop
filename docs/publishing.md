# Publishing SpecLoop

SpecLoop is prepared as the public npm package `@prodipdatta7/specloop`, with the command `specloop`. Publishing is a separate maintainer action; preparation and testing do not upload a release.

## First release

This release uses Apache-2.0, with the full license in `LICENSE`, an attribution in `NOTICE`, and `prodipdatta7` as its author. Do not put private URLs or credentials in package metadata.

The public source repository is [prodipdatta7/spec-loop](https://github.com/prodipdatta7/spec-loop). Package metadata links to this repository, its README and its issue tracker.

From the repository root, run:

```sh
npm ci
npm run check
npm run release:check
npm pack --dry-run
```

`release:check` packs the real distribution, checks its file list, installs it with its production dependencies into a clean temporary directory, checks the command entry point, and exercises installation, prepare, update and uninstall for all five adapters. It preserves the existing instruction file and the created spec during removal. It does not invoke coding models or certify native-host integration. It requires network access to install production dependencies.

The package file list excludes session records, tests, local run history and development dependencies. Inspect the pack output before publishing. The code has no install lifecycle hook: installing the npm package does not modify a user's project. Users choose their adapter separately.

Create an npm account with publishing authentication configured, then sign in yourself:

```sh
npm login
npm whoami
npm view @prodipdatta7/specloop name version
```

npm rejected the unscoped name `specloop` because it is too similar to the existing `spec-loop` package. The distribution therefore uses the author-owned scope `@prodipdatta7/specloop`. The project and CLI remain SpecLoop and `specloop`.

When the release contents and metadata are ready, run:

```sh
npm publish --dry-run
npm publish
```

`publishConfig` selects the public npm registry and public access. `prepublishOnly` runs the test suite and tarball smoke check before a normal source-directory publication. Complete npm's authentication prompts yourself. Never commit a token. See npm's [publishing command](https://docs.npmjs.com/cli/v11/commands/npm-publish/) and [authentication requirements](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/).

After successful publication, verify the release:

```sh
npm view @prodipdatta7/specloop version
npm install -g @prodipdatta7/specloop
specloop --help
```

Keep the installation guide aligned with the published package name. The native-host validation limits in the README should remain until those integrations are actually exercised.

## Subsequent releases

Make and test the changes, then increase the version:

```sh
npm version patch --no-git-tag-version
npm publish --dry-run
npm publish
```

Use the appropriate version increment for the change. A published name/version combination cannot be reused. `--no-git-tag-version` leaves committing and tagging the release as separate maintainer actions.
