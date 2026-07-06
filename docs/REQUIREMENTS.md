# Repository Requirements

This document summarizes the requirements already established for
`angular-django2`. It is a consolidation of the current repo guidance, not a
new source of truth. If this file drifts, resolve mismatches in this order:

1. this repo's executable/configuration sources such as `package.json`,
   `angular.json`, `projects/angular-django2/src/public-api.ts`,
   `projects/angular-django2/src/lib`, `projects/angular-django2/schematics`,
   and `.github/workflows/publish.yml`
2. this repo's maintained docs such as `README.md`,
   `projects/angular-django2/README.md`, `tests/README.md`,
   `docs/INTEGRATION_TESTING.md`, and `docs/RELEASING.md`
3. the `django-angular3` repo for Django-side integration details not specified
   here
4. other directly relevant `shlomoa` repos if higher-priority sources are
   silent
5. upstream framework or tool docs such as Angular, Django, DRF, npm, and
   GitHub Actions

When sources conflict, prefer code/config over prose and higher-priority
sources over lower-priority ones.

## Terminology

- **angular-django2** (also referred to as **ngdj**): This repository — an
  Angular 22 library workspace that produces a Django-friendly npm package.
- **django-angular3**: A companion Django package that provides Django
  management commands (`django-admin`) for Angular workspace operations,
  including automatic invocation of `ng add angular-django2`.

## 1. Repository Identity

- The repository is an Angular 22 library workspace.
- The repository exists to produce a Django-friendly npm package named
  `angular-django2`.
- Treat the project as a publishable Angular library by default, not as an
  Angular application, unless work explicitly targets app generation behavior.
- The library source of truth is `projects/angular-django2`.
- The repo-owned Angular Material tutorial/reference app lives in
  `projects/angular-django2-reference`; its displayed app name is
  `angular-django2`, while the workspace project key remains distinct from the
  publishable library project.
- The publishable build output is `dist/angular-django2`.
- Shared commands are defined in the root `package.json`.

## 2. Product Requirements

- The package must ship two main capabilities:
  - runtime Angular utilities for Django-oriented configuration
  - an Angular CLI schematics collection for custom `ng generate` flows
- The public runtime API must stay narrow, typed, and intentional.
- Standalone Angular patterns and provider-style APIs are preferred over
  module-centric patterns.
- Django integration concerns must remain explicit in code and documentation,
  especially:
  - configuration
  - URL handling
  - auth boundaries
  - CSRF naming
  - serialization behavior
- Hidden behavior and speculative abstractions should be avoided.
- Generated-looking boilerplate that does not add package value should be
  avoided.

## 3. Current Runtime Surface

The currently required runtime surface is intentionally small and centered on
configuration helpers:

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

Current HTTP/CSRF boundaries are also part of the current repo behavior:

- the package does not currently ship its own `HttpClient` interceptor or
  automatic request wiring
- `withCredentials` is stored in config but is not automatically applied to
  requests
- there is no built-in CSRF cookie reader beyond the manual `csrfHeader()`
  helper
- current examples should prefer Angular's own `provideHttpClient(...)` and
  `withXsrfConfiguration(...)` alongside `provideAngularDjango2(...)`

## 4. Schematics Requirements

- The package must publish a schematics collection.
- The currently supported schematics are:
  - `ng-add`
  - `application`
  - `app-shell`
  - `class`
  - `component`
  - `embed-component`
  - `service`
  - `material-setup`
  - `project-structure`
  - `ng-app`
  - `ng-workspace`
  - `ng-api`
  - `data-service`
