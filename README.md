# angular-django2

[![Documentation Status](https://readthedocs.org/projects/angular-django2/badge/?version=latest)](https://angular-django2.readthedocs.io/)

**Note:** `angular-django2` is published to npm, but it is still pre-release
software and not yet alpha. The current package version is `0.1.4`.

`angular-django2` (also referred to as `ngdj`) is an Angular 22 library
workspace for a Django-friendly npm package. It ships two things:

- runtime Angular utilities for Django-oriented configuration
- an Angular CLI schematics collection for custom `ng generate` flows

It is designed to work especially well with
[django-angular3](https://github.com/shlomoa/django-angular3), which owns the
Django-side workspace lifecycle and can register this package automatically.

## Repository

### What this repository contains

- `projects/angular-django2/src`: the runtime library and public API
- `projects/angular-django2/schematics`: the schematics collection source
- `projects/angular-django2-reference`: the Angular Material tutorial and
  online reference application for this package
- `tests`: unit, integration, and end-to-end validation for schematics and
  tooling
- `tools`: repository automation such as release/version helpers
- `docs`: release and testing documentation
- `dist/angular-django2`: the publishable build output after `npm run build`

The current public runtime surface is intentionally small:

- `provideAngularDjango2(config?)`
- `ANGULAR_DJANGO2_CONFIG`
- `AngularDjango2Service`
- configuration types exported from `projects/angular-django2/src/public-api.ts`

The current schematics collection includes:

- `ng-add`
- `application`
- `app-shell`
- `class`
- `component`
- `service`
- `material-setup`
- `project-structure`
- `ng-app`
- `ng-workspace`
- `ng-api`
- `data-service`

### Runtime API at a glance

Typical standalone Angular setup:

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

Resolved defaults:

- `apiBaseUrl: ''`
- `csrfCookieName: 'csrftoken'`
- `csrfHeaderName: 'X-CSRFToken'`
- `withCredentials: true`

Current HTTP/CSRF boundaries:

- the package does not currently ship its own `HttpClient` interceptor or automatic request wiring
- `withCredentials` is stored in config but is not automatically applied to requests
- there is no built-in CSRF cookie reader beyond the manual `csrfHeader()` helper on `AngularDjango2Service`
- today, examples should prefer Angular's own `provideHttpClient(...)` and `withXsrfConfiguration(...)` alongside `provideAngularDjango2(...)`

### Build, lint, and package this repository

#### Prerequisites

- Node.js `^22.22.3 || ^24.15.0 || >=26.0.0`
- npm `>=11`

#### Install dependencies

```bash
npm install
```

#### Common repository commands

| Command                         | What it does                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm run build`                 | Syncs package metadata, builds the Angular library, and compiles schematics into `dist/angular-django2` |
| `npm run build:reference-app`   | Builds the library output needed by the reference app, then builds the Angular Material reference app   |
| `npm run build:watch`           | Watches the Angular library build for iterative development                                             |
| `npm run lint`                  | Runs ESLint across library code, schematics, tests, and tools                                           |
| `npm run lint:reference-app`    | Runs ESLint for the reference app project                                                               |
| `npm run lint:fix`              | Applies fixable ESLint changes                                                                          |
| `npm run serve:reference-app`   | Builds the library output needed by the reference app, then starts the app dev server                   |
| `npm run format:check`          | Checks file formatting with Prettier                                                                    |
| `npm run format`                | Fixes file formatting with Prettier                                                                     |
| `npm run pack:dry-run`          | Rebuilds and verifies the npm tarball without publishing                                                |
| `npm run sync:package-metadata` | Syncs library package metadata from the root manifest                                                   |
| `npm run release:prepare`       | Runs the release verification flow                                                                      |

`npm run build` produces the publishable output in `dist/angular-django2`,
including the compiled schematics collection.

### Testing in this repository

This repository includes Angular library tests plus Node-side schematic
validation.

Common commands:

- `npm test` — Angular library tests
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
- `ng test angular-django2 --watch=false`
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

Use these finite validation commands for the app infrastructure:

- `npm run build:reference-app`
- `npm run lint:reference-app`
- `npm run test:reference-app`

For local tutorial authoring, `npm run serve:reference-app` starts the dev
server after building the library output that backs the app's public package
import.

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

- `package-lock.json`
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

## HOWTO

### Understand the intended flow first

`angular-django2` is **not** the top-level workspace bootstrapper.

The intended user flow is:

1. create or configure the Angular workspace via `django-angular3`
2. let that integration register `angular-django2` with `ng add angular-django2`
3. use the `angular-django2` schematics inside that workspace

If you are not using `django-angular3`, a plain Angular workspace still works
fine; that compatibility flow is shown below.

### Recommended flow inside a django-angular3-managed workspace

Once your Angular workspace exists and `angular-django2` is registered, the
shortest path to a running app is:

```bash
ng generate angular-django2:ng-workspace my-app
ng generate angular-django2:ng-app my-app
npm install
ng build my-app
ng serve my-app
```

Use `ng-app` when you want the package to generate:

- an Angular application
- Angular Material dependencies and theme configuration
- a standard `core/`, `shared/`, and `features/` structure
- a responsive Material app shell

If the workspace was created empty with `--no-create-application`, run
`ng-workspace` first so the workspace-level bootstrap files are written before
the application is generated.

### Manual Angular-only setup

If you are not using `django-angular3`, create a minimal Angular workspace
first, then add `angular-django2`:

```bash
npx -y @angular/cli@21 new demo-workspace --no-create-application --package-manager npm --skip-git --defaults
cd demo-workspace
npm install angular-django2
npx ng add angular-django2 --skip-confirmation
npx ng generate angular-django2:ng-workspace my-app
npx ng generate angular-django2:ng-app my-app
npm install
npx ng build my-app
npx ng serve my-app
```

To validate a local sibling build instead of the published npm package, replace
the install line with:

```bash
npm install ../angular-django2/dist/angular-django2
```

### Available commands

After `angular-django2` is installed in a workspace, these commands are
available:

| Command                                                          | Purpose                                                                 | Notes                                              |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------- |
| `ng add angular-django2`                                         | Registers the collection in `angular.json`                              | Automatically done by `django-angular3`            |
| `ng generate angular-django2:application <name>`                 | Creates an Angular application                                          | Defaults to standalone routing + SCSS              |
| `ng generate angular-django2:material-setup --project=<name>`    | Configures Angular Material in an existing project                      | Supports `--theme`, `--typography`, `--animations` |
| `ng generate angular-django2:project-structure --project=<name>` | Creates `core/`, `shared/components/`, `shared/pipes/`, and `features/` | Writes barrel `index.ts` files                     |
| `ng generate angular-django2:component <name>`                   | Creates a component with package defaults                               | Uses standalone + `OnPush` defaults                |
| `ng generate angular-django2:service <name>`                     | Creates a service                                                       | Pass-through to Angular CLI service schematic      |
| `ng generate angular-django2:class <name>`                       | Creates a class                                                         | Pass-through to Angular CLI class schematic        |
| `ng generate angular-django2:app-shell --project=<name>`         | Creates or updates the app shell                                        | Pass-through schematic for app shell generation    |
| `ng generate angular-django2:ng-app <name>`                      | Creates a complete app in one flow                                      | Best “get me running quickly” option               |
| `ng generate angular-django2:ng-workspace <name>`                | Writes workspace-wide bootstrap files and configures vitest             | Use before `ng-app` in an empty workspace          |
| `ng generate angular-django2:ng-api --inputPath=<file>`          | Bootstraps `ng-openapi-gen`                                             | Adds `generate:api` script                         |
| `ng generate angular-django2:data-service <resource>`            | Creates a typed `*DataService` wrapper                                  | Designed for generated OpenAPI services            |

### Recipes for a running Angular app

#### Fastest path: generate a complete app in one step

```bash
ng generate angular-django2:ng-app my-app --theme=indigo-pink --typography=true --animations=true
npm install
ng build my-app
ng serve my-app
```

Use this when you want the package to do most of the wiring for you.

#### Empty workspace bootstrap

Use this when you created the workspace with `--no-create-application` and
want both workspace-level bootstrap files and a running Angular app:

```bash
ng generate angular-django2:ng-workspace my-app
ng generate angular-django2:ng-app my-app --theme=indigo-pink --typography=true --animations=true
npm install
ng build my-app
ng serve my-app
```

#### Step-by-step app setup

Use this when you want explicit control over each stage:

```bash
ng generate angular-django2:application my-app
npm install @angular/material @angular/cdk @angular/animations
ng generate angular-django2:material-setup --project=my-app --theme=indigo-pink --typography=true --animations=true
ng generate angular-django2:project-structure --project=my-app
ng generate angular-django2:app-shell --project=my-app
ng build my-app
ng serve my-app
```

#### Provisioning application source files from `ng-workspace`

`ng-workspace` exposes per-file hooks for the application source files
documented at
https://angular.dev/reference/configs/file-structure#application-source-files.
Each hook supports exactly one of three modes:

| Mode       | Field      | Behavior                                                                                                                                                                              |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inline     | `content`  | Write the supplied string verbatim to the target path (overwrites any existing file).                                                                                                 |
| Local link | `path`     | Read content from a local filesystem path (absolute, or relative to the working directory) at schematic execution time.                                                               |
| Template   | `template` | Write the supplied literal body, substituting any `{{key}}` placeholders with the matching `params` value. Optional whitespace inside the braces (e.g. `{{ key }}`) is also accepted. |

Recognized file keys and their target paths (under `/src` by default, or under
the selected project's `sourceRoot` when `--project` is provided):

| Key                  | Target path                 |
| -------------------- | --------------------------- |
| `favicon`            | `favicon.ico`               |
| `indexHtml`          | `index.html`                |
| `mainTs`             | `main.ts`                   |
| `stylesCss`          | `styles.css`                |
| `appConfigTs`        | `app/app.config.ts`         |
| `appComponentTs`     | `app/app.component.ts`      |
| `appComponentHtml`   | `app/app.component.html`    |
| `appComponentCss`    | `app/app.component.css`     |
| `appComponentSpecTs` | `app/app.component.spec.ts` |
| `appModuleTs`        | `app/app.module.ts`         |
| `appRoutesTs`        | `app/app.routes.ts`         |

Because the CLI does not pass nested object options on the command line, drive
`ng-workspace` programmatically via the schematics test runner, a custom
schematic that delegates to it, or by invoking the exported `ngWorkspace`
factory directly. Example (Node script):

```ts
import { ngWorkspace } from 'angular-django2/schematics/ng-workspace';

const rule = ngWorkspace({
  name: 'my-app',
  project: 'my-app',
  files: {
    indexHtml: { path: './templates/index.html' },
    appComponentTs: {
      template:
        "import { Component } from '@angular/core';\n@Component({ selector: '{{selector}}', template: '<h1>{{title}}</h1>' })\nexport class AppComponent {}\n",
      params: { selector: 'app-root', title: 'Hello' },
    },
    stylesCss: { content: 'body { margin: 0; }\n' },
  },
});
```

Notes:

- Omitting `files` (or passing an empty object) preserves the original
  workspace-only behavior: only `/README.md` and
  `/.github/copilot-instructions.md` are written.
- When `project` names a project missing from `angular.json`, the schematic
  throws a `SchematicsException` so misconfigured names fail fast.
- Each hook entry must specify exactly one of `content`, `path`, or
  `template`; supplying zero or multiple modes is an error.

#### OpenAPI client workflow

```bash
ng generate angular-django2:ng-api --inputPath=openapi.json
npm install
npm run generate:api
ng generate angular-django2:data-service users
```

This flow:

- adds `ng-openapi-gen` to `devDependencies`
- writes `ng-openapi-gen.json`
- adds `npm run generate:api`
- lets you wrap a generated `*ApiService` in a typed `*DataService`

### References

- Angular libraries: https://angular.dev/tools/libraries
- Angular schematics for libraries:
  https://angular.dev/tools/cli/schematics-for-libraries
- Angular CLI schematics: https://angular.dev/tools/cli/schematics
- Workspace schematic collections:
  https://angular.dev/reference/configs/workspace-config
- npm trusted publishers: https://docs.npmjs.com/trusted-publishers/
- npm 2FA requirements:
  https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/
