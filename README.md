# angular-django2

[![Documentation Status](https://readthedocs.org/projects/angular-django2/badge/?version=latest)](https://angular-django2.readthedocs.io/) [![CI](https://github.com/shlomoa/angular-django2/actions/workflows/ci.yml/badge.svg)](https://github.com/shlomoa/angular-django2/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/angular-django2)](https://www.npmjs.com/angular-django2)

**Note:** `angular-django2` is published to npm, but it is still pre-release
software and not yet alpha. The current package version is `0.4.4`.

`angular-django2` (also referred to as `ngdj`) is an Angular 22 workspace for
a Django-friendly npm package. It ships an Angular CLI schematics collection
for custom `ng generate` flows.

It is designed to work especially well with
[django-angular3](https://github.com/shlomoa/django-angular3), which owns the
Django-side workspace lifecycle and can register this package automatically.

For installation, tutorials, focused generation workflows, and the CLI
reference, see the [public documentation](https://angular-django2.readthedocs.io/).

## Repository

### What this repository contains

- `projects/angular-django2/schematics`: the schematics collection source
- `projects/angular-django2-reference`: the Angular Material tutorial and
  online reference application for this package
- `tests`: unit, integration, and end-to-end validation for schematics and
  tooling
- `tools`: repository automation such as release/version helpers
- `docs`: release and testing documentation
- `dist/angular-django2`: the publishable build output after `npm run build`

The current schematics collection includes:

- `ng-add`
- `application`
- `app-shell`
- `class`
- `component`
- `embed-component`
- `complex-component`
- `field-component`
- `form-field`
- `reactive-form`
- `service`
- `material-setup`
- `project-structure`
- `material-app`
- `workspace-setup`
- `openapi-setup`
- `data-service`
- `page`
- `site`

### Build, lint, and package this repository

#### Prerequisites

- Node.js `^22.22.3 || ^24.15.0 || >=26.0.0`
- npm `>=11`
- Python `3.12` for documentation validation

#### Install dependencies

```bash
npm install
```

#### Common repository commands

| Command                               | What it does                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm run build`                       | Validates source metadata, builds the schematics package, and validates its distribution metadata    |
| `npm run build:reference-app`         | Builds the Angular Material reference app                                                            |
| `npm run docs:build`                  | Builds the MkDocs site in strict mode                                                                |
| `npm run lint`                        | Runs ESLint across schematics, tests, and tools                                                      |
| `npm run lint:reference-app`          | Runs ESLint for the reference app project                                                            |
| `npm run lint:fix`                    | Applies fixable ESLint changes                                                                       |
| `npm run serve:reference-app`         | Starts the reference app dev server                                                                  |
| `npm run format:check`                | Checks file formatting with Prettier                                                                 |
| `npm run format`                      | Fixes file formatting with Prettier                                                                  |
| `npm run pack:dry-run`                | Rebuilds and verifies the npm tarball without publishing                                             |
| `npm run sync:package-metadata`       | Explicitly synchronizes publishable package metadata from the root manifest                          |
| `npm run check:package-metadata`      | Checks the source package manifest without modifying it                                              |
| `npm run check:dist-package-metadata` | Checks the generated distribution manifest without modifying it; requires `npm run build` beforehand |
| `npm run release:prepare`             | Runs the release verification flow                                                                   |

`npm run build` produces the publishable output in `dist/angular-django2`,
including the compiled schematics collection.

#### Documentation validation

Install the Python dependencies owned by `docs/requirements.txt`:

```bash
python -m pip install --requirement docs/requirements.txt
```

Then run the canonical strict documentation build:

```bash
npm run docs:build
```

### Testing in this repository

This repository includes Node-side schematic validation plus Angular Material
reference app tests.

Common commands:

- `npm run test:reference-app` — Angular Material reference app tests
- `npm run test:node` — Node-side unit coverage plus the schematic integration
  suite
- `npm run test:ci` — CI-friendly default test command
- `npm run test:e2e` — slower end-to-end schematic validation with automatic
  tmp-area cleanup
- `npm run test:e2e:debug` — the same E2E suite without tmp-area cleanup,
  useful for failure debugging

The CI-friendly test command is:

```bash
npm run test:ci
```

That runs:

- `npm run test:node`
- `npm run test:reference-app`

It does **not** run the E2E suite.

### Reference app workspace

This repository includes a repo-owned Angular Material reference app at
`projects/angular-django2-reference`. The app's displayed product name is
`angular-django2`; the workspace project key uses the `-reference` suffix so it
does not collide with the publishable library project named `angular-django2`.

The reference app includes a routed UI command explorer at `/ui`. It groups the
package schematics into category cards and detail pages, uses static
illustrations for visual commands, and uses text-first before/after panels for
commands without meaningful browser screenshots.

The app also includes a routed guides section at `/guides`. It lists guide cards
for the basic tutorial, complex components, data flow and binding, forms and
their interactions, quality, and security, and opens a detail page per guide
that explains how to use the package and what to expect.

Use these finite validation commands for the app infrastructure:

- `npm run build:reference-app`
- `npm run lint:reference-app`
- `npm run test:reference-app`

For local tutorial authoring, `npm run serve:reference-app` starts the dev
server.

For the canonical integration-testing guide — including `SchematicTestRunner`
coverage, E2E scenarios, build prerequisites, temp-workspace helpers,
cross-platform command-launch behavior, and platform caveats — see
`docs/INTEGRATION_TESTING.md`.

For the broader repository test index, see `tests/README.md`.

The current integration and E2E harnesses are intended to be OS agnostic. In
particular, the shared test helper owns the Angular CLI/Vitest launch strategy,
repo-root temp-workspace cleanup, and the browser-agnostic default E2E path.

### Release and publish notes

Before release:

1. Bump or set the release version with the checked-in versioning flow:

   ```bash
   npm run release:version -- patch
   ```

2. Sync checked-in version references and release-facing docs as needed:

- `CHANGELOG.md`
- `README.md`
- `projects/angular-django2/README.md`
- `docs/RELEASING.md`

3. Run the release verification flow:

   ```bash
   npm run release:prepare
   ```

`npm run format:check` checks file formatting during this step. If it
fails, run `npm run format` to fix file formatting before rerunning the
release verification flow.

4. If schematics changed, run the slower end-to-end schematic validation:

   ```bash
   npm run test:e2e
   ```

5. Prefer the checked-in GitHub Actions publish workflow, or publish locally
   from the build output when ready:

   ```bash
   npm publish ./dist/angular-django2 --access public
   ```

The checked-in GitHub Actions publish workflow currently authenticates with
`NPM_TOKEN`. Although the workflow already declares `id-token: write`, npm
Trusted Publisher is not the active publish path yet. See `docs/RELEASING.md`
for the canonical release checklist and publishing procedure.
