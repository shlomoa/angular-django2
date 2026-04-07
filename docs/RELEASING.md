# Releasing

## Prerequisites

- npm publish access to the `angular-django2` package
- a clean working tree or a deliberate release commit in progress
- npm 2FA enabled, or a granular access token with bypass 2FA for non-interactive publishing

Preferred CI/CD setup:

- configure npm Trusted Publisher for this repository and `.github/workflows/publish.yml`
- use GitHub-hosted runners

Current workflow fallback:

- if you are not using Trusted Publisher yet, configure the `NPM_TOKEN` repository secret

## What ships

The published tarball contains:

- the compiled runtime library from `projects/angular-django2/src`
- the compiled schematics collection for `application`, `service`, `class`, `app-shell`, `component`, and `ng-add`
- the package README and manifest generated into `dist/angular-django2`

## Local Release Flow

1. Confirm the unscoped package name is still available:

   ```bash
   npm view angular-django2
   ```

2. Update the root package version:

   ```bash
   npm version patch --no-git-tag-version
   ```

3. Sync publishable package metadata:

   ```bash
   npm run sync:package-metadata
   ```

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

5. Review the final `dist/angular-django2/package.json` and README if you changed package metadata or docs.

6. Commit the changed manifests and lockfile, tag the release, and push:

   ```bash
   git add package.json package-lock.json projects/angular-django2/package.json README.md docs/RELEASING.md
   git commit -m "Release vX.Y.Z"
   git tag vX.Y.Z
   git push origin main --follow-tags
   ```

## GitHub Actions Publish Flow

The `Publish npm package` workflow:

- installs dependencies with `npm ci`
- checks formatting
- runs lint
- runs tests
- builds the runtime library and schematics collection
- publishes `dist/angular-django2` to npm

Use the `npm-tag` workflow input to publish under `latest`, `next`, or another dist-tag.

Recommended setup:

- configure npm Trusted Publisher on npmjs.com for repository `shlomoa/angular-django2`
- point it at workflow filename `publish.yml`
- keep the workflow on GitHub-hosted runners

Fallback setup:

- store `NPM_TOKEN` as a repository secret until you migrate to Trusted Publisher

## Local Publish Alternative

If you prefer to publish locally after validation:

```bash
npm publish ./dist/angular-django2
```

If the package is later renamed to a scoped package, use `npm publish ./dist/angular-django2 --access public`.

## Recommended Order Of Operations

1. Bump the version.
2. Run `npm run release:prepare`.
3. Confirm the dry-run package contents look correct.
4. Commit and tag.
5. Publish locally or via GitHub Actions.

## Notes

- the first successful publish creates the npm package page automatically
- `angular-django2` is currently unscoped, so the name must be globally unique on npm
