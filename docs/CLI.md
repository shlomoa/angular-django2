# CLI

`angular-django2` ships an Angular CLI schematics collection. Use it from an
Angular workspace after installing the package and registering the collection.
`ngdj` is the short name for `angular-django2`; in commands, use the collection
name `angular-django2:<schematic>`.

If you want a step-by-step path from an empty directory to a running app, start
with the [tutorial](TUTORIAL.md).

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

`ng add angular-django2` registers the schematics collection in `angular.json`.
If you need to configure it manually, add the collection before the default
Angular schematics collection:

```json
{
  "cli": {
    "schematicCollections": ["angular-django2", "@schematics/angular"]
  }
}
```

## Recommended app flow

For an empty Angular workspace, generate the workspace-level bootstrap files
first, then generate the application:

```bash
ng generate angular-django2:ng-workspace my-app
ng generate angular-django2:ng-app my-app --ssr=false --zoneless=true --defaults
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
npx -y @angular/cli new demo-workspace --no-create-application --package-manager npm --skip-git --defaults
cd demo-workspace
npm install angular-django2
npx ng add angular-django2 --skip-confirmation
npx ng generate angular-django2:ng-workspace my-app
npx ng generate angular-django2:ng-app my-app --ssr=false --zoneless=true --defaults
npm install
npx ng build my-app
npx ng serve my-app
```

To test a local build from a sibling checkout, install the built package output
instead of the published npm package:

```bash
npm install ../angular-django2/dist/angular-django2
```

## Command reference

| Command                                                          | Purpose                                                                     | Key options                                                                                                                                |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `ng add angular-django2`                                         | Register `angular-django2` as a schematic collection.                       | No options.                                                                                                                                |
| `ng generate angular-django2:application <name>`                 | Generate an Angular application using package defaults.                     | `--routing` default `true`, `--standalone` default `true`, `--ssr` default `false`, `--zoneless` default `true`, `--style` default `scss`. |
| `ng generate angular-django2:ng-app <name>`                      | Generate a Django-friendly Angular app with Material UI and an app shell.   | `--theme`, `--typography`, `--animations`, `--routing`, `--standalone`, `--ssr`, `--zoneless`, `--defaults`, `--style`, `--prefix`.        |
| `ng generate angular-django2:ng-workspace <name>`                | Initialize workspace-level files for an empty Angular workspace.            | Optional `--project`; advanced `files` hooks are programmatic, not command-line friendly.                                                  |
| `ng generate angular-django2:material-setup --project=<name>`    | Configure Angular Material in an existing project.                          | `--theme`, `--typography`, `--animations`.                                                                                                 |
| `ng generate angular-django2:project-structure --project=<name>` | Create the standard `core/`, `shared/`, and `features/` structure.          | `--prefix` default `app`.                                                                                                                  |
| `ng generate angular-django2:app-shell --project=<name>`         | Generate or update the application shell.                                   | `--project`.                                                                                                                               |
| `ng generate angular-django2:component <name>`                   | Generate a standalone OnPush component.                                     | `--path`, `--project`, `--standalone` default `true`, `--changeDetection` default `OnPush`.                                                |
| `ng generate angular-django2:service <name>`                     | Generate a service.                                                         | `--path`, `--project`.                                                                                                                     |
| `ng generate angular-django2:class <name>`                       | Generate a class.                                                           | `--path`, `--project`.                                                                                                                     |
| `ng generate angular-django2:ng-api`                             | Bootstrap `ng-openapi-gen` for OpenAPI client generation.                   | `--inputPath` default `openapi.json`, `--outputPath` default `src/app/api`.                                                                |
| `ng generate angular-django2:data-service <resource>`            | Generate a typed `*DataService` wrapper around a generated OpenAPI service. | `--project`, `--path`, `--apiService`, `--apiPath`, `--flat`, `--skipTests`.                                                               |

### `ng-app`

Use `ng-app` when you want the package to create the application and common UI
structure in one command:

```bash
ng generate angular-django2:ng-app my-app --theme=indigo-pink --typography=true --animations=true --ssr=false --zoneless=true --defaults
```

It composes the lower-level application, Material setup, project structure, and
app-shell schematics.

Supported options:

| Option         | Default                      | Description                                                                                                       |
| -------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `name`         | Required positional argument | Application name.                                                                                                 |
| `--theme`      | `indigo-pink`                | Angular Material prebuilt theme: `indigo-pink`, `deeppurple-amber`, `pink-bluegrey`, `purple-green`, or `custom`. |
| `--typography` | `true`                       | Include Angular Material typography styles.                                                                       |
| `--animations` | `true`                       | Enable Angular animations.                                                                                        |
| `--routing`    | `true`                       | Enable routing.                                                                                                   |
| `--standalone` | `true`                       | Generate standalone components.                                                                                   |
| `--ssr`        | `false`                      | Configure the generated application for SSR and SSG/prerendering.                                                 |
| `--zoneless`   | `true`                       | Generate an application that does not use `zone.js`.                                                              |
| `--defaults`   | `true`                       | Disable interactive prompts for options that have defaults.                                                       |
| `--style`      | `scss`                       | Stylesheet format.                                                                                                |
| `--prefix`     | `app`                        | Component selector prefix.                                                                                        |

### `ng-workspace`

Use `ng-workspace` before `ng-app` in an empty workspace:

```bash
ng generate angular-django2:ng-workspace my-app
```

It writes workspace-level bootstrap files and validation setup for the generated
workspace. The schematic also supports advanced per-file application source
hooks through its `files` option.

Because the Angular CLI does not pass nested object options cleanly on the
command line, drive `files` programmatically through a wrapper schematic, a test
runner, or direct factory invocation.

Recognized file hook keys and targets:

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

Each hook accepts exactly one content source:

| Mode       | Field      | Behavior                                                                                |
| ---------- | ---------- | --------------------------------------------------------------------------------------- |
| Inline     | `content`  | Write the supplied content directly to the target file.                                 |
| Local file | `path`     | Read content from an absolute path or a path relative to the current working directory. |
| Template   | `template` | Write a literal template and replace `{{key}}` placeholders from `params`.              |

### Step-by-step app setup

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

### OpenAPI client workflow

Use `ng-api` to bootstrap `ng-openapi-gen`, then generate an application data
service wrapper around a generated API service:

```bash
ng generate angular-django2:ng-api --inputPath=openapi.json
npm install
npm run generate:api
ng generate angular-django2:data-service users
```

`ng-api` writes `ng-openapi-gen.json`, adds `ng-openapi-gen` to
`devDependencies`, and adds a `generate:api` npm script.

`data-service` options:

| Option         | Default                      | Description                                                                |
| -------------- | ---------------------------- | -------------------------------------------------------------------------- |
| `name`         | Required positional argument | Resource name, such as `users`, used for the generated `UsersDataService`. |
| `--project`    | Current Angular project      | Target project.                                                            |
| `--path`       | Angular CLI default path     | Destination path for the data service.                                     |
| `--apiService` | Inferred from `name`         | Generated OpenAPI service class to wrap, such as `UsersApiService`.        |
| `--apiPath`    | `../api/services`            | Import path to the generated API services.                                 |
| `--flat`       | `false`                      | Create the service directly in `path` instead of a subdirectory.           |
| `--skipTests`  | `false`                      | Do not create a spec file.                                                 |

## Discover command help

After installing the package, Angular CLI can show schematic help from the
collection:

```bash
ng generate angular-django2:<schematic> --help
```

For example:

```bash
ng generate angular-django2:ng-app --help
```
