# Releasing

## Prerequisites

- npm publish access to the `angular-django2` package
- GitHub repository secret `NPM_TOKEN` configured for the publish workflow
- a clean working tree or a deliberate release commit in progress

## What ships

The published tarball contains:

- the compiled runtime library from `projects/angular-django2/src`
- the compiled schematics collection for `application`, `service`, `class`, `app-shell`, `component`, and `ng-add`
- the package README and manifest generated into `dist/angular-django2`

## Local Release Flow

1. Update the root package version:

   ```bash
   npm version patch --no-git-tag-version
   ```

2. Sync publishable package metadata:

   ```bash
   npm run sync:package-metadata
   ```

3. Validate the release candidate:

   ```bash
   npm run release:prepare
   ```

   `npm run release:prepare` runs:
   - `npm run format:check`
   - `npm run lint`
   - `npm run test:ci`
   - `npm run pack:dry-run`

4. Review the final `dist/angular-django2/package.json` and README if you changed package metadata or docs.

5. Commit the changed manifests and lockfile, tag the release, and push:

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

## Local Publish Alternative

If you prefer to publish locally after validation:

```bash
npm publish ./dist/angular-django2 --access public
```

## Recommended Order Of Operations

1. Bump the version.
2. Run `npm run release:prepare`.
3. Confirm the dry-run package contents look correct.
4. Commit and tag.
5. Publish locally or via GitHub Actions.
