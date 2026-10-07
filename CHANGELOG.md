# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog and follows semantic versioning for released package versions.

## [Unreleased]

- Added `--auth-scheme` to `openapi-setup` (#190). The generated `django-transport.ts` always sent `Authorization: Bearer <token>`, and `DJANGO_AUTH_TOKEN` supplies only the value, so a backend that authenticates with HTTP Basic could not be reached through the helpers (a Basic value returned from the factory was sent as `Bearer Basic …`). `--auth-scheme=basic` generates an interceptor that reads `{ username, password }` from `DJANGO_AUTH_TOKEN` and sends `Authorization: Basic <base64 of UTF-8 username:password>`. The default is `bearer` and its output is unchanged. In `command-mapping.json`, `transportSchemes` lists both schemes and the #190 gap is closed.

## [0.6.3]

- Updated the pinned `@shlomoa/openui-spec` dependency to 0.12.1. The OpenUI document specification and catalog remain at 0.12.0.

- Re-running `material-app` on an existing project applies a changed `Application` document (a route, nav item, toolbar action, title or presentation token) and keeps edits made around the generated output. The layout, component, styles and spec files mark the generated text between `openui:begin` and `openui:end` comments, and a re-run replaces only those regions; a file without markers is replaced whole once. A new toolbar action gets a handler stub, and an existing handler is never changed or removed. The result of a re-run equals a clean regeneration.
- `material-setup` applies a changed option on a re-run: a changed `--theme` swaps the prebuilt theme in `angular.json` and the theme block of `styles.scss` (the custom theme is now written between `openui:begin theme` and `openui:end theme` comments), a changed `--typography` changes the custom theme, and a changed `--animations` swaps the animation provider.

- Fixed `material-setup` with a prebuilt theme prepending its marker comment to `styles.scss` on every run, so `material-setup` and `material-app` were not idempotent. A second run with unchanged options now leaves `styles.scss` byte-identical for every prebuilt theme and for the custom theme; the first-run output is unchanged. In `command-mapping.json`, `material-setup` is `no-op` on an existing project and `Application` update (and `material-app` update) is `supported`.
- Added `schematics/command-mapping.json` and `command-mapping.schema.json` to the package: a machine-readable mapping between changes to an OpenUI document or an OpenAPI contract and the ngdj commands, for orchestrators such as `django-angular3`. It lists every command with its parameters, behavior on existing output and per-operation status (create, update, delete, move), the OpenUI node types and their root commands, an `api` section for `openapi-setup` and `data-service`, and every scope of the pinned OpenUI catalog. It records what is create-only today instead of assuming support. The validation suite checks it against the collection, the option schemas, the cited specs and the catalog, and a new re-run spec pins what nine commands do on existing output (`TC-MAPPING-RERUN-01…10`; the last pins a known `material-setup` defect as an expected failure).

## [0.6.2]

- Added the `table` schematic, which compiles an OpenUI `table` element (`widgets/table`, `--document`, `--node-id`) into a standalone `OnPush` Angular Material table. The host supplies the columns and the rows; `behaves.sort`, `behaves.filter` and `behaves.paginate` select Material sorting, a filter field and paging, wired to the `sorted`, `filtered` and `paginated` outputs the host handles. Unsupported attributes and child types are rejected. See `docs/cli/table.md`.
- Added a table demonstration page to the reference application at `/table`.
- Added the `dialog` schematic for generating an Angular Material dialog from an OpenUI `dialog` widget, with end-to-end coverage and a reference application demonstration page.
- Added the `stepper` schematic for generating an Angular Material stepper from an OpenUI `stepper` container, with a reference application demonstration page.
- Added the `tabs` schematic for generating Angular Material tabs from an OpenUI `tabs` container, with end-to-end coverage and a reference application demonstration page.
- The `material-app` schematic replaces the application's default `app.spec.ts` (or `app.component.spec.ts`) together with the component, so the generated unit test provides the router and asserts the toolbar title. The default spec expected an `h1` and failed against the sidenav layout with `NG0201: No provider found for ActivatedRoute`.

## [0.6.1]

- **Breaking:** OpenUI documents use `@shlomoa/openui-spec` 0.12.0 (pinned, no range), which narrows the attribute value grammar: an attribute value is a string, `null`, or a list of those. A JSON number or Boolean is no longer a value, alone or in a list, and the validator rejects it with `grammar/invalid-attribute-value`. A typed value is written as an unquoted string: `"uses.multiline": "true"`, `"uses.maxLength": "25"`. Documents written for 0.11.0 must be migrated (`python -m spec.bin.migrate` of openui-spec converts a Boolean or number to the string of its JSON text) and declare version `0.12.0`.
- `readAstBoolean` accepts exactly the unquoted strings `"true"` and `"false"`, and `readAstNumber` an unquoted string that is a JSON number. Both reject a quoted literal (`"\"true\""` is the text `true`), any other expression (`"!x"`, `"(int)x"`) and a list, because the schematics need the value at generation time and cannot evaluate an expression. Synthetic documents built from CLI options write Booleans and numbers as such strings.
- Component input bindings of embedded children (`component`, `complex-component`, `page`): an unquoted input value is an Angular expression and is bound as written, so a typed attribute is now bound as a typed expression (`uses.required` `"true"` binds `[required]="true"`, `"25"` binds `[size]="25"`) instead of the string `'true'`. A quoted literal still binds as a string literal (`[label]="'Email'"`), `null` is not bound and a list is rejected. An unquoted value no longer fails, and neither does an attribute the child has no input for.
- A quoted literal on a `produces.*` or `behaves.*` attribute is rejected by the validator with `contract/wrong-value-type`.
- Generated Angular output is unchanged.

## [0.6.0]

- **Breaking:** OpenUI documents use `@shlomoa/openui-spec` 0.11.0 typed attributes (pinned, no range). Keys are categorized (`[title]` becomes `uses.title`, `(activate)` becomes `produces.activate`, `(submit)` becomes `behaves.submit`); a string literal is quoted inside the string (`"\"Users\""`); booleans and numbers are JSON values. An unquoted string is an expression, so a text attribute written without quotes is rejected with a message that shows the quoted form. Only `behaves.*`, `produces.*` and `uses.data` take an expression. Documents written for 0.3.1 must be migrated.
- A textarea control is `uses.multiline: true`; the catalog's `uses.type` has no `textarea`. `uses.type` `search`, `tel` and `url` are still not generated.
- The validator's contract stage now checks element references (`uses.route`, `uses.target`, `uses.redirectTo`, `uses.defaultRoute`) in every schematic that reads a document, and reports diagnostics as `path: code: message`.
- Generated Angular output is unchanged.

## [0.5.1]

- Added OpenUI 0.3.1 document input to existing application, Material application, page, component, complex-component, reactive-form, form-field, field-component, data-service, and workspace-setup schematics.
- Added OpenUI-driven composition for supported container, page, form, routing, navigation, and toolbar content, with schema validation and targeted unit and integration coverage.
- Deprecated `reactive-form --definition` in favor of OpenUI documents while preserving the existing definition contract.

## [0.5.0]

- Restructured repository into a multi-project standalone architecture with 3 decoupled workspaces: `projects/angular-django2` (authoritative library & schematics), `projects/angular-django2-reference` (reference & tutorial app), and `projects/angular-django-validation` (unit, integration, and E2E validation).
- Refactored layout and container architecture across schematics and reference app per `<ng-container>` zero-DOM Best Known Methods (BKMs), eliminating intermediate wrapper `<div>`s and redundant semantic enclosures.
- Eliminated all hardcoded width sizes across stylesheets; transitioned containers to 100% fluid layouts with responsive `clamp()` padding, proportional rem grids, and typographic character measure (`max-inline-size: 70ch`).
- Added dedicated Playwright E2E browser verification suite validating layout, geometry, and full-width visualizer placement across widescreen (1920x1080), laptop (1280x720), tablet (768x1024), and mobile (375x667) viewports.
- Decoupled package manifests and retired metadata synchronization scripts; enabled standalone build, pack, and publish from `projects/angular-django2/dist`.
- Updated multi-tier documentation across root docs, package-level READMEs, and Read the Docs (MkDocs).

## [0.4.7]

- Added the canonical `@shlomoa/openui-spec` dependency and OpenUI parsing utilities for validating and reading OpenUI documents.
- Added documented mappings between OpenUI specification elements and the `ngdj` schematic workflows, with corresponding requirements coverage.
- Added unit coverage for OpenUI parsing and package-metadata synchronization.
- Aligned the release preparation command with CI by building distribution artifacts before schematic tests.

## [0.4.6]

- **Breaking:** Removed the legacy `site` schematic, including its site-assembly definition and lifecycle contract. The `ng generate angular-django2:site` command is no longer available.
- Updated the supported workflow to compose sites explicitly with `material-app` for the Material application shell and `page` for feature-owned lazy routes and navigation.

## [0.4.5]

- Reorganized the public documentation around clearer user journeys and workflow-oriented tutorial guidance.
- Normalized the schematic CLI reference and added automated coverage for its generated command documentation.
- Added deterministic strict Read the Docs validation in CI and strengthened documentation consistency checks.

## [0.4.4]

- Added kebab-case CLI aliases for multiword schematic options while retaining camelCase schema property support and the legacy `--openapi_spec_file` alias.
- Updated schematic option handling, reference-app guidance, CLI documentation, and tests to use and verify the canonical kebab-case spellings.

## [0.4.3]

- Added a single package-metadata projection with explicit source synchronization and read-only source/distribution validation.
- Updated release versioning to keep the root manifest, publishable package manifest, and lockfile root records aligned.
- Strengthened CI and publishing checks against metadata drift and unexpected build mutations.
- Aligned contributor, testing, release, and Read the Docs documentation with the current workspace workflows.

## [0.4.2]

- Aligned package documentation and schematic messaging around the `ngdj`/`djangoangular` terminology and explicit site assembly definitions.
- Updated generated site, OpenAPI setup, and reactive-form terminology to use resource-neutral names, with corresponding unit, integration, and end-to-end coverage.

## [0.4.1]

- Expanded the tutorial, CLI reference, package README, and integration-testing guidance for the current schematics workflow.
- Added cross-platform end-to-end schematic coverage and documented the shared temporary-workspace test harness.

## [0.4.0]

- Added the `site` schematic for generating a complete OpenUI Angular Material site, including routed pages, navigation, responsive layout, and Django CSRF provider wiring.
- Added typed `reactive-form`, `form-field`, and `field-component` schematics for generating Angular Material form controls and form models.
- Added the lazy-routed `page` schematic.
- Improved generated form-field validation/error-state output, disabled-state handling, component-path validation, field-name compatibility, and site navigation safety.
- Updated Angular, Angular CLI, Angular Material, linting, and test tooling dependencies.

## [0.3.2]

- Added the advanced `complex-component` schematic for composing Angular Material components with mixins, nested components, projection, and CDK overlays.
- Updated `complex-component` modify mode to refresh its projection API.
- Added Linux and Windows validation for generated commands and restricted CI token permissions.

## [0.3.1]

- **Breaking:** Renamed the `api-setup` schematic to `openapi-setup` (#63). Update any `ng generate angular-django2:api-setup` invocations to `ng generate angular-django2:openapi-setup`.
- **Breaking:** Renamed the `openapi-setup` schematic option `--inputPath` to `--openapi_spec_file` (#60).

## [0.3.0]

- **Breaking:** Renamed three schematics for a clearer, non-redundant naming
  scheme: `ng-app` → `material-app`, `ng-workspace` → `workspace-setup`,
  `ng-api` → `api-setup`. The `ng-` prefix was dropped (redundant alongside
  `ng generate`), `ng-workspace` no longer collides with Angular's own
  "workspace" concept from `ng new`, and the new names join the existing
  `material-setup`/`project-structure` naming pattern. `ng-add`, `application`,
  `component`, `service`, `class`, and `app-shell` are unchanged — they already
  mirror Angular's own schematic names.
- Fixed `material-app` (formerly `ng-app`) duplicating `project-structure`'s
  and `material-setup`'s logic inline instead of delegating to them via
  `externalSchematic`. The directory-structure and Material-configuration
  behavior now has a single source of truth in each standalone schematic.
- Renamed the Material sidenav layout that `material-app` writes from
  "app shell" to "layout" throughout code, logs, and docs, so it no longer
  reads as related to the standalone `app-shell` schematic (Angular's
  unrelated SSR/prerendering feature).

## [0.2.0]

- **Breaking:** Removed the runtime library (`provideAngularDjango2`, `AngularDjango2Service`, `ANGULAR_DJANGO2_CONFIG`, and related config types). `angular-django2` is now a schematics-only package; the Angular-library build (`ng-packagr`) and TypeDoc API docs have been removed accordingly.
- `ng-api` schematic now generates Django integration helpers (`django-transport.ts`, `resource-adapter.ts`, barrel `index.ts`) under a configurable `--helpersPath` (default `src/app/api-integration/`).
- New `ng-api` options: `--helpersPath`, `--skipHelpers`, `--skipTests`.
- Django integration artifacts include `provideDjangoApiTransport()`, `readCsrfCookie()`, `djangoAuthInterceptor`, `djangoCredentialsInterceptor()`, `DJANGO_AUTH_TOKEN`, `ResourceAdapter<T>`, `PaginatedResult`, and `ResourceQuery`.
- Added tests TC-API-09 through TC-API-15 (unit) and INT-API-04 (integration) covering artifact shape, composition points, custom paths, skip flags, and idempotency.

## [0.1.6]

- Fixed CI and publish workflow build setup for the release pipeline.
- Documented the `tools/release-version.mjs` versioning script and its release follow-up boundaries.
- Added README status badges for CI and npm package visibility.
- Included small workspace settings maintenance.

## [0.1.5]

- Migrated the workspace and package tooling to Angular 22.
- Added the Angular Material tutorial/reference app and validation coverage for its workspace setup.
- Added ReadTheDocs, TypeDoc, tutorial, CLI, and release documentation updates.
- Added Dependabot configuration and CI/documentation maintenance updates.
- Polished schematics behavior and generated workspace documentation.

## [0.1.4]

- Added the `ng-workspace` schematic and follow-up polish for generated workspace instructions.
- Expanded repository and package documentation, including the release planning and publishing guidance.
- Added supporting tests and maintenance follow-ups around release tooling, linting, and formatting.

- Initial Angular 21 library workspace
- Initial `angular-django2` runtime API for Django-oriented configuration
- Initial custom schematics collection for `application`, `service`, `class`, `app-shell`, and `component`
- CI and npm publish workflows
- Contributor and release documentation
