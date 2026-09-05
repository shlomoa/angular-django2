# CLI

`angular-django2` ships an Angular CLI schematics collection. Use it from an
Angular workspace after installing the package and registering the collection.
`ngdj` is the short name for `angular-django2`; in commands, use the collection
name `angular-django2:<schematic>`.

Use kebab-case for every multiword CLI flag, such as `--auth-guard` and
`--openapi-spec-file`. The matching camelCase schema property spelling remains
accepted for compatibility; `openapi_spec_file` is also accepted as the legacy
OpenAPI option spelling.

If you want a step-by-step path from an empty directory to a running app, start
with the [tutorial](../TUTORIAL.md).

> **Django workspace lifecycle:** `angular-django2` is not the top-level
> Django/Angular workspace bootstrapper. When you use `django-angular3`, that
> project owns the Django-side workspace lifecycle and can register
> `angular-django2` for the Angular workspace.

## Install and register the collection

Inside an Angular workspace:

```bash
npm install angular-django2
ng add angular-django2
```

See [`ng-add`](ng-add.md) for what this registers and how to configure it
manually.

## One-step app flow

For an empty Angular workspace, generate the workspace-level bootstrap files
first, then generate the application:

```bash
ng generate angular-django2:workspace-setup my-app
ng generate angular-django2:material-app my-app --ssr=false --zoneless=true --defaults
npm install
ng build my-app
ng serve my-app
```

Use this flow when your workspace was created with
`ng new <workspace> --no-create-application` or when a Django integration has
already created the Angular workspace for you.

## Angular-only setup

If you are not using `django-angular3`, create the Angular workspace first:

```bash
npx -y @angular/cli@22 new demo-workspace --no-create-application --package-manager npm --skip-git --defaults
cd demo-workspace
npm install angular-django2
npx ng add angular-django2 --skip-confirmation
npx ng generate angular-django2:workspace-setup my-app
npx ng generate angular-django2:material-app my-app --ssr=false --zoneless=true --defaults
npm install
npx ng build my-app
npx ng serve my-app
```

To test a local build from a sibling checkout, install the built package output
instead of the published npm package:

```bash
npm install ../angular-django2/dist/angular-django2
```

## Step-by-step app setup

The [one-step app flow](#one-step-app-flow) above uses `material-app`, a
one-step composite that generates the application, configures Angular Material,
creates the standard directory structure, and writes the responsive Material
sidenav layout. Use the step-by-step flow below when you want explicit control
over the first three of those stages as separate schematics:

```bash
ng generate angular-django2:application my-app
npm install @angular/material @angular/cdk @angular/animations
ng generate angular-django2:material-setup --project=my-app --theme=indigo-pink --typography=true --animations=true
ng generate angular-django2:project-structure --project=my-app
ng build my-app
ng serve my-app
```

See [`application`](application.md), [`material-setup`](material-setup.md), and
[`project-structure`](project-structure.md) for each schematic's options.

These three steps produce a Material-configured application with the standard
`core/`, `shared/`, and `features/` structure, but **not** the responsive
sidenav layout. That layout is written only by [`material-app`](material-app.md);
there is no standalone layout schematic. Use `material-app` for the layout, or
hand-author the root component. The standalone [`app-shell`](app-shell.md)
schematic is unrelated — it wraps Angular's SSR/prerendering app-shell feature,
not the Material layout.

## Commands

| Command                                     | Purpose                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| [`ng-add`](ng-add.md)                       | Register `angular-django2` as a schematic collection.                          |
| [`application`](application.md)             | Generate an Angular application using package defaults.                        |
| [`material-app`](material-app.md)           | Generate a Django-friendly Angular app with Material UI and a sidenav layout.  |
| [`workspace-setup`](workspace-setup.md)     | Initialize workspace-level files for an empty Angular workspace.               |
| [`material-setup`](material-setup.md)       | Configure Angular Material in an existing project.                             |
| [`project-structure`](project-structure.md) | Create the standard `core/`, `shared/`, and `features/` structure.             |
| [`app-shell`](app-shell.md)                 | Pass-through to Angular's SSR `app-shell` schematic (not the Material layout). |
| [`component`](component.md)                 | Generate a standalone OnPush component with embedding hooks.                   |
| [`page`](page.md)                           | Generate a standalone OnPush Material page with a feature-owned lazy route.    |
| [`site`](site.md)                           | Assemble a validated, explicitly defined Material site in an existing app.     |
| [`embed-component`](embed-component.md)     | Embed a component into a parent component.                                     |
| [`complex-component`](complex-component.md) | Generate or maintain an advanced Angular Material component.                   |
| [`field-component`](field-component.md)     | Generate a simple façade over the canonical typed Material form field.         |
| [`form-field`](form-field.md)               | Generate the canonical configurable typed Angular Material form field.         |
| [`reactive-form`](reactive-form.md)         | Generate a typed form that composes canonical Material field output.           |
| [`service`](service.md)                     | Generate a service.                                                            |
| [`class`](class.md)                         | Generate a class.                                                              |
| [`openapi-setup`](openapi-setup.md)         | Bootstrap `ng-openapi-gen` and generate Django integration helpers.            |
| [`data-service`](data-service.md)           | Generate a typed `*DataService` wrapper around a generated OpenAPI service.    |

## Discover command help

After installing the package, Angular CLI can show schematic help from the
collection:

```bash
ng generate angular-django2:<schematic> --help
```

For example:

```bash
ng generate angular-django2:material-app --help
```
