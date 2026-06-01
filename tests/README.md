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

See `docs/INTEGRATION_TESTING.md`.

### End-to-end schematic tests

See `docs/INTEGRATION_TESTING.md`.

### Additional temp-area smoke harness files

See `docs/INTEGRATION_TESTING.md`.

## Which command runs what

| Command                   | Coverage                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm test`                | Angular library tests only                                                                           |
| `npm run test:node`       | Node-side unit + integration specs in `tests/**/*.spec.ts`, excluding `tests/schematics.e2e.spec.ts` |
| `npm run test:node:watch` | Watch mode for the same Node-side unit + integration specs                                           |
| `npm run test:e2e`        | Only `tests/schematics.e2e.spec.ts`                                                                  |
| `npm run test:e2e:watch`  | Watch mode for only `tests/schematics.e2e.spec.ts`                                                   |
| `npm run test:ci`         | `npm run test:node` + Angular library tests                                                          |

`npm run test:ci` does **not** run the E2E suite.

## File map

### Core spec files

- `tests/schematics.spec.ts`
  - unit tests for schematic wrappers
  - uses mocked `externalSchematic` calls

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

- `tests/utils/tmpfiles.spec.ts`
  - tests the repo-root temp-directory helper

### Helper utilities

- `tests/utils/tmpfiles.ts`
  - integration-oriented temp workspace helper; see
    `docs/INTEGRATION_TESTING.md`

- `tests/utils/temp_areas.ts`
  - integration-oriented temp area helper; see
    `docs/INTEGRATION_TESTING.md`

### Additional smoke harness files

See `docs/INTEGRATION_TESTING.md`.

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

See `docs/INTEGRATION_TESTING.md`.

### CI-friendly repo validation

```bash
npm run test:ci
```

This runs Node-side specs and Angular library tests, but not the E2E suite.

## Integration-specific prerequisites and caveats

See `docs/INTEGRATION_TESTING.md`.

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
