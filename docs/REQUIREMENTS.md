# Repository Requirements

This document summarizes the requirements already established for
`angular-django2`. It is a consolidation of the current repo guidance, not a
new source of truth. If this file drifts, resolve mismatches in this order:

1. this repo's executable/configuration sources such as `package.json`,
   `angular.json`, `projects/angular-django2/schematics`, and
   `.github/workflows/publish.yml`
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
  Angular 22 workspace that produces a Django-friendly npm schematics package.
- **django-angular3**: A companion Django package that provides Django
  management commands (`django-admin`) for Angular workspace operations,
  including automatic invocation of `ng add angular-django2`.
- **djangoangular**: The code name for the tight Django–Angular integration
  formed by `djng` and `ngdj`. Its canonical definition is in
  [django-angular3 architecture §2.6.1](https://github.com/shlomoa/django-angular3/blob/main/doc/ARCHITECTURE.md#261-djangoangular).
- **OpenUI**: An external, technology-independent UI-description specification.
  Its purpose and vocabulary are defined by the
  [OpenUI specification](https://github.com/shlomoa/openui-spec/blob/main/spec/README.md),
  and the roles of its schema, catalog, and concrete UI document are
  defined by the
  [OpenUI artifact-role SSOT](https://github.com/shlomoa/openui-spec/blob/main/spec/README.md#specification-artifacts-grammar-vs-catalog).
  This repository does not redefine that contract.

## 1. Repository Identity

- The repository is an Angular 22 workspace.
- The repository exists to produce a Django-friendly npm package named
  `angular-django2`.
- Treat the project as a publishable schematics package by default, not as an
  Angular application, unless work explicitly targets app generation behavior.
- The schematics source of truth is `projects/angular-django2`.
- The repo-owned Angular Material tutorial/reference app lives in
  `projects/angular-django2-reference`; its displayed app name is
  `angular-django2`, while the workspace project key remains distinct from the
  publishable schematics project.
- The publishable build output is `dist/angular-django2`.
- Shared commands are defined in the root `package.json`.

## 2. Product Requirements

- The package must ship an Angular CLI schematics collection for custom
  `ng generate` flows.
- Generation must remain deterministic and must not load or execute AI agents,
  provider SDKs, prompts, or SKILLS.
- Schematics must consume explicit, validated options, workspace state, and
  structured input documents. For the same accepted inputs and workspace
  state, package-owned transformations must select the same operations and
  produce the same output or the same explicit validation error.
- External orchestrators may invoke public schematic contracts but must not
  change their inputs, outputs, behavior, or error contract.
- Standalone Angular patterns and provider-style APIs are preferred over
  module-centric patterns in generated code.
- Django integration concerns must remain explicit in generated code and
  documentation, especially:
  - configuration
  - URL handling
  - auth boundaries
  - CSRF naming
  - serialization behavior
- Hidden behavior and speculative abstractions should be avoided.
- Generated-looking boilerplate that does not add package value should be
  avoided.

## 3. Schematics Requirements

- The package must publish a schematics collection.
- The currently supported schematics are:
  - `ng-add`
  - `application`
  - `app-shell`
  - `class`
  - `component`
  - `embed-component`
  - `complex-component`
  - `field-component`
  - `form-field`
  - `reactive-form`
  - `service`
  - `material-setup`
  - `project-structure`
  - `material-app`
  - `workspace-setup`
  - `openapi-setup`
  - `data-service`
  - `page`
  - `site`
- The documented defaults and behavior currently expected are:
  - `ng-add`: register or prepend `angular-django2` in
    `cli.schematicCollections`
  - `application`: `standalone: true`, `routing: true`, `ssr: false`,
    `zoneless: true`, `style: 'scss'`
  - `component`: `standalone: true`, `changeDetection: 'OnPush'`; also seeds
    begin/end embedding hooks into the generated files — TypeScript `import`,
    `injected services`, `input signals`, and `output signals` sections plus a
    template `children` section — so components can be embedded later
  - `page`: create a standalone `OnPush` Angular Material page in a selected
    feature directory, with an owned lazy `Routes` definition and explicit
    navigation metadata. It requires an application source root, configured
    `provideRouter(routes)`, and Material/CDK/router dependencies; it rejects
    unsafe route edits and duplicate paths. Public is the default. Protected
    routes only reference an already configured reusable guard and backend
    authorization remains authoritative; the schematic does not generate API
    clients, forms, shared components, or site-wide policy.
  - `site`: assemble an existing, unmodified `material-app` shell from one
    source-root site assembly definition. It validates all discovered page, form,
    route, navigation, authentication, CSRF, and path prerequisites before
    mutation; delegates page, reactive-form, and optional openapi-setup through
    their public contracts; writes explicit XSRF provider configuration; and
    records a typed ownership manifest. No source requires the documented
    Home-only defaults. Create/modify are idempotent; confirmed delete restores
    only the unchanged owned shell and removes only its manifest. The site
    assembly definition is not an OpenUI concrete UI document. OpenAPI
    remains a separately typed reference, and Django/DRF remains authoritative
    for protected operations.
  - `embed-component`: wire a child component into a parent using the embedding
    hooks. In file mode, options are `--component` (child component `.ts` path)
    and `--parent` (parent component `.ts` path). In package mode (add
    `--from=<module>`), `--component` is the exported class name and
    `--selector`/`--inputs`/`--outputs` describe the wiring, so existing
    components such as Angular Material's `MatDateRangePicker` can be embedded.
    In both modes it adds the child element after the parent template
    `children` marker (feeding inputs and binding outputs to `on<Output>()`
    handlers), imports the child class, registers it in the parent `imports`
    array, and adds not-implemented `on<Output>()` handler stubs
  - `complex-component`: compose `component` and `embed-component` to create,
    modify, or delete an advanced standalone OnPush Angular Material component.
    It requires a kebab-case name, an application-source-tree path, and a
    non-empty feature list limited to `mixins`, `nested`, `projection`, and
    `cdk-overlay`; delete requires explicit confirmation.
  - `field-component`: create a simple, string-valued Angular Material
    field-control convenience component using the canonical `form-field`
    implementation. It supports the narrow `--kind` contract of `text`,
    `email`, `password`, and `textarea`, and applies `fill` appearance and
    `fixed` subscript sizing defaults.
  - `form-field`: generate the configurable standalone OnPush typed
    `ControlValueAccessor` Angular Material form field inside the selected
    application's source root. It supports `text`, `email`, `password`,
    `number`, and `textarea` controls; `fill` and `outline` appearances; and
    `fixed` and `dynamic` subscript sizing. Both entries require
    `@angular/forms`, `@angular/material`, and `@angular/cdk` before mutation,
    reject collisions before writes, and use the same field identity,
    accessibility, and host/server validation-error behavior.
  - `reactive-form`: generate a typed standalone OnPush Angular Material
    reactive form from a single JSON definition file supplied through
    `--definition`. The definition contract is published in the schematic
    schema and is validated atomically before any file is written: exactly one
    definition per file, a `/`-prefixed Django endpoint, unique lower-camelCase
    or snake_case fields limited to `text`, `email`, `password`, `number`, and
    `textarea`
    controls, and no resource-operation keys, because the form is create-only. Fields
    may declare a type-compatible `initialValue` and an explicit `validators`
    list limited to `required`, `email`, `minLength`, `maxLength`, `min`,
    `max`, and `pattern`, using one object shape; malformed, unsupported,
    duplicated, and control-incompatible validator entries are rejected, and
    validators are emitted in a canonical order. Output is written to `--path`
    (default `src/app/features`) inside the selected application's source root
    and composes canonical `form-field` output from `--primitives-path` (default
    `src/app/shared/form-helpers`) through private schematic metadata rather
    than generated-source parsing. `field-component` is its supported
    convenience façade over the same canonical output, and absent primitives
    fall back to inline Material controls. The generated component builds a strictly
    typed `FormBuilder` group initialized from the contract and exposes a typed
    payload, submit state, accessible markup, and Django REST Framework error
    mapping that retains entered values; declared initial values are restored
    after an accepted create. An optional `integration` block wires exactly one
    existing typed artifact after verifying the file, symbol, and method exist.
    Generation is create-only: a rerun leaves existing output untouched, and
    partial output fails. It requires `@angular/forms`, `@angular/material`,
    and `@angular/cdk` before mutation.
  - `service`, `class`, and `app-shell`: pass-through behavior
  - `material-setup`: configure Angular Material theming (prebuilt or custom)
    and providers in an existing project; options: `--theme`, `--typography`,
    `--animations`
  - `project-structure`: create `core/`, `shared/components/`,
    `shared/pipes/`, and `features/` directories with barrel `index.ts`
    exports
  - `material-app`: generate a complete Angular app with Material UI in one step —
    runs `application`, installs `@angular/material` and `@angular/cdk`,
    configures Material theming, creates the standard directory structure, and
    writes a responsive sidenav layout into `app.component.*`; defaults the
    delegated Angular application generation to `--ssr=false`,
    `--zoneless=true`, and `--defaults`
  - `workspace-setup`: write workspace-wide bootstrap files for an empty Angular
    workspace, currently `.github/copilot-instructions.md`, the workspace root
    `README.md`, ESLint setup, Vitest setup, lint/test package scripts, and
    missing lint targets in `angular.json`; it also supports optional
    application source-file hooks for the Angular application files documented
    at <https://angular.dev/reference/configs/file-structure#application-source-files>
    using exactly one of `content`, `path`, or `template` per file hook
  - `openapi-setup`: bootstrap
    [ng-openapi-gen](https://github.com/cyclosproject/ng-openapi-gen) — adds
    `ng-openapi-gen` to `devDependencies`, writes `ng-openapi-gen.json`, and
    adds a `generate:api` npm script; it also generates Django integration
    artifacts under `helpersPath` — auth/CSRF/transport helpers
    (`provideDjangoApiTransport`, `readCsrfCookie`, `djangoAuthInterceptor`,
    `djangoCredentialsInterceptor`, `DJANGO_AUTH_TOKEN`) in
    `django-transport.ts`, an API-contract-derived `ResourceAdapter` with a DRF-style
    `PaginatedResult` in `resource-adapter.ts`, and a barrel `index.ts`; options:
    `--openapi_spec_file` (default: `openapi.json`), `--outputPath` (default:
    `src/app/api`), `--helpersPath` (default: `src/app/api-integration`),
    `--skipHelpers`, `--skipTests`
  - `data-service`: generate a typed `*DataService` wrapper around an
    ng-openapi-gen `*ApiService` with search and CRUD helpers; options:
    `--apiService`, `--apiPath` (default: `../api/services`), `--path`,
    `--flat`, `--skipTests`

## 4. Django Integration Requirements

- This library is designed to integrate with
  [django-angular3](https://github.com/shlomoa/django-angular3).
- django-angular3 provides Django management commands using `django-admin` for
  Angular workspace operations.
- The `ng add angular-django2` schematic is invoked automatically by
  django-angular3 to register the schematic collection.
- Documentation and code should reflect this integration relationship where
  relevant.

## 5. Tooling And Verification Requirements

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

## 6. Environment Requirements

- Supported Node.js versions: `^22.22.3 || ^24.15.0 || >=26.0.0`
- Supported npm version: `>=11`

## 7. Documentation Requirements

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
  `provide*` APIs in generated code.

## 8. Change Management Requirements

- Prefer small, reviewable changes.
- Keep the schematics surface small unless there is a clear package-level need
  to expand it.
- Use existing files and current repo behavior as the source of truth before
  introducing new patterns.

## 9. Release Requirements

- The release flow must build from the publishable output in
  `dist/angular-django2`.
- The published tarball is expected to contain:
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

## 10. Non-Goals And Boundaries

- Do not treat this repo like a generic Angular app scaffold.
- Do not make AI agents, provider SDKs, prompts, or SKILLS part of schematic
  generation.
- Do not widen the schematics behavior without a concrete use case.
- Do not hide Django-specific integration behavior behind unclear defaults.
- Do not let docs, release instructions, and package behavior drift apart.
