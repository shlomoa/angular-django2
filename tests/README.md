# Testing for `angular-django2`

This directory documents everything related to testing and validation in this
repository: Angular library tests, Node-side schematic tests, end-to-end
workspace tests, and the temp-area helper harnesses.

Integration and end-to-end testing details are centralized in
`docs/INTEGRATION_TESTING.md`. Use that document as the canonical source for
integration-specific commands, coverage, prerequisites, temp-workspace
behavior, and platform caveats.

## What kinds of testing this repo contains

### Angular library tests

- Run by `npm test`
- Executed through Angular's test builder for the `angular-django2` library
- Validate the runtime library code under `projects/angular-django2/src/lib`

### Angular Material reference app tests

- Run by `npm run test:reference-app`
- Executed through Angular's test builder for the `angular-django2-reference`
  application project
- Validate the repo-owned tutorial/reference app under
  `projects/angular-django2-reference`

### Node-side unit tests

- Run by `npm run test:node`
- Powered by Vitest with `vitest.config.mts`
- Include `tests/**/*.spec.ts`
- Exclude `tests/schematics.e2e.spec.ts`
- Focus on isolated schematic behavior with mocks

Primary files:

- `tests/schematics/*.spec.ts`
- `tests/release-version.spec.ts`
- `tests/sync-package-metadata.spec.ts`
- `tests/test_application.spec.ts`
- `tests/utils/temp_areas.spec.ts`

### Node-side integration tests

See `docs/INTEGRATION_TESTING.md`.

### End-to-end schematic tests

See `docs/INTEGRATION_TESTING.md`.

That guide also owns the documented cross-platform behavior for the E2E and
temp-area-backed flows, including the OS-agnostic Angular CLI/Vitest launch
strategy, repo-root temp-workspace cleanup, and debug-mode preservation rules.

### Temp-area helper coverage

See `docs/INTEGRATION_TESTING.md`.

## Which command runs what

| Command                         | Coverage                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm test`                      | Angular library tests only                                                                           |
| `npm run test:reference-app`    | Angular Material reference app tests                                                                 |
| `npm run test:node`             | Node-side unit + integration specs in `tests/**/*.spec.ts`, excluding `tests/schematics.e2e.spec.ts` |
| `npm run test:node:watch`       | Watch mode for the same Node-side unit + integration specs                                           |
| `npm run cleanup:e2e:tmp-areas` | Removes stale repo-root E2E temp workspaces from previous runs                                       |
| `npm run test:e2e`              | Only `tests/schematics.e2e.spec.ts`, after cleaning stale repo-root E2E temp workspaces              |
| `npm run test:e2e:watch`        | Watch mode for the E2E suite, after cleaning stale repo-root E2E temp workspaces                     |
| `npm run test:e2e:debug`        | Only `tests/schematics.e2e.spec.ts`, while preserving temp workspaces for failure debugging          |
| `npm run test:ci`               | `npm run test:node` + Angular library tests + reference app tests                                    |

`npm run test:ci` does **not** run the E2E suite.

## File map

### Core spec files

- `tests/schematics/*.spec.ts`
  - unit tests for schematic wrappers, split by schematic category
  - uses mocked `externalSchematic` calls where relevant
  - shared context/readme helpers live in `tests/schematics/schematics.helpers.ts`

- `tests/schematics.integration.spec.ts`
  - integration coverage summary and usage details live in
    `docs/INTEGRATION_TESTING.md`

- `tests/schematics.e2e.spec.ts`
  - end-to-end coverage summary and usage details live in
    `docs/INTEGRATION_TESTING.md`

- `tests/release-version.spec.ts`
  - validates release versioning logic

- `tests/sync-package-metadata.spec.ts`
  - validates package metadata synchronization

- `tests/test_application.spec.ts`
  - validates that a temp-area-backed Angular workspace can install the built
    package, run `ng add angular-django2`, generate `my-app`, and build

- `tests/reference_app_workspace.spec.ts`
  - validates the checked-in reference app workspace infrastructure and npm
    scripts

- `tests/utils/temp_areas.spec.ts`
  - tests the single shared temp-area implementation used for OS temp roots,
    repo-root E2E workspaces, stale workspace cleanup, and debug-mode
    detection

### Helper utilities

- `tests/utils/temp_areas.ts`
  - single shared temp-area helper used by temp-area specs, repo-root E2E
    workspace creation, stale E2E cleanup, and the E2E command entrypoint; see
    `docs/INTEGRATION_TESTING.md`

### Additional smoke harness files

None at the moment; the former application harness now lives in
`tests/test_application.spec.ts` and participates in the normal Node-side spec
flow.

## How to run the major test flows

### Angular library tests only

```bash
npm test
```

### Angular Material reference app tests only

```bash
npm run test:reference-app
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

See `docs/INTEGRATION_TESTING.md`.

Regular E2E runs clean stale repo-root temp workspaces before the suite starts
and clean the current workspace after each scenario. Use `npm run test:e2e:debug`
when you want to preserve temp workspaces for failure debugging.

The default E2E path is intentionally browser-agnostic: it validates schematic
generation, buildability, and a live `ng serve` path without requiring a
platform-specific `ChromeHeadless` setup.

### CI-friendly repo validation

```bash
npm run test:ci
```

This runs Node-side specs, Angular library tests, and checked-in Angular
Material reference app tests, but not the E2E suite.

## Integration-specific prerequisites and caveats

See `docs/INTEGRATION_TESTING.md`.

That includes the current portability notes for command launching,
cross-platform cleanup behavior, and why `ng new` is handled differently from
in-workspace Angular CLI commands.

## CI and validation boundaries

`npm run format:check` checks file formatting as part of the default validation
flow. If it reports formatting differences, run `npm run format` to fix file
formatting locally before rerunning validation.

The main CI flow runs:

1. `npm run format:check`
2. `npm run lint`
3. `npm run build`
4. `npm run test:ci`
5. `npm run pack:dry-run`

That means the default CI path covers formatting, linting, compiled schematics,
Node-side tests, Angular library tests, and package verification, while the
E2E suite remains a separate, explicit step.
