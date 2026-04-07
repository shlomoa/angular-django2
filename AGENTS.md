# AGENTS.md

## Project Overview

This repository hosts `angular-django2`, an Angular 21 library workspace for a Django-friendly npm package.

## Source Of Truth

- Library source: `projects/angular-django2`
- Published build output: `dist/angular-django2`
- Shared commands: root `package.json`
- Shared docs: root `README.md` and `docs/RELEASING.md`

## Working Agreement

- Prefer small, reviewable changes.
- Treat this as an Angular library, not an Angular application, unless the user explicitly asks for an app.
- Keep the public API narrow and intentional.
- Keep Django integration concerns explicit, especially configuration, URL handling, auth boundaries, and CSRF naming.
- Avoid generated-looking boilerplate that does not add package value.

## Verification

Use package scripts instead of ad hoc commands whenever possible:

- `npm run format:check`
- `npm run test:ci`
- `npm run build`
- `npm run pack:dry-run`

Only report commands as successful if they were actually run.

## Documentation

- Keep `README.md`, `projects/angular-django2/README.md`, and release docs in sync with the actual workspace.
- Prefer Angular.dev-style examples based on standalone providers and `provide*` APIs.

## File Priority

If multiple agent-instruction files exist in this repository:

- Treat this `AGENTS.md` file as the canonical shared guidance.
- Keep `CLAUDE.md`, `GEMINI.md`, and `.github/copilot-instructions.md` aligned with it.
