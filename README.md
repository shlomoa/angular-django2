# angular-django2

`angular-django2` is an Angular library workspace for building and publishing a Django-friendly Angular package to npm.

The package is set up to ship both:

- runtime Angular utilities for Django-oriented configuration
- Angular CLI schematics for custom `ng generate` flows

The workspace follows the current Angular.dev library flow:

```bash
ng new my-workspace --no-create-application
cd my-workspace
ng generate library my-lib
```

This repository is already set up around that model and targets Angular 21.

## What is included

- Angular 21 library workspace in `projects/angular-django2`
- npm-ready package metadata for the published library
- custom schematics collection for `application`, `service`, `class`, `app-shell`, and `component`
- Angular runtime tests through the Angular 21 Vitest-based test builder
- Node-side Vitest tests for schematics and tooling
- ESLint flat-config linting for library code, schematics, tests, and tools
- Prettier formatting configuration
- GitHub Actions for CI and npm publishing
- build and release documentation for local and CI-driven publishing

## Workspace layout

- `projects/angular-django2/src`: runtime library source and public API
- `projects/angular-django2/schematics`: schematics collection source
- `tests`: Node-side tests for schematics and tooling
- `tools`: repository automation scripts
- `docs/RELEASING.md`: full release checklist

## Runtime API

The current runtime surface is intentionally small:

- `provideAngularDjango2(config?)`: registers Django-oriented defaults in Angular DI
- `ANGULAR_DJANGO2_CONFIG`: exposes the resolved configuration token
- `AngularDjango2Service`: builds API URLs and CSRF header objects

Typical Angular.dev-style standalone setup:

```ts
import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideAngularDjango2 } from 'angular-django2';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withXsrfConfiguration({
        cookieName: 'csrftoken',
        headerName: 'X-CSRFToken',
      }),
    ),
    provideAngularDjango2({
      apiBaseUrl: 'https://api.example.com',
      withCredentials: true,
    }),
  ],
};
```

## Prerequisites

- Node.js `^20.19.0 || ^22.12.0 || ^24.0.0`
- npm `>=11`

## Install

```bash
npm install
```

## Build

Build the library for distribution:

```bash
npm run build
```

The packaged output is written to `dist/angular-django2`, including the schematics collection.

For iterative local development:

```bash
npm run build:watch
```

## Test

Run the interactive test watcher:

```bash
npm test
```

Run the Node-side schematics and tooling tests:

```bash
npm run test:node
```

Run the CI-friendly combined test command:

```bash
npm run test:ci
```

## Lint

Run ESLint across the library source, schematics, tests, and tooling:

```bash
npm run lint
```

Apply fixable ESLint changes:

```bash
npm run lint:fix
```

## Format

Check formatting:

```bash
npm run format:check
```

Write formatting changes:

```bash
npm run format
```

## Package Dry Run

Verify the package can be built and published without actually publishing it:

```bash
npm run pack:dry-run
```

## Custom Generate Commands

This package publishes an Angular CLI schematics collection. After installing it in a consuming workspace you can use commands such as:

```bash
ng generate angular-django2:application my-app
ng generate angular-django2:component dashboard-card
ng generate angular-django2:service django-api
ng generate angular-django2:class api-contract
ng generate angular-django2:app-shell
```

The current wrappers deliberately stay close to Angular CLI behavior while applying a few project defaults:

- `application`: defaults to `standalone: true` and `routing: true`
- `component`: defaults to `standalone: true` and `changeDetection: 'OnPush'`
- `service`, `class`, and `app-shell`: forward options directly to Angular CLI
- `ng add angular-django2`: prepends `angular-django2` to `cli.schematicCollections`

After `ng add angular-django2`, you can also use the specialized commands through the workspace collection order:

```json
{
  "cli": {
    "schematicCollections": ["angular-django2", "@schematics/angular"]
  }
}
```

## Release Instructions

1. Update the workspace package version without creating a git tag:

   ```bash
   npm version patch --no-git-tag-version
   ```

   Replace `patch` with `minor`, `major`, or an explicit version as needed.

2. Sync the published library metadata from the root package manifest:

   ```bash
   npm run sync:package-metadata
   ```

3. Run the release verification flow:

   ```bash
   npm run release:prepare
   ```

   This runs:
   - `npm run format:check`
   - `npm run lint`
   - `npm run test:ci`
   - `npm run pack:dry-run`

4. Commit the versioned files and create a release tag:

   ```bash
   git add package.json projects/angular-django2/package.json package-lock.json
   git commit -m "Release vX.Y.Z"
   git tag vX.Y.Z
   git push origin main --follow-tags
   ```

5. Publish with one of these options:
   - Trigger the `Publish npm package` GitHub Actions workflow.
   - Publish locally with `npm publish ./dist/angular-django2 --access public`.

## GitHub Actions

- `CI`: installs dependencies, checks formatting, runs lint, runs tests, builds the library, and verifies an npm publish dry-run on pushes and pull requests.
- `Publish npm package`: installs dependencies, checks formatting, runs lint and tests, builds the package, and publishes it to npm using `NPM_TOKEN`.

For the publish workflow, add an `NPM_TOKEN` repository secret with publish access to the npm package.

## References

- Angular libraries: https://angular.dev/tools/libraries
- Schematics for libraries: https://angular.dev/tools/cli/schematics-for-libraries
- Generating code using schematics: https://angular.dev/tools/cli/schematics
- Workspace schematic collections: https://angular.dev/reference/configs/workspace-config
