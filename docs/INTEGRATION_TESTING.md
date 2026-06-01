# Integration Testing

This document is the canonical guide for integration-related testing in
`angular-django2`.

Use this document for:

- node-side schematic integration tests
- end-to-end schematic tests
- smoke-style temp-area harnesses
- build prerequisites, command coverage, and platform caveats related to those
  flows

Other repository docs should link here instead of duplicating integration or
E2E testing details.

## Scope and source files

The current integration-testing surface lives in these files:

- `tests/schematics.integration.spec.ts` — node-side schematic integration
  tests using `SchematicTestRunner`
- `tests/schematics.e2e.spec.ts` — end-to-end schematic tests against real
  Angular workspaces
- `tests/test_application.ts` — smoke-style application generation validation
  using the temp-area harness
- `tests/test_temp_areas.ts` — smoke-style validation of persistent and
  non-persistent temp areas
- `tests/utils/tmpfiles.ts` — repository-root temp workspace helpers used by
  the E2E suite
- `tests/utils/temp_areas.ts` — OS temp-root helpers used by the smoke harness

## Node-side schematic integration tests

The node-side integration suite is in
`tests/schematics.integration.spec.ts`.

These tests:

- run under `npm run test:node`
- use `SchematicTestRunner` from `@angular-devkit/schematics/testing`
- execute compiled schematics from `dist/angular-django2/schematics/collection.json`
- validate real file generation, workspace mutations, idempotency, and
  schematic chaining without creating a full on-disk Angular workspace

Current integration suites cover:

- `ng-add`
- `ng-workspace`
- `ng-api`
- `material-setup`
- `project-structure`
- `ng-app`
- schematic chaining scenarios

When a schematic delegates to `externalSchematic` — for example `ng-app`
relying on the Angular application schematic — the current pattern is to
pre-create the expected project structure inside the virtual tree and then
validate the package-owned behavior layered on top.

## End-to-end schematic tests

The end-to-end suite is in `tests/schematics.e2e.spec.ts`.

These tests:

- run under `npm run test:e2e`
- create real Angular workspaces on disk
- install the built package from `dist/angular-django2`
- execute real `ng add` and `ng generate` flows
- verify generated projects can build successfully
- include a live `ng serve` validation path in the first E2E scenario

Current E2E coverage includes:

- `E2E-01` — step-by-step app generation with individual schematics
- `E2E-02` — `ng-workspace` + `ng-app` flow in a minimal workspace
- `E2E-03` — `ng-api` setup and build verification

The E2E suite uses `tests/utils/tmpfiles.ts` to anchor temporary workspaces to
the repository root and centralize cleanup behavior.

## Additional smoke-style harnesses

The repository also contains smoke-style helpers and scripts related to
integration-oriented validation:

- `tests/test_application.ts` creates a throwaway Angular workspace, installs
  the built package, runs `ng add angular-django2`, generates `my-app`, and
  verifies the generated app can build
- `tests/test_temp_areas.ts` validates temp-area persistence and cleanup
  behavior
- `tests/utils/temp_areas.ts` provides reusable temp-area helpers under the OS
  temp root

These smoke-style files are useful for ad hoc validation, but they are **not**
part of the default `npm run test:node`, `npm run test:e2e`, or
`npm run test:ci` flows.

## Command guide

| Command                       | Coverage                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `npm run build`               | Required prerequisite for integration and E2E flows that consume compiled schematics               |
| `npm run test:node`           | Node-side unit specs plus the schematic integration suite                                          |
| `npm run test:node:watch`     | Watch mode for the same Node-side unit and integration specs                                       |
| `npm run test:e2e`            | End-to-end schematic suite in `tests/schematics.e2e.spec.ts`                                       |
| `npm run test:e2e:watch`      | Watch mode for the E2E suite                                                                       |
| `npm run test:ci`             | `npm run test:node` plus Angular library tests; does **not** run the E2E suite                     |
| `npm run test:node -- <spec>` | Useful for running only a specific integration spec such as `tests/schematics.integration.spec.ts` |

## Prerequisites and caveats

### Build first for integration and E2E flows

Run a build before integration-oriented validation:

```bash
npm run build
```

Why this matters:

- `tests/schematics.integration.spec.ts` loads the compiled collection from
  `dist/angular-django2/schematics/collection.json`
- `tests/schematics.e2e.spec.ts` installs the built package from
  `dist/angular-django2`

### E2E prerequisites

The E2E suite additionally expects:

1. network access for npm package downloads
2. enough disk space for temporary Angular workspaces
3. Node.js and npm available in `PATH`
4. a free port for the `ng serve` step used by `E2E-01`

### Windows cleanup note

On Windows, `ng serve` teardown can leave process-tree cleanup slightly behind
directory deletion. The current E2E cleanup code compensates for this with
defensive retries and may intentionally leave a temp directory behind rather
than deleting the wrong path.

## Temp-area harness configuration

`tests/utils/temp_areas.ts` supports persistent and non-persistent temp areas.

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

```bash
export ANGULAR_DJANGO2_TEST_MODE=persistent
export ANGULAR_DJANGO2_TEST_AREA_NAME=my-e2e-flow
```

Clear them afterward:

```bash
unset ANGULAR_DJANGO2_TEST_MODE
unset ANGULAR_DJANGO2_TEST_AREA_NAME
```

### PowerShell examples

```powershell
$env:ANGULAR_DJANGO2_TEST_MODE = 'persistent'
$env:ANGULAR_DJANGO2_TEST_AREA_NAME = 'my-e2e-flow'
```

Clear them afterward:

```powershell
Remove-Item Env:ANGULAR_DJANGO2_TEST_MODE
Remove-Item Env:ANGULAR_DJANGO2_TEST_AREA_NAME
```

Those environment variables affect the `temp_areas` harness only. They do not
change the default `*.spec.ts` include patterns used by the current npm test
scripts.

## When to update this document

Update this file when any of the following change:

- integration or E2E spec coverage
- temp workspace helpers or environment variables
- build prerequisites for integration-oriented validation
- command coverage for `test:node`, `test:e2e`, or `test:ci`
- platform-specific cleanup caveats related to these flows
