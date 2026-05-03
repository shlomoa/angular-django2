# angular-django2

**Note:** This repository is a work in progress although published to npm, it's not even alpha. The current state of the package is v0.1.2, pre-release.

`angular-django2` (also referred to as `ngdj`) is an Angular library workspace for building and publishing a Django-friendly Angular package to npm.

The package is set up to ship both:

- runtime Angular utilities for Django-oriented configuration
- Angular CLI schematics for custom `ng generate` flows

This library is designed to integrate with [django-angular3](https://github.com/shlomoa/django-angular3), which provides Django management commands for Angular workspace operations.

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
- custom schematics collection for `application`, `service`, `class`, `app-shell`, `component`, `material-setup`, `project-structure`, `ng-app`, `ng-api`, and `data-service`
- Angular runtime tests through the Angular 21 Vitest-based test builder
- Node-side Vitest tests for schematics and tooling
- ESLint flat-config linting for library code, schematics, tests, and tools (via `ng lint`)
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
ng lint
```

Apply fixable ESLint changes:

```bash
ng lint --fix
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

Verify the package tarball contents without actually publishing anything:

```bash
npm run pack:dry-run
```

This uses `npm pack --dry-run`, so it keeps working even after the current version has already been published.

## npm Publish Prerequisites

Before the first real publish:

- confirm the unscoped package name is still available with `npm view angular-django2`
- sign in with `npm login` and verify with `npm whoami`
- enable npm 2FA, or use a granular token with bypass 2FA if publishing non-interactively

The first successful publish creates the package page on npmjs.com automatically.

## Custom Generate Commands

This package publishes an Angular CLI schematics collection. After installing it in a consuming workspace you can use commands such as:

```bash
ng generate angular-django2:application my-app
ng generate angular-django2:material-setup --project=my-app
ng generate angular-django2:project-structure --project=my-app
ng generate angular-django2:component dashboard-card
ng generate angular-django2:service django-api
ng generate angular-django2:class api-contract
ng generate angular-django2:app-shell
ng generate angular-django2:ng-app my-app
ng generate angular-django2:ng-api --inputPath=openapi.json
ng generate angular-django2:data-service users
```

The current wrappers deliberately stay close to Angular CLI behavior while applying a few project defaults:

- `application`: defaults to `standalone: true`, `routing: true`, and `style: 'scss'`
- `material-setup`: configures Angular Material in an existing project with theme and providers
  - Options: `--theme` (indigo-pink, deeppurple-amber, pink-bluegrey, purple-green, custom), `--typography`, `--animations`
  - Updates `angular.json` styles array for prebuilt themes or generates custom theme in `styles.scss`
- `project-structure`: creates standard directory structure with barrel exports
  - Creates `core/`, `shared/components/`, `shared/pipes/`, and `features/` directories with `index.ts` files
- `component`: defaults to `standalone: true` and `changeDetection: 'OnPush'`
- `service`, `class`, and `app-shell`: forward options directly to Angular CLI
- `ng-app`: generates a complete Angular app with Material UI in a single step
  - Runs `application`, installs `@angular/material`/`@angular/cdk`, configures Material theming, creates the standard directory structure (`core/`, `shared/`, `features/`), and writes a responsive sidenav app shell into `app.component.*`
  - Options: `--theme`, `--typography`, `--animations`, `--routing`, `--standalone`, `--style`, `--prefix`
- `ng-api`: bootstraps [ng-openapi-gen](https://github.com/cyclosproject/ng-openapi-gen) for OpenAPI client generation
  - Adds `ng-openapi-gen` to `devDependencies`, writes `ng-openapi-gen.json`, and adds a `generate:api` npm script
  - Options: `--inputPath` (default: `openapi.json`), `--outputPath` (default: `src/app/api`)
  - After setup, run `npm run generate:api` to produce typed Angular services and models
- `data-service`: generates a typed wrapper around an ng-openapi-gen `*ApiService`
  - Produces a `*DataService` with search and CRUD helpers; the wrapped API service is inferred from the resource name or supplied via `--apiService`
  - Options: `--apiService`, `--apiPath` (default: `../api/services`), `--path`, `--flat`, `--skipTests`
- `ng add angular-django2`: prepends `angular-django2` to `cli.schematicCollections`

### OpenAPI workflow

```bash
# 1. Bootstrap ng-openapi-gen
ng generate angular-django2:ng-api --inputPath=openapi.json

# 2. Generate typed Angular services from your OpenAPI spec
npm run generate:api

# 3. Wrap a generated service with search/CRUD helpers
ng generate angular-django2:data-service users
```

After `ng add angular-django2`, you can also use the specialized commands through the workspace collection order:

```json
{
  "cli": {
    "schematicCollections": ["angular-django2", "@schematics/angular"]
  }
}
```

## Django Integration

This library is designed to integrate with [django-angular3](https://github.com/shlomoa/django-angular3), which provides Django management commands for Angular workspace operations. The django-angular3 package uses `django-admin` commands to:

- Generate and configure Angular workspaces
- Run `ng add angular-django2` to register this library's schematics
- Coordinate Django and Angular project structure

When using django-angular3, the `ng add angular-django2` schematic is automatically invoked to register the schematic collection in your Angular workspace.

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
   - Preferred: configure npm Trusted Publisher for `.github/workflows/publish.yml`, then trigger the `Publish npm package` GitHub Actions workflow.
   - Current workflow fallback: add an `NPM_TOKEN` secret and trigger the `Publish npm package` GitHub Actions workflow.
   - Publish locally with `npm publish ./dist/angular-django2`.

   If the package name later changes to a scoped package such as `@scope/angular-django2`, publish with `--access public`.

## GitHub Actions

- `CI`: installs dependencies, checks formatting, runs lint, runs tests, builds the library, and verifies the generated npm tarball on pushes and pull requests.
- `Publish npm package`: installs dependencies, checks formatting, runs lint and tests, builds the package, and publishes it to npm.

Recommended npm setup:

- use npm Trusted Publisher with GitHub Actions for token-free publishing
- keep the workflow on GitHub-hosted runners

Current workflow compatibility:

- the checked-in workflow still supports `NPM_TOKEN`
- if you keep the token path, use a granular token with only the required publish access

## References

- Angular libraries: https://angular.dev/tools/libraries
- Schematics for libraries: https://angular.dev/tools/cli/schematics-for-libraries
- Generating code using schematics: https://angular.dev/tools/cli/schematics
- Workspace schematic collections: https://angular.dev/reference/configs/workspace-config
- npm trusted publishers: https://docs.npmjs.com/trusted-publishers/
- npm 2FA requirements: https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/
