# Repo Instructions

## General instructions source of truth (SSOT)

Read the external source of truth (SSOT) for general instructions from https://github.com/shlomoa/shlomoa/blob/main/.github/copilot-instructions.md It is mandatory.

## Current repository shape

- This repository is an Angular 22 workspace that publishes an Angular CLI schematics collection under [projects/angular-django2/schematics](projects/angular-django2/schematics).
- The checked-in reference app lives in [projects/angular-django2-reference](projects/angular-django2-reference) and is used for tutorial and Material-related coverage.
- The package is not a runtime application library; it has no public runtime API. Keep the public surface narrow and centered on the schematics package and generated output.
- The repo currently uses Node.js 22/24/26-compatible tooling, npm 11+, Angular CLI 22, Vitest, and Angular Material 22.

## Source of truth for repository facts

When validating repository-specific facts, use sources in this order and stop as soon as a higher-priority source answers the question:

1. Executable and configuration truth first:
   - [package.json](package.json)
   - [angular.json](angular.json)
   - [projects/angular-django2/schematics](projects/angular-django2/schematics)
   - [.github/workflows/publish.yml](.github/workflows/publish.yml)
2. Maintained repository documentation:
   - [README.md](README.md)
   - [projects/angular-django2/README.md](projects/angular-django2/README.md)
   - [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)
   - [tests/README.md](tests/README.md)
   - [docs/INTEGRATION_TESTING.md](docs/INTEGRATION_TESTING.md)
   - [docs/RELEASING.md](docs/RELEASING.md)
3. Other shlomoa repositories only when the local docs are silent and the relationship is directly relevant.
4. Upstream framework or tool documentation only for behavior that is not already covered by local repo state.

When sources conflict, report the conflict and stop.

## Verification and testing

Use the root scripts in [package.json](package.json) as the canonical verification commands.

Current validation flow:

- [package.json](package.json): `npm run format:check`
- [package.json](package.json): `npm run lint`
- [package.json](package.json): `npm run build`
- [package.json](package.json): `npm run test:ci`
- [package.json](package.json): `npm run pack:dry-run`

The repo uses Vitest for Node-side specs and Angular's test builder for the reference app. End-to-end schematic coverage is documented in [docs/INTEGRATION_TESTING.md](docs/INTEGRATION_TESTING.md) and uses temp-area-based workspaces.

## Documentation alignment

Keep the following files aligned with the current workspace state:

- [README.md](README.md)
- [tests/README.md](tests/README.md)
- [docs/INTEGRATION_TESTING.md](docs/INTEGRATION_TESTING.md)
- [projects/angular-django2/README.md](projects/angular-django2/README.md)
- [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)
- [docs/RELEASING.md](docs/RELEASING.md)

---
