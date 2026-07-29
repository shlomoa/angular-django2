# Repo Instructions

## General instructions

Read this file before making repository-specific changes.
Keep [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md), and [GEMINI.md](GEMINI.md) aligned with it.

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

When sources conflict, prefer code and configuration over prose, and prefer this repository over external documentation.

## Working agreement

- Prefer small, reviewable changes.
- Treat this as an Angular library package and schematics workspace unless the request explicitly calls for an application change.
- If a request is ambiguous between library scope and application scope, ask one clarifying question before implementing code.
- Keep Django integration boundaries explicit in code and generated output: auth behavior, CSRF naming, URL handling, and serialization concerns should remain visible.
- Prefer clear TypeScript APIs, narrow exports, and maintainable Angular patterns.
- Prefer standalone Angular patterns and provider functions for new generated code; do not introduce NgModules for new schematics output.
- Do not add public runtime exports or broaden the package surface beyond the schematics package.
- Avoid generated-looking boilerplate that does not add package value.
- Move implementation inventories or long-form notes into the docs when they would otherwise bloat this file.

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

## What to optimize for

- Keep changes small and reviewable.
- Prefer Angular.dev-style examples based on standalone providers and `provide*` APIs when relevant.
- Only report commands as successful if they were actually run.
- Do not fabricate documentation or URLs; rely on repository sources and local verification.

---
