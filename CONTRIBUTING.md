# Contributing

Contact shlomoa@lightmoneysw.com with questions about contributing and before opening a PR and the project in general.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Use the formatting commands as needed:

   ```bash
   npm run format:check
   npm run format
   ```

   `npm run format:check` checks file formatting. `npm run format` fixes file
   formatting.

3. Run the canonical verification flow before opening a pull request:

   ```bash
   npm run format:check
   npm run lint
   npm run build
   npm run test:ci
   npm run pack:dry-run
   ```

## Project Layout

The repository is organized into three distinct npm workspaces:

- `projects/angular-django2`: authoritative publishable library and schematics collection package (source, standalone build/pack configs, and full runtime dependencies)
- `projects/angular-django2-reference`: standalone Angular Material 3 reference application demonstrating the package schematics with interactive command visualizers
- `projects/angular-django-validation`: standalone test and validation suite containing unit tests (Vitest Browser), integration tests, and Playwright E2E suites
- `projects/angular-django2/dist`: generated publishable package output after `npm run build`
- `.github/workflows`: CI and publishing automation workflows
- `tools`: repository automation scripts (such as release versioning)

## Subproject Development Workflows

You can run commands from the repository root using workspace delegation or directly within each project folder:

### 1. Schematics & Library (`projects/angular-django2`)

- Build package: `npm run build` (or `npm --workspace=angular-django2 run build`)
- Lint library: `npm --workspace=angular-django2 run lint`
- Dry-run package tarball: `npm run pack:dry-run` (or `npm --workspace=angular-django2 run pack:dry-run`)

### 2. Reference Application (`projects/angular-django2-reference`)

- Start dev server: `npm run serve:reference-app` (serves at `http://localhost:4200/`)
- Run component tests: `npm run test:reference-app`
- Build production bundle: `npm run build:reference-app`
- Lint reference app: `npm run lint:reference-app`

### 3. Validation & Testing (`projects/angular-django-validation`)

- Run Node & unit specs: `npm run test:node` (or `npm --workspace=angular-django-validation run test:unit`)
- Unit test watch mode: `npm run test:node:watch`
- Run Playwright E2E tests: `npm run test:playwright`
- Run end-to-end schematic suite: `npm run test:e2e` (with automatic stale tmp-area cleanup)
- Run E2E in debug mode: `npm run test:e2e:debug` (preserves temporary workspaces on failure)
- Lint validation suite: `npm run lint:validation`

## Development Notes

- This package has no runtime public API; its consumer surface is the schematics collection under `projects/angular-django2/schematics`.
- Package dependencies are maintained authoritatively in `projects/angular-django2/package.json`.
- Prefer standalone Angular patterns, signals, and provider functions over module-centric APIs in generated code.
- Avoid introducing redundant DOM wrapper elements (e.g. `<div>` around `<router-outlet />` or `<ng-content>`); follow `<ng-container>` zero-DOM BKM for projection and conditional boundaries to preserve grid/flex track integrity and outer padding contracts.
- Keep Django-related concerns explicit, especially config, URL handling, and CSRF naming.
- Keep schematics thin wrappers around Angular CLI behavior until you have a concrete customization to add.
- Update documentation when commands or package behavior change.

## Release Prep

Use the documented release flow in [docs/RELEASING.md](./docs/RELEASING.md).
