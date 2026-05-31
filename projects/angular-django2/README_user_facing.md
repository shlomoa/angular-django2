# Build an Angular app with `angular-django2`

This repository is a smoke-test workspace for validating that `angular-django2` can be installed into a fresh Angular workspace and used through `ng generate` commands.

## Prerequisites

- Node.js `^20.19.0 || ^22.12.0 || ^24.0.0`
- npm `>=11`

## Start from an empty repo

From an empty directory, install Angular CLI, create a new Angular workspace without an initial app, install `angular-django2`, register its schematics collection, generate an app, and build it.

### Published package flow

Use this when consuming `angular-django2` from npm.

```bash
npm install -g @angular/cli@21
ng version
ng new demo-workspace --no-create-application
cd demo-workspace
npm install angular-django2
ng add angular-django2
ng generate angular-django2:application my-app
ng build my-app
```

### Local development flow

Use this when validating a locally built package from the sibling `angular-django2` repository.

```bash
npm install -g @angular/cli@21
ng version
ng new demo-workspace --no-create-application
cd demo-workspace
npm install ../angular-django2/dist/angular-django2
ng add angular-django2
ng generate angular-django2:application my-app
ng build my-app
```

## What each step does

1. `npm install -g @angular/cli@21`
	- Installs Angular CLI 21 globally so the `ng` command is available.

2. `ng version`
	- Verifies that Angular CLI is installed and available on `PATH` as `ng`.

3. `ng new demo-workspace --no-create-application`
	- Creates an Angular workspace with `angular.json`, `package.json`, and the standard Angular config files.
	- `--no-create-application` matters because the app will be created by `angular-django2`.

4. `npm install angular-django2`
	- Adds the `angular-django2` package to the workspace.
	- In this repo, the local validation variant installs from `../angular-django2/dist/angular-django2`.

5. `ng add angular-django2`
	- Registers `angular-django2` in `angular.json` under `cli.schematicCollections`.
	- After this, Angular CLI can resolve the collection cleanly as part of normal `ng generate` usage.

6. `ng generate angular-django2:application my-app`
	- Creates `projects/my-app`.
	- This schematic delegates to Angular's built-in `@schematics/angular:application` schematic.
	- The wrapper defaults are:
	  - `standalone: true`
	  - `routing: true`
	  - `style: 'scss'`

7. `ng build my-app`
	- Builds the generated application.
	- The output is written to `dist/my-app`.

## Generated application layout

After running `ng generate angular-django2:application my-app`, the workspace contains:

- `projects/my-app/public/favicon.ico`
- `projects/my-app/src/index.html`
- `projects/my-app/src/main.ts`
- `projects/my-app/src/styles.scss`
- `projects/my-app/src/app/app.ts`
- `projects/my-app/src/app/app.html`
- `projects/my-app/src/app/app.scss`
- `projects/my-app/src/app/app.config.ts`
- `projects/my-app/src/app/app.routes.ts`
- `projects/my-app/src/app/app.spec.ts`
- `projects/my-app/tsconfig.app.json`
- `projects/my-app/tsconfig.spec.json`

`angular.json` is also updated with a `my-app` project entry that points at `projects/my-app`.

## Optional follow-up generators

Once the application exists, these `angular-django2` generators can be used:

```bash
ng generate angular-django2:material-setup --project=my-app
ng generate angular-django2:project-structure --project=my-app
ng generate angular-django2:component dashboard-card
ng generate angular-django2:service django-api
ng generate angular-django2:class api-contract
ng generate angular-django2:app-shell
ng generate angular-django2:ng-app another-app
ng generate angular-django2:ng-api --inputPath=openapi.json
ng generate angular-django2:data-service users
```

## One-command alternative

If you want a generated app plus Material setup and app shell in one step, use:

```bash
ng generate angular-django2:ng-app my-app
```

That schematic creates the app, adds Angular Material dependencies, configures theming, creates the standard project structure, and writes a Material-based shell.

## Verified in this repo

The empty-repo workflow above was validated locally with the local package path:

- workspace creation succeeded
- `ng add angular-django2` updated `angular.json`
- `ng generate angular-django2:application my-app` created `projects/my-app`
- `ng build my-app` completed successfully

This repository also includes a smoke test in `tests/test_application.ts` that verifies the `application` schematic output.

## Running tests

Run the test suite with:

```bash
npm test
```

The suite uses a temp-area harness for E2E-style tests such as `tests/test_application.ts`.

### Temp-area modes

Tests can run in two modes:

- **Non-persistent** (default)
	- creates a new temp area
	- runs the test in that temp area
	- deletes the temp area when the test finishes
- **Persistent**
	- creates a new temp area unless an explicit temp area name is provided
	- runs the test in that temp area
	- keeps the temp area after the test finishes

The temp-area helper is implemented in `tests/utils/temp_areas.ts`.

### Environment variables

The temp-area harness recognizes these environment variables:

- `ANGULAR_DJANGO2_TEST_MODE`
	- allowed values: `persistent`, `non-persistent`
	- default: `non-persistent`
- `ANGULAR_DJANGO2_TEST_AREA_NAME`
	- optional explicit temp area name
	- when set together with `persistent`, the same temp area can be reused across several test runs

By default, temp areas are created under the OS temp directory in an `angular-django2-test` folder.

### Bash examples

Use these examples on Linux with `bash`.

Run tests in the default non-persistent mode:

```bash
npm test
```

Run tests in persistent mode with a fresh generated temp area:

```bash
export ANGULAR_DJANGO2_TEST_MODE=persistent
npm test
```

Run tests in persistent mode with a named temp area that can be reused across runs:

```bash
export ANGULAR_DJANGO2_TEST_MODE=persistent
export ANGULAR_DJANGO2_TEST_AREA_NAME=my-e2e-flow
npm test
```

Clear the environment variables afterward:

```bash
unset ANGULAR_DJANGO2_TEST_MODE
unset ANGULAR_DJANGO2_TEST_AREA_NAME
```

### PowerShell examples

Use these examples on Windows PowerShell or `pwsh`.

Run tests in the default non-persistent mode:

```powershell
npm test
```

Run tests in persistent mode with a fresh generated temp area:

```powershell
$env:ANGULAR_DJANGO2_TEST_MODE = 'persistent'
npm test
```

Run tests in persistent mode with a named temp area that can be reused across runs:

```powershell
$env:ANGULAR_DJANGO2_TEST_MODE = 'persistent'
$env:ANGULAR_DJANGO2_TEST_AREA_NAME = 'my-e2e-flow'
npm test
```

Clear the environment variables afterward:

```powershell
Remove-Item Env:ANGULAR_DJANGO2_TEST_MODE
Remove-Item Env:ANGULAR_DJANGO2_TEST_AREA_NAME
```

This is useful when you want to inspect generated workspaces after a test run or execute several tests against the same temp area as part of a longer end-to-end flow.
