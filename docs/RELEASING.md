# Releasing

## Prerequisites

- npm publish access to the `angular-django2` package
- a clean working tree or a deliberate release commit in progress
- npm 2FA enabled, or a granular access token with bypass 2FA for non-interactive publishing
- `NPM_TOKEN` configured for the repository if you publish through the checked-in GitHub Actions workflow

Current checked-in automation:

- the `Publish npm package` workflow runs on GitHub-hosted runners
- the workflow currently publishes with the `NPM_TOKEN` repository secret
- although the workflow already declares `id-token: write`, it does not yet use npm Trusted Publisher authentication

## What ships

The published tarball contains:

- the compiled runtime library from `projects/angular-django2/src`
- the compiled schematics collection from `projects/angular-django2/schematics`, including `ng-add`, `application`, `material-setup`, `project-structure`, `component`, `app-shell`, `service`, `class`, `ng-app`, `ng-workspace`, `ng-api`, and `data-service`
- the package README and manifest generated into `dist/angular-django2`

## Local Release Flow

1. Confirm the unscoped package name is still available:

   ```bash
   npm view angular-django2
   ```

2. Bump or set the release version:

   ```bash
   npm run release:version -- patch
   ```

   Supported inputs:
   - `patch`
   - `minor`
   - `major`
   - `prerelease`
   - an explicit version such as `0.2.0`

   Prerelease example:

   ```bash
   npm run release:version -- prerelease --preid next
   ```

   The script updates the root `package.json` version and then runs the same
   metadata synchronization flow used elsewhere in the repository so
   `projects/angular-django2/package.json` stays aligned.

3. Update release-facing docs if needed:
   - `CHANGELOG.md`
   - `README.md`
   - `projects/angular-django2/README.md`
   - `docs/RELEASING.md`

4. Validate the release candidate:

   ```bash
   npm run release:prepare
   ```

   `npm run release:prepare` runs:
   - `npm run format:check`
   - `npm run lint`
   - `npm run test:ci`
   - `npm run pack:dry-run`

   The dry-run step uses `npm pack --dry-run`, not `npm publish --dry-run`, so it validates the package contents without failing just because the current version is already on npm.

5. If you changed schematics behavior, optionally run the slower end-to-end
   schematic validation before publishing:

   ```bash
   npm run test:e2e
   ```

   See `docs/INTEGRATION_TESTING.md` for build prerequisites, E2E scope, and
   platform caveats.

6. Review the generated release artifacts:
   - `projects/angular-django2/package.json`
   - `dist/angular-django2/package.json`
   - `dist/angular-django2/README.md`

7. Commit the changed manifests, docs, and lockfile, tag the release, and push:

   ```bash
   git add package.json package-lock.json CHANGELOG.md README.md projects/angular-django2/package.json projects/angular-django2/README.md docs/RELEASING.md
   git commit -m "Release vX.Y.Z"
   git tag vX.Y.Z
   git push origin main --follow-tags
   ```

## GitHub Actions Publish Flow

The `Publish npm package` workflow:

- installs dependencies with `npm ci`
- checks formatting
- builds the runtime library and schematics collection
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

## Recommended Order Of Operations

1. Bump the version.
2. Update changelog and release-facing docs.
3. Run `npm run release:prepare`.
4. Optionally run `npm run test:e2e` when schematics changed.
   See `docs/INTEGRATION_TESTING.md` for the canonical integration/E2E testing
   guide.
5. Confirm the generated package contents look correct.
6. Commit and tag.
7. Publish locally or via GitHub Actions.

## Notes

- the first successful publish creates the npm package page automatically
- `angular-django2` is currently unscoped, so the name must be globally unique on npm
- the root `package.json` is the version source of truth
- `npm run release:version -- <bump>` updates that source of truth and then
  synchronizes the publishable library manifest
