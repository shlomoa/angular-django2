# Tutorial: empty repo to working app

This tutorial starts with an empty directory and ends with a running Angular app
generated with Angular CLI and the `angular-django2` schematics collection.

In this guide:

- `ng` means the Angular CLI. Commands use `npx ng` so they work without a
  global Angular CLI install.
- `ngdj` is shorthand for `angular-django2`. In Angular CLI commands, the
  shorthand appears as the schematics collection name
  `angular-django2:<schematic>`.

## What you will build

You will create an Angular workspace with no initial application, register
`angular-django2`, then use the ngdj schematics to generate:

- workspace bootstrap files
- an Angular application
- Angular Material setup
- a standard `core/`, `shared/`, and `features/` source layout
- a responsive application shell

## Prerequisites

Use the runtime versions supported by this package:

- Node.js `^22.22.3 || ^24.15.0 || >=26.0.0`
- npm `>=11`

Check your local versions:

```bash
node --version
npm --version
```

## 1. Create an empty project directory

Start from an empty directory. This example uses `ngdj-tutorial` as both the
folder name and the generated Angular project name.

```bash
mkdir ngdj-tutorial
cd ngdj-tutorial
```

If you want this directory to be a Git repository, initialize Git after the
Angular workspace is created so the Angular CLI does not have to write into a
non-empty directory.

## 2. Create an empty Angular workspace with `ng`

Create an Angular workspace in the current directory without generating an app
yet:

```bash
npx -y @angular/cli@22 new ngdj-tutorial --directory . --no-create-application --package-manager npm --skip-git --defaults
```

This gives you a clean Angular workspace and local Angular CLI installation, but
no application project yet.

If you want Git history for the tutorial project, initialize it now:

```bash
git init
```

## 3. Install and register ngdj

Install `angular-django2`, then register its schematics collection with Angular
CLI:

```bash
npm install angular-django2
npx ng add angular-django2 --skip-confirmation
```

The `ng add` step configures the Angular workspace so `ng generate` can find the
ngdj schematics.

## 4. Add workspace bootstrap files with ngdj

Run the `ng-workspace` schematic before generating the app:

```bash
npx ng generate angular-django2:ng-workspace ngdj-tutorial
```

This writes workspace-level bootstrap files for an empty Angular workspace. It
also prepares validation-oriented files that the generated workspace can use for
Node-side checks.

## 5. Generate the working app with ngdj

Now generate the Angular application, Material setup, project structure, and app
shell in one flow:

```bash
npx ng generate angular-django2:ng-app ngdj-tutorial --theme=indigo-pink --typography=true --animations=true
```

The `ng-app` schematic is the fastest path to a runnable app. It composes the
lower-level ngdj schematics that create the application, configure Angular
Material, create the standard source layout, and write the app shell.

## 6. Install generated dependencies

Some schematics update `package.json`. Run npm install once more after code
generation:

```bash
npm install
```

## 7. Build the app

Build the generated application with Angular CLI:

```bash
npx ng build ngdj-tutorial
```

A successful build confirms the generated workspace and application compile.

## 8. Run the app

Start the Angular dev server:

```bash
npx ng serve ngdj-tutorial
```

Open the local URL printed by Angular CLI. You should see the generated
Material-based application shell.

## 9. Generate a feature component

Use the ngdj component schematic when you want a standalone OnPush component
that follows the package defaults:

```bash
npx ng generate angular-django2:component dashboard-card --project=ngdj-tutorial --path=src/app/features/dashboard
```

Then rebuild to verify the generated code still compiles:

```bash
npx ng build ngdj-tutorial
```

## 10. Optional: add an OpenAPI client workflow

If your Django backend exposes an OpenAPI schema, bootstrap `ng-openapi-gen`:

```bash
npx ng generate angular-django2:ng-api --inputPath=openapi.json
npm install
npm run generate:api
```

After generating API services from your schema, create a typed data-service
wrapper:

```bash
npx ng generate angular-django2:data-service users --project=ngdj-tutorial
```

Use this flow when you want Angular services that wrap generated OpenAPI client
services with resource-oriented helpers.

## Full command sequence

For a copyable minimal path from empty directory to running app:

```bash
mkdir ngdj-tutorial
cd ngdj-tutorial
npx -y @angular/cli@22 new ngdj-tutorial --directory . --no-create-application --package-manager npm --skip-git --defaults
npm install angular-django2
npx ng add angular-django2 --skip-confirmation
npx ng generate angular-django2:ng-workspace ngdj-tutorial
npx ng generate angular-django2:ng-app ngdj-tutorial --theme=indigo-pink --typography=true --animations=true
npm install
npx ng build ngdj-tutorial
npx ng serve ngdj-tutorial
```

## What to try next

- Read the [CLI guide](CLI.md) for the full command reference.
- Generate a component with `angular-django2:component`.
- Add OpenAPI client generation with `angular-django2:ng-api`.
- Add a data-service wrapper with `angular-django2:data-service`.