- The documented defaults and behavior currently expected are:
  - `ng-add`: register or prepend `angular-django2` in
    `cli.schematicCollections`
  - `application`: `standalone: true`, `routing: true`, `ssr: false`,
    `zoneless: true`, `style: 'scss'`
  - `component`: `standalone: true`, `changeDetection: 'OnPush'`; also seeds
    begin/end embedding hooks into the generated files — TypeScript `import`,
    `injected services`, `input signals`, and `output signals` sections plus a
    template `children` section — so components can be embedded later
  - `embed-component`: wire a generated child component into a parent using the
    embedding hooks; options: `--component` (child component `.ts` path),
    `--parent` (parent component `.ts` path); it adds the child element after
    the parent template `children` marker (feeding input signals and binding
    output signals to `on<Output>()` handlers), imports the child class,
    registers it in the parent `imports` array, and adds not-implemented
    `on<Output>()` handler stubs
  - `service`, `class`, and `app-shell`: pass-through behavior
  - `material-setup`: configure Angular Material theming (prebuilt or custom)
    and providers in an existing project; options: `--theme`, `--typography`,
    `--animations`
  - `project-structure`: create `core/`, `shared/components/`,
    `shared/pipes/`, and `features/` directories with barrel `index.ts`
    exports
  - `ng-app`: generate a complete Angular app with Material UI in one step —
    runs `application`, installs `@angular/material` and `@angular/cdk`,
    configures Material theming, creates the standard directory structure, and
    writes a responsive sidenav app shell into `app.component.*`; defaults the
    delegated Angular application generation to `--ssr=false`,
    `--zoneless=true`, and `--defaults`
  - `ng-workspace`: write workspace-wide bootstrap files for an empty Angular
    workspace, currently `.github/copilot-instructions.md`, the workspace root
    `README.md`, ESLint setup, Vitest setup, lint/test package scripts, and
    missing lint targets in `angular.json`; it also supports optional
    application source-file hooks for the Angular application files documented
    at <https://angular.dev/reference/configs/file-structure#application-source-files>
    using exactly one of `content`, `path`, or `template` per file hook
  - `ng-api`: bootstrap
    [ng-openapi-gen](https://github.com/cyclosproject/ng-openapi-gen) — adds
    `ng-openapi-gen` to `devDependencies`, writes `ng-openapi-gen.json`, and
    adds a `generate:api` npm script; options: `--inputPath` (default:
    `openapi.json`), `--outputPath` (default: `src/app/api`)
  - `data-service`: generate a typed `*DataService` wrapper around an
    ng-openapi-gen `*ApiService` with search and CRUD helpers; options:
    `--apiService`, `--apiPath` (default: `../api/services`), `--path`,
    `--flat`, `--skipTests`

## 5. Django Integration Requirements

- This library is designed to integrate with
  [django-angular3](https://github.com/shlomoa/django-angular3).
- django-angular3 provides Django management commands using `django-admin` for
  Angular workspace operations.
- The `ng add angular-django2` schematic is invoked automatically by
  django-angular3 to register the schematic collection.
- Documentation and code should reflect this integration relationship where
  relevant.

## 6. Tooling And Verification Requirements

- Development should use the root package scripts instead of ad hoc commands
  whenever possible.
- Only report a command as successful if it was actually run.
- `npm run format:check` checks file formatting.
- `npm run format` fixes file formatting.
- The standard verification flow should include the shared scripts already
  defined by the repo.
- The reference app infrastructure must keep finite build, lint, test, and
  dev-server scripts available without making the library project an
  application.
- The most important verification commands called out in repo guidance are:
  - `npm run format:check`
  - `npm run lint`
  - `npm run test:ci`
  - `npm run build`
  - `npm run pack:dry-run`
- `npm run release:prepare` is the release validation command and currently
  runs:
  - `npm run format:check`
  - `npm run lint`
  - `npm run test:ci`
  - `npm run pack:dry-run`
- Packaging validation should use `npm pack ./dist/angular-django2 --dry-run`
  rather than `npm publish --dry-run`.

## 7. Environment Requirements

- Supported Node.js versions: `^22.22.3 || ^24.15.0 || >=26.0.0`
- Supported npm version: `>=11`

## 8. Documentation Requirements

- Documentation must stay aligned with the actual workspace and package
  behavior.
- Update documentation whenever commands, package behavior, or release behavior
  changes.
- At minimum, keep these files synchronized with reality:
  - `README.md`
  - `projects/angular-django2/README.md`
  - `tests/README.md`
  - `docs/INTEGRATION_TESTING.md`
  - `docs/RELEASING.md`
  - `.github/copilot-instructions.md`
  - `AGENTS.md`
  - `CLAUDE.md`
  - `GEMINI.md`
  - `docs/REQUIREMENTS.md`
- Developer-instruction files must also stay aligned with the canonical
  guidance:
  - `.github/copilot-instructions.md` is the canonical repository-specific AI
    instruction file
  - `AGENTS.md` should only reference `.github/copilot-instructions.md`
  - `CLAUDE.md` and `GEMINI.md` should only reference `AGENTS.md` and keep only
    model-specific notes
- Usage examples should prefer Angular.dev-style standalone setup and
  `provide*` APIs.

## 9. Change Management Requirements

- Prefer small, reviewable changes.
- Keep the public API small unless there is a clear package-level need to
  expand it.
- Use existing files and current repo behavior as the source of truth before
  introducing new patterns.

## 10. Release Requirements

- The release flow must build from the publishable output in
  `dist/angular-django2`.
- The published tarball is expected to contain:
  - the compiled runtime library
  - the compiled schematics collection
  - the generated package README and manifest
- Before release, confirm the package state with the documented release flow in
  `docs/RELEASING.md`.
- The current unscoped package name `angular-django2` must remain globally
  available on npm before first publish.
- The current checked-in GitHub Actions publish workflow uses GitHub-hosted
  runners and authenticates with the `NPM_TOKEN` repository secret.
- npm Trusted Publisher is not the active publish path yet. If that changes,
  update `docs/RELEASING.md`, `.github/workflows/publish.yml`, and this file
  together.
- Local publishing, when used, should publish `./dist/angular-django2`.

## 11. Non-Goals And Boundaries

- Do not treat this repo like a generic Angular app scaffold.
- Do not widen the runtime API or schematics behavior without a concrete use
  case.
- Do not hide Django-specific integration behavior behind unclear defaults.
- Do not let docs, release instructions, and package behavior drift apart.
