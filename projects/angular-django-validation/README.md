# `angular-django-validation`

Dedicated standalone validation suite for the `angular-django2` schematics collection and Angular library workspace.

## Purpose

This project provides comprehensive, isolated validation for `angular-django2`:

- **Unit Testing**: Fast, isolated testing of individual schematics, schema aliases, CVA generation, route preservation, and metadata tooling powered by [Vitest](https://vitest.dev/) with optional browser execution via `@vitest/browser`.
- **End-to-End (E2E) Testing**: Real-world workspace generation, installation of `angular-django2` as a packed external tarball (`.tgz`), project compilation, dev server execution, and [Playwright](https://playwright.dev/) browser verification.
- **Independence**: Fully standalone project with its own `package.json`, `angular.json`, `tsconfig.json`, `vitest.config.mts`, `playwright.config.ts`, linting, and formatting rules.

## Directory Layout

```text
projects/angular-django-validation/
├── angular.json               # Angular workspace configuration for validation project
├── package.json               # Standalone manifest, test dependencies, and validation scripts
├── tsconfig.json              # TypeScript compilation configuration
├── vitest.config.mts          # Vitest configuration (Node & Vitest Browser)
├── playwright.config.ts       # Playwright E2E browser automation configuration
├── eslint.config.mjs          # Linting rules for test suites
├── unit/                      # Unit-level test suites
│   ├── schematics/            # Isolated schematic unit specs and mocks
│   ├── integration/           # SchematicTestRunner integration suites
│   └── meta/                  # Sync-metadata, release-version, and CLI doc tests
└── e2e/                       # End-to-end test suites and testing vehicles
    ├── utils/                 # Temp-area workspace allocation, cleanup, and runners
    ├── schematics.e2e.spec.ts # Real workspace generation & build validation
    ├── test_application.spec.ts # Application generation validation
    └── playwright/            # Playwright browser automation suites for generated apps
```

## Available Scripts

Run these scripts directly from within `projects/angular-django-validation/`:

### Unit Testing

```bash
# Run all unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run unit tests with Vitest Browser mode enabled
npm run test:unit:browser
```

### End-to-End Testing

```bash
# Run full E2E validation (cleans stale temp workspaces first)
npm run test:e2e

# Run E2E validation in watch mode
npm run test:e2e:watch

# Run E2E validation in debug mode (preserves temp workspaces on failure)
npm run test:e2e:debug

# Clean up stale temp workspaces
npm run cleanup:e2e

# Run Playwright browser test specs
npm run test:playwright
```

### Code Quality

```bash
# Lint validation suites
npm run lint

# Check formatting
npm run format:check

# Auto-fix formatting
npm run format
```

## External Package Simulation

To ensure genuine end-to-end fidelity, E2E tests install `angular-django2` from a packed tarball (`.tgz`) created from `projects/angular-django2/dist`, exactly replicating an external npm package installation:

```bash
# Build and pack the library
npm --workspace=angular-django2 run pack

# Validation consumes the generated tarball in temporary workspaces
```
