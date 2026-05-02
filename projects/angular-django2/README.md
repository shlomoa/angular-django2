# angular-django2

`angular-django2` provides Angular-friendly configuration primitives for Django-backed applications and a schematics collection for custom `ng generate` flows.

The initial package surface is intentionally small:

- `provideAngularDjango2(...)` for root-level configuration
- `ANGULAR_DJANGO2_CONFIG` for DI-based access to resolved config
- `AngularDjango2Service` for URL and CSRF helper methods
- schematics for `application`, `service`, `class`, `app-shell`, `component`, `material-setup`, `project-structure`, `ng-app`, `ng-api`, and `data-service`

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
ng generate angular-django2:ng-app my-app
ng generate angular-django2:ng-api --inputPath=openapi.json
ng generate angular-django2:data-service users
```

Current defaults:

- `application`: `standalone: true`, `routing: true`, `style: 'scss'`
- `material-setup`: configures Angular Material with theme and providers
  - Options: `--theme` (indigo-pink, deeppurple-amber, pink-bluegrey, purple-green, custom), `--typography`, `--animations`
- `project-structure`: creates standard directory structure (`core/`, `shared/`, `features/`) with barrel exports
- `component`: `standalone: true`, `changeDetection: 'OnPush'`
- `service`, `class`, and `app-shell`: pass through to Angular CLI
- `ng-app`: generates a complete Angular app with Material UI in a single step — runs `application`, adds `@angular/material`/`@angular/cdk`, configures theming, creates the standard directory structure, and writes a responsive sidenav app shell
  - Options: `--theme`, `--typography`, `--animations`, `--routing`, `--standalone`, `--style`, `--prefix`
- `ng-api`: bootstraps [ng-openapi-gen](https://github.com/cyclosproject/ng-openapi-gen) — adds the package to `devDependencies`, writes `ng-openapi-gen.json`, and adds a `generate:api` npm script
  - Options: `--inputPath` (default: `openapi.json`), `--outputPath` (default: `src/app/api`)
- `data-service`: generates a typed `*DataService` wrapper around an ng-openapi-gen `*ApiService` with search and CRUD helpers
  - Options: `--apiService`, `--apiPath` (default: `../api/services`), `--path`, `--flat`, `--skipTests`

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

Build the library and publish the generated package from `dist/angular-django2`.

For the current unscoped package name:

```bash
npm publish ./dist/angular-django2
```

The first successful publish creates the npm package page automatically.
