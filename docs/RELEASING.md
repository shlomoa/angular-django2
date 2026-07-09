# Releasing

## Prerequisites

- npm publish access to the `angular-django2` package
- a clean working tree or a deliberate release commit in progress
- npm 2FA enabled, or a granular access token with bypass 2FA for non-interactive publishing
- `NPM_TOKEN` configured for the repository if you publish through the checked-in GitHub Actions workflow
- `docs/index.md` aligned with `README.md` for the hosted documentation landing page

Current checked-in automation:

- the `Publish npm package` workflow runs on GitHub-hosted runners
- the workflow currently publishes with the `NPM_TOKEN` repository secret
- although the workflow already declares `id-token: write`, it does not yet use npm Trusted Publisher authentication

## What ships

The published tarball contains:

- the compiled schematics collection from `projects/angular-django2/schematics`, including `ng-add`, `application`, `material-setup`, `project-structure`, `component`, `app-shell`, `service`, `class`, `ng-app`, `ng-workspace`, `ng-api`, and `data-service`
- the package README and manifest generated into `dist/angular-django2`

## Versioning Script

Use the checked-in versioning script through the root npm script:

```bash
npm run release:version -- patch
```

`npm run release:version` runs `tools/release-version.mjs`. The script is the
source of truth for calculating the next package version and synchronizing the
two checked-in package manifests.

The script updates:

- `package.json`
- `projects/angular-django2/package.json`

The script does not update:

- `package-lock.json`
- `README.md`
- `CHANGELOG.md`
- `dist/angular-django2/package.json`
- Git commits or tags
- GitHub Actions workflow dispatches
- npm publishing

Handle those follow-up steps explicitly in the release plan below.

## Detailed Release Plan

1. Confirm package state and release prerequisites.
   - **1.1** Confirm the unscoped package name is still available:

     ```bash
     npm view angular-django2
     ```

   - **1.2** Confirm you have npm publish access to the `angular-django2` package.
   - **1.3** Confirm the working tree is clean, or that the only pending changes are the intentional release changes.
   - **1.4** Confirm npm 2FA is enabled, or that you have a granular access token with bypass 2FA for non-interactive publishing.
   - **1.5** If you plan to publish through the checked-in GitHub Actions workflow, confirm the repository has `NPM_TOKEN` configured.

2. Bump or set the release version.
   - **2.1** Run `tools/release-version.mjs` through the npm script with the
     appropriate bump:

     ```bash
     npm run release:version -- patch
     ```

   - **2.2** Supported inputs are:
     - `patch`
     - `minor`
     - `major`
     - `prerelease`
     - an explicit version such as `0.2.0`

   - **2.3** For a prerelease, use:

     ```bash
     npm run release:version -- prerelease --preid next
     ```

   - **2.4** Confirm the root `package.json` version changed to the intended release version.
   - **2.5** Confirm `projects/angular-django2/package.json` stayed aligned after the metadata synchronization step.

   The script updates the root `package.json` version and then runs the same
   metadata synchronization flow used elsewhere in the repository so
   `projects/angular-django2/package.json` stays aligned.

3. Sync checked-in version references and release-facing documentation.
   - **3.1** Rebuild the package output and refresh the lockfile so tracked
     package metadata and file-dependency entries match the intended release
     version:

     ```bash
     npm run build
     npm install --package-lock-only --ignore-scripts
     ```

     The root workspace depends on `angular-django2` through
     `file:dist/angular-django2`, so the lockfile can retain the previous
     `dist/angular-django2` version until the package output is rebuilt.

   - **3.2** Confirm `package-lock.json` top-level version entries and the
     `packages["dist/angular-django2"].version` entry match the intended
     release version.
   - **3.3** Review and update `README.md` for any explicit current-version
     references, such as the package version shown near the top of the
     repository overview.
   - **3.4** Review `tests/release-version.spec.ts`. The existing version
     values are behavior fixtures for the versioning helper, not automatically
     current-release references. Update them only if a fixture is intentionally
     meant to track the current repository release version or if the expected
     versioning behavior changes.
   - **3.5** Review and update `CHANGELOG.md` for the release being prepared.
     Do this after the version bump and before `npm run release:prepare`, so
     the release candidate includes the final user-facing notes.
   - **3.6** Review and update `projects/angular-django2/README.md` if
     package-facing behavior or examples changed.
   - **3.7** Review and update `docs/RELEASING.md` if the release procedure
     itself changed.

