# Repository Requirements

This document summarizes the requirements already established for `angular-django2`.
It is a consolidation of the current repo guidance, not a new source of truth.
If this file drifts, use `AGENTS.md`, the root `package.json`, `README.md`, `projects/angular-django2/README.md`, and `docs/RELEASING.md` to resolve the mismatch.

## Terminology

- **angular-django2** (also referred to as **ngdj**): This repository — an Angular 21 library workspace that produces a Django-friendly npm package.
- **django-angular3**: A companion Django package that provides Django management commands (`django-admin`) for Angular workspace operations, including automatic invocation of `ng add angular-django2`.

## 1. Repository Identity

- The repository is an Angular 21 library workspace.
- The repository exists to produce a Django-friendly npm package named `angular-django2`.
- Treat the project as a publishable Angular library by default, not as an Angular application, unless work explicitly targets app generation behavior.
- The library source of truth is `projects/angular-django2`.
- The publishable build output is `dist/angular-django2`.
- Shared commands are defined in the root `package.json`.

## 2. Product Requirements

- The package must ship two main capabilities:
  - runtime Angular utilities for Django-oriented configuration
  - an Angular CLI schematics collection for custom `ng generate` flows
- The public runtime API must stay narrow, typed, and intentional.
- Standalone Angular patterns and provider-style APIs are preferred over module-centric patterns.
- Django integration concerns must remain explicit in code and documentation, especially:
  - configuration
  - URL handling
  - auth boundaries
  - CSRF naming
  - serialization behavior
- Hidden behavior and speculative abstractions should be avoided.
- Generated-looking boilerplate that does not add package value should be avoided.

## 3. Current Runtime Surface

The currently required runtime surface is intentionally small and centered on configuration helpers:

- `provideAngularDjango2(config?)`
- `ANGULAR_DJANGO2_CONFIG`
- `AngularDjango2Service`
- configuration types exported from the library entrypoint

The resolved configuration defaults are currently:

- `apiBaseUrl: ''`
- `csrfCookieName: 'csrftoken'`
- `csrfHeaderName: 'X-CSRFToken'`
- `withCredentials: true`

The service behavior currently expected by the repo docs and code is:

- build API URLs from the configured base URL
- expose a helper for building CSRF header objects

## 4. Schematics Requirements

- The package must publish a schematics collection.
- The currently supported schematics are:
  - `ng-add`
  - `application`
  - `app-shell`
  - `class`
  - `component`
  - `service`
  - `material-setup`
  - `project-structure`
  - `ng-app`
  - `ng-api`
  - `data-service`
- The documented defaults and behavior currently expected are:
  - `ng-add`: register or prepend `angular-django2` in `cli.schematicCollections`
  - `application`: `standalone: true`, `routing: true`, `style: 'scss'`
  - `component`: `standalone: true`, `changeDetection: 'OnPush'`
  - `service`, `class`, and `app-shell`: pass-through behavior
  - `material-setup`: configure Angular Material theming (prebuilt or custom) and providers in an existing project; options: `--theme`, `--typography`, `--animations`
  - `project-structure`: create `core/`, `shared/components/`, `shared/pipes/`, and `features/` directories with barrel `index.ts` exports
  - `ng-app`: generate a complete Angular app with Material UI in one step — runs `application`, installs `@angular/material` and `@angular/cdk`, configures Material theming, creates the standard directory structure, and writes a responsive sidenav app shell into `app.component.*`
  - `ng-api`: bootstrap [ng-openapi-gen](https://github.com/cyclosproject/ng-openapi-gen) — adds `ng-openapi-gen` to `devDependencies`, writes `ng-openapi-gen.json`, and adds a `generate:api` npm script; options: `--inputPath` (default: `openapi.json`), `--outputPath` (default: `src/app/api`)
  - `data-service`: generate a typed `*DataService` wrapper around an ng-openapi-gen `*ApiService` with search and CRUD helpers; options: `--apiService`, `--apiPath` (default: `../api/services`), `--path`, `--flat`, `--skipTests`

## 5. Django Integration Requirements

- This library is designed to integrate with [django-angular3](https://github.com/shlomoa/django-angular3).
- django-angular3 provides Django management commands using `django-admin` for Angular workspace operations.
- The `ng add angular-django2` schematic is invoked automatically by django-angular3 to register the schematic collection.
- Documentation and code should reflect this integration relationship where relevant.

## 6. Tooling And Verification Requirements

- Development should use the root package scripts instead of ad hoc commands whenever possible.
- Only report a command as successful if it was actually run.
- The standard verification flow should include the shared scripts already defined by the repo.
- The most important verification commands called out in repo guidance are:
  - `npm run format:check`
  - `npm run lint`
  - `npm run test:ci`
  - `npm run build`
  - `npm run pack:dry-run`
- `npm run release:prepare` is the release validation command and currently runs:
  - `npm run format:check`
  - `npm run lint`
  - `npm run test:ci`
  - `npm run pack:dry-run`
- Packaging validation should use `npm pack ./dist/angular-django2 --dry-run` rather than `npm publish --dry-run`.

## 7. Environment Requirements

- Supported Node.js versions: `^20.19.0 || ^22.12.0 || ^24.0.0`
- Supported npm version: `>=11`

## 8. Documentation Requirements

- Documentation must stay aligned with the actual workspace and package behavior.
- Update documentation whenever commands, package behavior, or release behavior changes.
- At minimum, keep these files synchronized with reality:
  - `README.md`
  - `projects/angular-django2/README.md`
  - `docs/RELEASING.md`
  - `AGENTS.md`
  - `.github/copilot-instructions.md`
  - `CLAUDE.md`
  - `GEMINI.md`
  - `docs/REQUIREMENTS.md`
- Developer-instruction files must also stay aligned with the canonical guidance:
  - `AGENTS.md` is the canonical shared instruction file
  - `CLAUDE.md`, `GEMINI.md`, and `.github/copilot-instructions.md` should remain aligned with it
- Usage examples should prefer Angular.dev-style standalone setup and `provide*` APIs.

## 9. Change Management Requirements

- Prefer small, reviewable changes.
- Keep the public API small unless there is a clear package-level need to expand it.
- Use existing files and current repo behavior as the source of truth before introducing new patterns.

## 10. Release Requirements

- The release flow must build from the publishable output in `dist/angular-django2`.
- The published tarball is expected to contain:
  - the compiled runtime library
  - the compiled schematics collection
  - the generated package README and manifest
- Before release, confirm the package state with the documented release flow in `docs/RELEASING.md`.
- The current unscoped package name `angular-django2` must remain globally available on npm before first publish.
- Preferred publishing setup:
  - npm Trusted Publisher configured for `.github/workflows/publish.yml`
  - GitHub-hosted runners
- Current fallback publishing setup:
  - use the `NPM_TOKEN` repository secret
- Local publishing, when used, should publish `./dist/angular-django2`.

## 11. Non-Goals And Boundaries

- Do not treat this repo like a generic Angular app scaffold.
- Do not widen the runtime API or schematics behavior without a concrete use case.
- Do not hide Django-specific integration behavior behind unclear defaults.
- Do not let docs, release instructions, and package behavior drift apart.
