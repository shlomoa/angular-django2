# angular-django2

`angular-django2` provides Angular-friendly configuration primitives for Django-backed applications and a schematics collection for custom `ng generate` flows.

The initial package surface is intentionally small:

- `provideAngularDjango2(...)` — root-level configuration provider
- `ANGULAR_DJANGO2_CONFIG` — DI token for resolved config
- `AngularDjango2Service` — URL and CSRF helper methods
- Schematics: `application`, `service`, `class`, `app-shell`, `component`, `material-setup`, `project-structure`, `ng-app`, `ng-workspace`, `ng-api`, `data-service`

See the [CLI guide](CLI.md) for install, `ng add`, `ng generate`, app setup,
and OpenAPI workflow examples.

## Quick start

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

See the [GitHub repository](https://github.com/shlomoa/angular-django2) for full README, changelog, and contributing guidelines.
