# Testing for `angular-django2`

This directory documents everything related to testing and validation in this
repository: Angular library tests, Node-side schematic tests, end-to-end
workspace tests, and the temp-area helper harnesses.

## What kinds of testing this repo contains

### Angular library tests

- Run by `npm test`
- Executed through Angular's test builder for the `angular-django2` library
- Validate the runtime library code under `projects/angular-django2/src/lib`

### Node-side unit tests

- Run by `npm run test:node`
- Powered by Vitest with `vitest.config.mts`
- Include `tests/**/*.spec.ts`
- Exclude `tests/schematics.e2e.spec.ts`
- Focus on isolated schematic behavior with mocks

Primary files:

- `tests/schematics.spec.ts`
- `tests/release-version.spec.ts`
- `tests/sync-package-metadata.spec.ts`
- `tests/utils/tmpfiles.spec.ts`

### Node-side integration tests

- Also run by `npm run test:node`
- Execute real schematic code with `SchematicTestRunner`
- Validate chained schematic behavior, file generation, and workspace
  mutations

Primary file:

- `tests/schematics.integration.spec.ts`

### End-to-end schematic tests

- Run by `npm run test:e2e`
- Powered by `vitest.e2e.config.mts`
- Create real Angular workspaces, install the built package, run schematics,
  and verify builds

Primary file:

- `tests/schematics.e2e.spec.ts`

Current E2E coverage includes:

- `E2E-01`: step-by-step app generation with individual schematics
- `E2E-02`: complete `ng-app` flow in a minimal workspace
- `E2E-03`: `ng-api` setup and build verification

### Additional temp-area smoke harness files

These files exist in the repository and are useful for smoke-style validation
of disposable workspaces:

- `tests/test_application.ts`
- `tests/test_temp_areas.ts`
- `tests/utils/temp_areas.ts`

Important detail: the current Vitest configs only include `*.spec.ts`, so
`tests/test_application.ts` and `tests/test_temp_areas.ts` are **not** part of
the default `npm run test:node`, `npm run test:e2e`, or `npm run test:ci`
flows.

They are still documented here because they describe and exercise the
temp-area harness behavior, which is part of the repo's testing toolbox.

## Which command runs what

| Command | Coverage |
| --- | --- |
| `npm test` | Angular library tests only |
| `npm run test:node` | Node-side unit + integration specs in `tests/**/*.spec.ts`, excluding `tests/schematics.e2e.spec.ts` |
| `npm run test:node:watch` | Watch mode for the same Node-side unit + integration specs |
| `npm run test:e2e` | Only `tests/schematics.e2e.spec.ts` |
| `npm run test:e2e:watch` | Watch mode for only `tests/schematics.e2e.spec.ts` |
| `npm run test:ci` | `npm run test:node` + Angular library tests |

`npm run test:ci` does **not** run the E2E suite.

## File map

### Core spec files

- `tests/schematics.spec.ts`
  - unit tests for schematic wrappers
  - uses mocked `externalSchematic` calls

- `tests/schematics.integration.spec.ts`
  - integration tests using `SchematicTestRunner`
  - validates real schematic output in a virtual tree

- `tests/schematics.e2e.spec.ts`
  - end-to-end tests against real Angular workspaces
  - installs the built package from `dist/angular-django2`

- `tests/release-version.spec.ts`
  - validates release versioning logic

- `tests/sync-package-metadata.spec.ts`
  - validates package metadata synchronization

- `tests/utils/tmpfiles.spec.ts`
  - tests the repo-root temp-directory helper

### Helper utilities

- `tests/utils/tmpfiles.ts`
  - creates and deletes temporary directories under the repository root
  - used by the E2E suite

- `tests/utils/temp_areas.ts`
  - creates and manages temporary directories under the OS temp root
  - supports persistent and non-persistent modes
  - used by the additional temp-area smoke harness files

### Additional smoke harness files

- `tests/test_application.ts`
  - creates a throwaway Angular workspace
  - installs the built `angular-django2` package
  - runs `ng add angular-django2`
  - generates `my-app`
  - builds the generated app and verifies key files

