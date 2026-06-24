# angular-django2

`angular-django2` provides Angular-friendly configuration primitives for Django-backed applications and a schematics collection for custom `ng generate` flows.

The initial package surface is intentionally small:

- `provideAngularDjango2(...)` — root-level configuration provider
- `ANGULAR_DJANGO2_CONFIG` — DI token for resolved config
- `AngularDjango2Service` — URL and CSRF helper methods
- Schematics: `application`, `service`, `class`, `app-shell`, `component`, `material-setup`, `project-structure`, `ng-app`, `ng-workspace`, `ng-api`, `data-service`

Start with the [tutorial](TUTORIAL.md) to go from an empty directory to a
working app with Angular CLI and the ngdj schematics. See the [CLI guide](CLI.md)
for install, `ng add`, `ng generate`, app setup, and OpenAPI workflow examples.

## Workspace file provisioning

The completed workspace-file outcome from [GitHub issue #30](https://github.com/shlomoa/angular-django2/issues/30) is implemented by the `ng-workspace` schematic.

`ng-workspace` always writes the generated workspace bootstrap files:

- `.github/copilot-instructions.md`
- `README.md`
- `eslint.config.mjs` when missing
- `vitest.config.mts` when missing
- lint and Vitest package scripts/dependencies in `package.json`
- missing lint targets in `angular.json`

It can also provision Angular application source files from explicit per-file hooks. The hook set follows Angular's documented [application source files](https://angular.dev/reference/configs/file-structure#application-source-files), including `index.html`, `main.ts`, global styles, root component files, route config, standalone app config, and the optional NgModule entry point.

Each hook supports exactly one source mode:

- `content` — inline file contents written verbatim
- `path` — a local file path read when the schematic runs
- `template` — a literal template with `{{key}}` placeholders replaced from `params`

When `project` is provided, file targets are resolved under that project's `sourceRoot`; otherwise, they are written under `/src`.

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
