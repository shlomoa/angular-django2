# CLI

`angular-django2` ships an Angular CLI schematics collection. Use it from an
Angular workspace after installing the package and registering the collection.
`ngdj` is the short name for `angular-django2`; in commands, use the collection
name `angular-django2:<schematic>`.

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

## Recommended app flow

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

Use the lower-level schematics when you want explicit control over each stage:

```bash
ng generate angular-django2:application my-app
npm install @angular/material @angular/cdk @angular/animations
ng generate angular-django2:material-setup --project=my-app --theme=indigo-pink --typography=true --animations=true
ng generate angular-django2:project-structure --project=my-app
ng generate angular-django2:app-shell --project=my-app
ng build my-app
ng serve my-app
```

See [`application`](application.md), [`material-setup`](material-setup.md),
[`project-structure`](project-structure.md), and [`app-shell`](app-shell.md)
for each schematic's options.

## Commands

| Command                                     | Purpose                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| [`ng-add`](ng-add.md)                       | Register `angular-django2` as a schematic collection.                         |
| [`application`](application.md)             | Generate an Angular application using package defaults.                       |
| [`material-app`](material-app.md)           | Generate a Django-friendly Angular app with Material UI and a sidenav layout. |
| [`workspace-setup`](workspace-setup.md)     | Initialize workspace-level files for an empty Angular workspace.              |
| [`material-setup`](material-setup.md)       | Configure Angular Material in an existing project.                            |
| [`project-structure`](project-structure.md) | Create the standard `core/`, `shared/`, and `features/` structure.            |
| [`app-shell`](app-shell.md)                 | Generate or update the application shell.                                     |
| [`component`](component.md)                 | Generate a standalone OnPush component with embedding hooks.                  |
| [`embed-component`](embed-component.md)     | Embed a component into a parent component.                                    |
| [`service`](service.md)                     | Generate a service.                                                           |
| [`class`](class.md)                         | Generate a class.                                                             |
| [`api-setup`](api-setup.md)                 | Bootstrap `ng-openapi-gen` and generate Django integration helpers.           |
| [`data-service`](data-service.md)           | Generate a typed `*DataService` wrapper around a generated OpenAPI service.   |

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
