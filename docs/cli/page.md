# `page`

Generate a feature-owned, standalone Angular Material page and lazy route.

```bash
ng generate angular-django2:page orders \
  --project=my-app \
  --path=src/app/features/orders \
  --route-path=orders \
  --navigation-label=Orders \
  --navigation-icon=shopping_cart
```

## Options

| Option             | Required       | Default           | Description                                                                            |
| ------------------ | -------------- | ----------------- | -------------------------------------------------------------------------------------- |
| `name`             | yes            | —                 | Kebab-case page and feature name.                                                      |
| `path`             | yes            | —                 | Feature directory inside the selected application source root.                         |
| `project`          | no             | inferred          | Angular application project; required when more than one application is available.     |
| `route-path`       | no             | `name`            | Lowercase URL path for the lazy route.                                                 |
| `access`           | no             | `public`          | `public` or `protected`.                                                               |
| `auth-guard`       | protected only | `authGuard`       | Existing locally imported guard identifier that is already applied in `app.routes.ts`. |
| `navigation-label` | no             | classified `name` | Label stored in route navigation metadata.                                             |
| `navigation-icon`  | no             | —                 | Material icon name stored in route navigation metadata.                                |

## Generated artifacts

For `orders` at `src/app/features/orders`, the schematic creates:

- `orders-page.ts` — a standalone `OnPush` component importing `MatCardModule`
- `orders-page.html` and `orders-page.scss`
- `orders.page.routes.ts` — the feature-owned `Routes` array with a lazy
  `loadComponent` entry and route `data.navigation` metadata

The schematic adds only an import and a spread of that owned route array to the
existing `app.routes.ts`. It finds the exported `routes` array with the
TypeScript AST, preserves existing route entries, and fails rather than making
an unsafe edit. Re-running the same command is idempotent; duplicate route
paths, incomplete owned registrations, modified generated files, and paths
outside the application source root fail with actionable errors.

`public` is the default and adds no guard. A `protected` page only reuses an
already imported and applied guard from `app.routes.ts`; the schematic does not
create a guard or application-wide authorization policy. Client-side guards
are navigation controls, not an authorization boundary—Django must continue to
authorize every protected backend operation.

The page emits no API client, service, form, or shared component. Consume
existing contract-derived services, reusable components, and reactive forms
through their declared interfaces when building out the generated feature.

## Prerequisites

- a selected Angular application project with `sourceRoot`
- `@angular/material`, `@angular/cdk`, and `@angular/router` installed
- `src/app/app.routes.ts` exporting `routes: Routes`
- `src/app/app.config.ts` configuring `provideRouter(routes)`
- for `--access=protected`, a configured reusable guard matching `--authGuard`

Run `ng add @angular/material` and generate the Angular application with
routing enabled before running this schematic.