- `tests/test_temp_areas.ts`
  - verifies persistent and non-persistent temp-area behavior

## How to run the major test flows

### Angular library tests only

```bash
npm test
```

### Node-side unit and integration tests

```bash
npm run test:node
```

### Node-side watch mode

```bash
npm run test:node:watch
```

### End-to-end schematic tests

```bash
npm run build
npm run test:e2e
```

The build step matters because the integration and E2E suites use compiled
schematics from `dist/angular-django2/schematics`.

### CI-friendly repo validation

```bash
npm run test:ci
```

This runs Node-side specs and Angular library tests, but not the E2E suite.

## Prerequisites and caveats

### For integration tests

Run a build first:

```bash
npm run build
npm run test:node
```

Why: `tests/schematics.integration.spec.ts` loads the compiled collection from
`dist/angular-django2/schematics/collection.json`.

### For E2E tests

Requirements:

1. The library must be built first with `npm run build`
2. Network access is required for npm package downloads
3. Enough disk space is required for temporary Angular workspaces
4. The suite can take several minutes
5. Node.js and npm must be available in `PATH`
6. `E2E-01` starts `ng serve`, so its configured port must be free

The E2E implementation uses `tests/utils/tmpfiles.ts` to anchor temp
workspaces to the repository root and to centralize cleanup behavior.

Repository note from prior validation: on Windows, `ng serve` teardown can
leave process-tree cleanup lag behind directory deletion, so cleanup code
defensively retries and may intentionally leave a temp directory behind instead
of deleting the wrong path.

## Temp-area harness details

The temp-area helper in `tests/utils/temp_areas.ts` supports two modes:

- **Non-persistent**
  - creates a temp area
  - runs the test inside it
  - deletes it during cleanup

- **Persistent**
  - creates or reuses a temp area
  - keeps it after cleanup so you can inspect generated files

Environment variables:

- `ANGULAR_DJANGO2_TEST_MODE`
  - allowed values: `persistent`, `non-persistent`
  - default: `non-persistent`

- `ANGULAR_DJANGO2_TEST_AREA_NAME`
  - optional explicit temp-area name
  - useful when reusing the same persistent area across repeated runs

By default, temp areas are created under the OS temp directory inside
`angular-django2-test`.

### Bash examples

These examples apply when you are running `withTempArea`-based smoke tests or
other custom scripts that consume `tests/utils/temp_areas.ts`.

Set persistent mode:

```bash
export ANGULAR_DJANGO2_TEST_MODE=persistent
```

Set a reusable named area:

```bash
export ANGULAR_DJANGO2_TEST_AREA_NAME=my-e2e-flow
```

Clear the environment variables afterward:

```bash
unset ANGULAR_DJANGO2_TEST_MODE
unset ANGULAR_DJANGO2_TEST_AREA_NAME
```

### PowerShell examples

These examples apply when you are running `withTempArea`-based smoke tests or
other custom scripts that consume `tests/utils/temp_areas.ts`.

Set persistent mode:

```powershell
$env:ANGULAR_DJANGO2_TEST_MODE = 'persistent'
```

Set a reusable named area:

```powershell
$env:ANGULAR_DJANGO2_TEST_AREA_NAME = 'my-e2e-flow'
```

Clear the environment variables afterward:

```powershell
Remove-Item Env:ANGULAR_DJANGO2_TEST_MODE
Remove-Item Env:ANGULAR_DJANGO2_TEST_AREA_NAME
```

Those environment variables affect the `temp_areas` harness only. They do not
change the default `*.spec.ts` include patterns used by the current npm test
scripts.

## CI and validation boundaries

The main CI flow runs:

1. `npm run format:check`
2. `npm run lint`
3. `npm run build`
4. `npm run test:ci`
5. `npm run pack:dry-run`

That means the default CI path covers formatting, linting, compiled schematics,
Node-side tests, Angular library tests, and package verification, while the
E2E suite remains a separate, explicit step.
