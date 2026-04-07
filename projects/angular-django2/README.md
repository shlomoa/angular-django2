# angular-django2

`angular-django2` provides Angular-friendly configuration primitives for Django-backed applications and a schematics collection for custom `ng generate` flows.

The initial package surface is intentionally small:

- `provideAngularDjango2(...)` for root-level configuration
- `ANGULAR_DJANGO2_CONFIG` for DI-based access to resolved config
- `AngularDjango2Service` for URL and CSRF helper methods
- schematics for `application`, `service`, `class`, `app-shell`, and `component`

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
ng generate angular-django2:app-shell --project my-app
ng generate angular-django2:component dashboard-card
ng generate angular-django2:service django-api
ng generate angular-django2:class api-contract
```

Current defaults:

- `application`: `standalone: true`, `routing: true`
- `component`: `standalone: true`, `changeDetection: 'OnPush'`
- `service`, `class`, and `app-shell`: pass through to Angular CLI

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
