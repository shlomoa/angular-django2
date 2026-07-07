# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog and follows semantic versioning for released package versions.

## [Unreleased]

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
