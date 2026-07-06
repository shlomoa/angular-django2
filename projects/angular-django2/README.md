# angular-django2

[![Documentation Status](https://readthedocs.org/projects/angular-django2/badge/?version=latest)](https://angular-django2.readthedocs.io/)

`angular-django2` provides Angular-friendly configuration primitives for Django-backed applications and a schematics collection for custom `ng generate` flows.

Full documentation: <https://angular-django2.readthedocs.io/>

The initial package surface is intentionally small:

- `provideAngularDjango2(...)` for root-level configuration
- `ANGULAR_DJANGO2_CONFIG` for DI-based access to resolved config
- `AngularDjango2Service` for URL and CSRF helper methods
- schematics for `application`, `service`, `class`, `app-shell`, `component`, `material-setup`, `project-structure`, `ng-app`, `ng-workspace`, `ng-api`, and `data-service`

## Usage

Angular.dev best practices prefer standalone bootstrap and provider functions. A typical setup looks like this:

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

The resolved configuration defaults are:

- `apiBaseUrl: ''`
- `csrfCookieName: 'csrftoken'`
- `csrfHeaderName: 'X-CSRFToken'`
- `withCredentials: true`

## Schematics

After installing the package in another Angular workspace, you can run:

```bash
ng generate angular-django2:application my-app
ng generate angular-django2:material-setup --project=my-app
ng generate angular-django2:project-structure --project=my-app
ng generate angular-django2:app-shell --project my-app
ng generate angular-django2:component dashboard-card
ng generate angular-django2:service django-api
ng generate angular-django2:class api-contract
ng generate angular-django2:ng-app my-app --ssr=false --zoneless=true --defaults
ng generate angular-django2:ng-workspace my-app
ng generate angular-django2:ng-api --inputPath=openapi.json
ng generate angular-django2:data-service users
```

Current defaults:

- `application`: `standalone: true`, `routing: true`, `ssr: false`, `zoneless: true`, `style: 'scss'`
- `material-setup`: configures Angular Material with theme and providers
  - Options: `--theme` (indigo-pink, deeppurple-amber, pink-bluegrey, purple-green, custom), `--typography`, `--animations`
- `project-structure`: creates standard directory structure (`core/`, `shared/`, `features/`) with barrel exports
- `component`: `standalone: true`, `changeDetection: 'OnPush'`
- `service`, `class`, and `app-shell`: pass through to Angular CLI
- `ng-app`: generates a complete Angular app with Material UI in a single step — runs `application`, adds `@angular/material`/`@angular/cdk`, configures theming, creates the standard directory structure, and writes a responsive sidenav app shell
  - Options: `--theme`, `--typography`, `--animations`, `--routing`, `--standalone`, `--ssr`, `--zoneless`, `--defaults`, `--style`, `--prefix`
- `ng-workspace`: writes workspace-wide bootstrap files for an empty Angular workspace
  - Writes `.github/copilot-instructions.md` with repo instructions for the generated app name
  - Replaces the workspace root `README.md` with this guide so the generated repo includes the build recipes below
  - Adds `vitest` to `devDependencies`, writes a `vitest.config.mts`, and adds `test:node` / `test:node:watch` npm scripts so the generated package uses vitest for validation
  - Adds ESLint setup, lint scripts, and missing lint targets for generated workspace projects
  - Supports optional application source-file hooks for Angular's documented application files (`index.html`, `main.ts`, styles, root component files, routes, app config, and the optional app module)
    - Each hook accepts exactly one of `content`, `path`, or `template`
    - Template hooks replace `{{key}}` placeholders from `params`
    - File targets use the selected project's `sourceRoot` when `--project` is provided; otherwise they use `/src`
- `ng-api`: bootstraps [ng-openapi-gen](https://github.com/cyclosproject/ng-openapi-gen) — adds the package to `devDependencies`, writes `ng-openapi-gen.json`, and adds a `generate:api` npm script
  - Options: `--inputPath` (default: `openapi.json`), `--outputPath` (default: `src/app/api`)
- `data-service`: generates a typed `*DataService` wrapper around an ng-openapi-gen `*ApiService` with search and CRUD helpers
  - Options: `--apiService`, `--apiPath` (default: `../api/services`), `--path`, `--flat`, `--skipTests`

### Empty workspace bootstrap

For a workspace created with `ng new demo-workspace --no-create-application`, the end-to-end bootstrap flow is:

```bash
ng add angular-django2
ng generate angular-django2:ng-workspace my-app
ng generate angular-django2:ng-app my-app --ssr=false --zoneless=true --defaults
npm install
ng build my-app
```

`ng-workspace` sets up the workspace-level files first, and `ng-app` then generates the Angular application itself.
In the common case, pass the same name to both commands so the generated repo instructions and Angular app stay aligned.

### Application source-file hooks

For programmatic workspace provisioning, `ng-workspace` exposes file hooks for the application source files documented by Angular at <https://angular.dev/reference/configs/file-structure#application-source-files>. Each hook accepts exactly one of `content` (inline string), `path` (local file), or `template` (string with `{{key}}` placeholders and a `params` map). When `project` is provided, targets resolve under that project's `sourceRoot`; otherwise they resolve under `/src`.

For the full list of recognized hook keys, target paths, and content modes, see the [CLI reference](https://angular-django2.readthedocs.io/en/latest/CLI/).

Because Angular CLI command-line options do not pass nested objects conveniently, use these hooks from a schematic test runner, a custom delegating schematic, or the exported `ngWorkspace` factory.

### OpenAPI workflow

```bash
# 1. Bootstrap ng-openapi-gen
ng generate angular-django2:ng-api --inputPath=openapi.json

# 2. Generate typed Angular services from your OpenAPI spec
npm run generate:api

# 3. Wrap a generated service with search/CRUD helpers
ng generate angular-django2:data-service users
```

Use `ng add angular-django2` to register the collection in `angular.json`, or add it manually:

```json
{
  "cli": {
    "schematicCollections": ["angular-django2", "@schematics/angular"]
  }
}
```

## Local Workspace Commands

```bash
npm run lint
npm run build
npm run test:node
npm run test:ci
npm run pack:dry-run
```

## Publishing

Build the library and publish the generated package from `dist/angular-django2`
after completing the repository release checklist in `docs/RELEASING.md`.

For the current unscoped package name:

```bash
npm publish ./dist/angular-django2 --access public
```

The checked-in GitHub Actions workflow can also publish the package with
`NPM_TOKEN`. The first successful publish creates the npm package page
automatically.
