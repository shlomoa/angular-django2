# Integration Testing

This document is the canonical guide for integration-related testing in
`angular-django2`.

Use this document for:

- node-side schematic integration tests
- end-to-end schematic tests
- temp-area helper and cleanup/debug workflow tests
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
- `tests/test_application.spec.ts` — temp-area-backed application generation
  validation that installs the built package and verifies `ng generate
angular-django2:application` can build
- `tests/utils/temp_areas.spec.ts` — temp-area persistence and cleanup coverage
- `tests/utils/temp_areas.ts` — the single shared temp-area implementation
  used for OS temp-root helpers, repo-root E2E workspaces, stale workspace
  cleanup, and the E2E command entrypoint

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
- `workspace-setup`
- `api-setup`
- `material-setup`
- `project-structure`
- `material-app`
- schematic chaining scenarios

When a schematic delegates to `externalSchematic` — for example `material-app`
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
- clean stale repo-root temp workspaces before regular runs unless debug mode is enabled
- preserve temp workspaces in debug mode for failure investigation

Current E2E coverage includes:

- `E2E-01` — step-by-step app generation with individual schematics
- `E2E-02` — `workspace-setup` + `material-app` flow in a minimal workspace
- `E2E-03` — `api-setup` setup and build verification
- `E2E-04` — `component` hooks + `embed-component` wiring a generated child into
  a parent in a buildable app
- `E2E-05` — `embed-component` package mode wiring an Angular Material component
  (`MatDateRangePicker`) into a parent in a buildable app

The E2E suite uses `tests/utils/temp_areas.ts` to anchor temporary workspaces
to the repository root and centralize cleanup and debug-mode behavior.

It also centralizes the validated cross-platform command-launch behavior used by
the integration-oriented harnesses:

- Vitest E2E entrypoints are launched through `process.execPath` and the local
  `node_modules/vitest/vitest.mjs` entrypoint instead of shelling through
  `npx`
- Angular CLI commands that run inside an existing workspace (`ng add`,
  `ng generate`, `ng build`, `ng serve`, and similar flows) run through the
  local `node_modules/@angular/cli/bin/ng.js` entrypoint
- `ng new` is intentionally launched through `npx @angular/cli@<installed-version>`
  so the command is treated as an outside-workspace flow even when the
  repository itself is an Angular workspace

## Additional smoke-style harnesses

The repository also contains helper utilities related to integration-oriented
validation:

- `tests/utils/temp_areas.ts` provides the reusable temp-area helpers that now
  cover both OS temp-root and repo-root workspace flows

## Command guide

| Command                         | Coverage                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `npm run build`                 | Required prerequisite for integration and E2E flows that consume compiled schematics               |
| `npm run test:node`             | Node-side unit specs plus the schematic integration suite                                          |
| `npm run test:node:watch`       | Watch mode for the same Node-side unit and integration specs                                       |
| `npm run cleanup:e2e:tmp-areas` | Removes stale repo-root E2E temp workspaces from previous runs                                     |
| `npm run test:e2e`              | End-to-end schematic suite in `tests/schematics.e2e.spec.ts`, with stale tmp-area cleanup          |
| `npm run test:e2e:watch`        | Watch mode for the E2E suite, with stale tmp-area cleanup before watch starts                      |
| `npm run test:e2e:debug`        | End-to-end schematic suite without temp-area cleanup, useful for failure debugging                 |
| `npm run test:ci`               | `npm run test:node` plus Angular library tests; does **not** run the E2E suite                     |
| `npm run test:node -- <spec>`   | Useful for running only a specific integration spec such as `tests/schematics.integration.spec.ts` |

## Prerequisites and caveats

### Build first for integration and E2E flows

Run a build before integration-oriented validation:

```bash
npm run build
```

Why this matters:

- `tests/schematics.integration.spec.ts` loads the compiled collection from
  `dist/angular-django2/schematics/collection.json`
- `tests/test_application.spec.ts` installs the built package from
  `dist/angular-django2`
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

The harness no longer relies on Windows-only `taskkill`, and it no longer
depends on `npx.cmd` launch behavior for the E2E Vitest wrapper.

### Cross-platform execution note

The current integration and E2E harnesses are designed to stay OS agnostic:

- repository-root discovery is path-based, not `git rev-parse`-based
- temporary-workspace creation and cleanup work across OS temp roots and
  repo-root E2E workspaces
- the `ng serve` verification path uses normal process startup and shutdown
  rather than shell-specific wrappers
- the default E2E path intentionally skips a browser-specific
  `ng test --watch=false --browsers=ChromeHeadless` step so the suite does not
  assume a preinstalled browser on every platform

### E2E temp workspace cleanup and debug mode

The E2E suite creates repo-root temporary workspaces with the `ngdj-e2e-`
prefix.

Regular flows:

- `npm run cleanup:e2e:tmp-areas` removes stale `ngdj-e2e-*` workspaces left
  behind by earlier runs
- `npm run test:e2e` runs that cleanup behavior before the suite starts
- `npm run test:e2e:watch` also cleans stale `ngdj-e2e-*` workspaces before
  entering watch mode
- regular E2E scenarios clean up their current temp workspaces in `finally`
  blocks so failed assertions do not automatically leak directories into later
  runs

Debug flow:

- `npm run test:e2e:debug` sets `ANGULAR_DJANGO2_E2E_DEBUG=1`
- when debug mode is enabled, stale tmp-area cleanup is skipped and current
  E2E workspaces are preserved for manual inspection after a failure

## Temp-area harness configuration

`tests/utils/temp_areas.ts` is the single temp-area implementation used across
the repository. It supports persistent and non-persistent temp areas, repo-root
workspace creation, stale workspace cleanup, and E2E debug-mode detection.

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