4. Validate the release candidate.
   - **4.1** Run the release preparation command:

     ```bash
     npm run release:prepare
     ```

   - **4.2** Confirm all included checks pass:
     - `npm run format:check` (checks file formatting)
     - `npm run lint`
     - `npm run test:ci`
     - `npm run pack:dry-run`
   - **4.3** If `npm run format:check` fails, run `npm run format` to fix file
     formatting and then rerun `npm run release:prepare`.
   - **4.4** Confirm the dry-run package contents look correct.

The dry-run step uses `npm pack --dry-run`, not `npm publish --dry-run`, so
it validates the package contents without failing just because the current
version is already on npm.

5. Run additional schematic validation if needed.
   - **5.1** If you changed schematics behavior, run the slower end-to-end
     validation before publishing:

     ```bash
     npm run test:e2e
     ```

   - **5.2** Use `docs/INTEGRATION_TESTING.md` for build prerequisites, E2E scope, and platform caveats.

6. Review the generated release artifacts.
   - **6.1** Review `projects/angular-django2/package.json`.
   - **6.2** Review `dist/angular-django2/package.json`.
   - **6.3** Review `dist/angular-django2/README.md`.
   - **6.4** Confirm the generated version, metadata, and README contents match the intended release.

7. Commit, tag, and push the release.
   - **7.1** Stage the changed manifests, docs, lockfile, and any optional
     release-version test fixture updates:

     ```bash
     git add package.json package-lock.json CHANGELOG.md README.md projects/angular-django2/package.json projects/angular-django2/README.md docs/RELEASING.md tests/release-version.spec.ts
     ```

   - **7.2** Commit the release:

     ```bash
     git commit -m "Release vX.Y.Z"
     ```

   - **7.3** Create the release tag:

     ```bash
     git tag vX.Y.Z
     ```

   - **7.4** Push the branch and tag:

     ```bash
     git push origin main --follow-tags
     ```

8. Publish the package.
   - **8.1** Preferred method: publish with the checked-in GitHub Actions workflow described below.
   - **8.2** Choose the appropriate `npm-tag` workflow input, such as `latest` for a stable release or `next` for a prerelease.
   - **8.3** If you prefer to publish locally after validation, use the local publish alternative described below.

9. Verify the published release.
   - **9.1** Confirm the new version appears on npm.
   - **9.2** Confirm the package was published under the intended dist-tag.
   - **9.3** Spot-check the published package README and metadata if needed.
   - **9.4** Confirm the ReadTheDocs build passed and the hosted docs reflect the
     new version at <https://angular-django2.readthedocs.io/>. ReadTheDocs
     triggers automatically on pushes to `main`; check the build status at
     <https://readthedocs.org/projects/angular-django2/builds/>.

## GitHub Actions Publish Flow

The `Publish npm package` workflow:

- installs dependencies with `npm ci`
- checks file formatting with `npm run format:check`
- builds the schematics collection
- runs lint
- runs tests
- publishes `dist/angular-django2` to npm

Use the `npm-tag` workflow input to publish under `latest`, `next`, or another dist-tag.

Current authentication model:

- store `NPM_TOKEN` as a repository secret
- the checked-in workflow publishes with `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`
- if you later migrate to npm Trusted Publisher, update this document and `.github/workflows/publish.yml` together

## Local Publish Alternative

If you prefer to publish locally after validation:

```bash
npm publish ./dist/angular-django2 --access public
```

If the package is later renamed to a scoped package, use `npm publish ./dist/angular-django2 --access public`.

## Notes

- the first successful publish creates the npm package page automatically
- `angular-django2` is currently unscoped, so the name must be globally unique on npm
- the root `package.json` is the version source of truth
- `npm run release:version -- <bump>` updates that source of truth and then
  synchronizes the publishable library manifest
