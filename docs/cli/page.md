# page

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

| Option               | Required       | Default           | Description                                                                        |
| -------------------- | -------------- | ----------------- | ---------------------------------------------------------------------------------- |
| `name`               | yes            | —                 | Kebab-case page and feature name.                                                  |
| `--path`             | yes            | —                 | Feature directory inside the selected application source root.                     |
| `--project`          | no             | inferred          | Angular application project; required when more than one application is available. |
| `--route-path`       | no             | `name`            | Lowercase URL path using letters, digits, hyphens, or slashes.                     |
| `--access`           | no             | `public`          | `public` or `protected`.                                                           |
| `--auth-guard`       | protected only | `authGuard`       | Existing JavaScript identifier already applied in `app.routes.ts`.                 |
| `--navigation-label` | no             | classified `name` | Non-empty label stored in route navigation metadata.                               |
| `--navigation-icon`  | no             | —                 | Material icon name using lowercase letters, digits, or underscores.                |

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
- for `--access=protected`, a configured reusable guard matching `--auth-guard`

Run `ng add @angular/material` and generate the Angular application with
routing enabled before running this schematic.

## OpenUI page nodes

With `--document`, the schematic compiles one OpenUI page node: the first
`DashboardPage` or `EmptyPage`, or the one named by `--node-id`. A page is
content-only, as in the OpenUI application contract: the `Route` that targets it
owns its path and access, and the `NavItem` that presents that route owns its
label and icon. The schematic reads them from the same document, so
`--route-path`, `--access`, `--navigation-label`, and `--navigation-icon` are not
allowed. `--auth-guard` is allowed: OpenUI expresses access as policy and leaves
the guard to the implementation.

```bash
ng generate angular-django2:page --document=src/app/app.openui.json \
  --node-id=profile --path=src/app/features/profile
```

```json
{
  "version": "0.4.0",
  "id": "root",
  "type": "html",
  "children": [
    {
      "id": "shop",
      "type": "Application",
      "children": [
        {
          "id": "routing",
          "type": "Routing",
          "children": [
            {
              "id": "profileRoute",
              "type": "Route",
              "attrs": { "[path]": "me/profile", "[target]": "\"profile\"", "[access]": "public" }
            }
          ]
        },
        {
          "id": "navigation",
          "type": "Navigation",
          "children": [
            {
              "id": "profileNavigation",
              "type": "NavItem",
              "attrs": {
                "[label]": "My profile",
                "[route]": "\"profileRoute\"",
                "[icon]": "person"
              }
            }
          ]
        }
      ]
    },
    { "id": "profile", "type": "DashboardPage", "attrs": { "[title]": "Profile overview" } }
  ]
}
```

| Source in the document                                                                                 | Page option          | Default                            |
| :----------------------------------------------------------------------------------------------------- | :------------------- | :--------------------------------- |
| page id                                                                                                | `--name`             | dasherized id                      |
| page `[title]`                                                                                         | page card heading    | classified page name               |
| `[path]` of the `Route` whose `[target]` is the page, joined to the `[path]` of every `Route` above it | `--route-path`       | required: a `Route` must target it |
| that `Route`'s `[access]`                                                                              | `--access`           | `public`                           |
| `[label]` of the first `NavItem` whose `[route]` is that `Route`                                       | `--navigation-label` | classified page name               |
| that `NavItem`'s `[icon]`                                                                              | `--navigation-icon`  | none                               |

A page must be the `[target]` of exactly one `Route`, and the routing model is
checked as a whole, so a `Route` that targets an unknown element fails the
schematic. Setting `[route]`, `[access]`, `[icon]`, or `[authGuard]` on the page
is rejected with a pointer to the element that owns it. `material-app` builds its
sidenav links from the same `Route` and `NavItem` elements, so the registered
route and the link cannot disagree.

`--name` still overrides the id-derived name. A `DashboardPage`'s children are
compiled and embedded into the page card's header, content, and actions slots,
as for [`component`](component.md#openui-surface-containers). An `EmptyPage`
has no content and cannot have children.
