# Test Suite Documentation

This directory contains the test suite for the angular-django2 library.

## Test Files

### Unit Tests

#### `schematics.spec.ts`

Unit tests for schematics that use mocked `externalSchematic` calls. These tests focus on:

- Verifying that schematics correctly pass options to external Angular schematics
- Testing schematic logic without executing external dependencies
- Fast execution for quick feedback during development

Tests cover:

- `ng-add`: Collection registration in angular.json
- `ng-api`: OpenAPI generator configuration
- `ng-app`: Application generation orchestration
- `material-setup`: Angular Material configuration
- `project-structure`: Directory structure creation
- Individual schematic wrappers (application, component, service, class, app-shell)

### Integration Tests

#### `schematics.integration.spec.ts`

Integration tests that use `SchematicTestRunner` to execute schematics in a realistic environment. These tests:

- Execute actual schematic code without mocks
- Validate end-to-end schematic behavior
- Test schematic chaining and interactions
- Verify file generation, modification, and configuration

Tests cover:

- **ng-add integration**: Collection registration in various workspace configurations
- **ng-api integration**: Complete OpenAPI generator setup with custom paths
- **material-setup integration**: Material theme configuration with prebuilt and custom themes
- **project-structure integration**: Directory structure creation with barrel files
- **ng-app integration**: Full application setup with Material and project structure
- **Schematic chaining**: Multiple schematics working together

### End-to-End (E2E) Tests

#### `schematics.e2e.spec.ts`

End-to-end tests that generate real Angular applications, install schematics, and verify that the generated apps can be built and run. These tests:

- Create actual Angular workspaces using Angular CLI
- Resolve the repository root via `tests/utils/tmpfiles.ts`
- Create temporary workspaces with `createTempDir()` and clean them up with `deleteTempDir()`
- Install the built angular-django2 library from the dist directory
- Execute schematics against real projects
- Build the generated applications
- Verify build artifacts and app structure
- Verify dev server startup for the step-by-step application flow

Tests cover:

- **E2E-01**: Step-by-step application generation with individual schematics (`ng-add`, `material-setup`, `project-structure`), production build verification, and dev server startup verification
- **E2E-02**: Combined `ng-app` schematic generating a complete buildable application (**currently skipped**)
- **E2E-03**: `ng-api` schematic configuration with generated config verification and production build verification

**Important**: E2E tests require:

- The library to be built (`npm run build`)
- Significantly more time (up to 5 minutes per test)
- Network access for npm package downloads
- Sufficient disk space for temporary workspaces
- Available local ports for Angular dev server verification (currently 4201 for `E2E-01`)

#### `sync-package-metadata.spec.ts`

Tests for the package metadata synchronization tool.

## Running Tests

### Run all tests

```bash
npm run test:ci
```

This runs both Node-based tests (unit and integration) and Angular library tests.

### Run only Node-based tests

```bash
npm run test:node
```

### Run tests in watch mode

```bash
npm run test:node:watch
```

### Run only integration tests

```bash
npm run test:node -- tests/schematics.integration.spec.ts
```

### Run only unit tests

```bash
npm run test:node -- tests/schematics.spec.ts
```

### Run E2E tests

```bash
npm run test:e2e
```

This builds the library and runs the E2E tests. Note: E2E tests take significantly longer (up to 5 minutes per test).

### Run E2E tests in watch mode

```bash
npm run test:e2e:watch
```

## Test Structure

### Unit Tests

- Use Vitest as the test runner
- Mock external dependencies using `vi.mock()`
- Focus on isolated functionality
- Fast execution (~50ms)

### Integration Tests

- Use `SchematicTestRunner` from `@angular-devkit/schematics/testing`
- Execute schematics in a virtual tree environment
- Validate actual file generation and modifications
- Moderate execution time (~300ms)

### E2E Tests

- Use actual Angular CLI commands via `execSync`
- Create real Angular workspaces in temporary directories resolved from the repository root
- Install and execute schematics against real projects
- Build applications to verify end-to-end functionality
- Use a helper to start and stop the Angular dev server when runtime verification is required
- Long execution time (~30s to 5min per test)
- Require network access and disk space
- Clean up temporary directories after execution

## Writing Tests

### Unit Test Pattern

```typescript
import { vi } from 'vitest';
import { externalSchematic } from '@angular-devkit/schematics';

vi.mock('@angular-devkit/schematics', async () => {
  const actual = await vi.importActual<SchematicsModule>('@angular-devkit/schematics');
  return {
    ...actual,
    externalSchematic: vi.fn(() => (tree: Tree) => tree),
  };
});

it('passes options correctly', () => {
  mySchematic({ name: 'test' });
  expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'component', {
    name: 'test',
  });
});
```

### Integration Test Pattern

```typescript
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

const collectionPath = path.join(__dirname, '../dist/angular-django2/schematics/collection.json');

it('generates files correctly', async () => {
  const runner = new SchematicTestRunner('angular-django2', collectionPath);
  const appTree = Tree.empty() as UnitTestTree;

  // Setup initial files
  appTree.create('/package.json', JSON.stringify({ name: 'test' }));

  // Run schematic
  const tree = await runner.runSchematic('ng-api', {}, appTree);

  // Verify results
  expect(tree.files).toContain('/ng-openapi-gen.json');
});
```

### E2E Test Pattern

```typescript
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createTempDir, deleteTempDir, getRepoRoot } from './utils/tmpfiles';

const E2E_TIMEOUT = 5 * 60 * 1000; // 5 minutes

it(
  'generates a buildable application',
  async () => {
    const repoRoot = getRepoRoot();
    const workspacePath = createTempDir(repoRoot, 'ngdj-e2e-');
    const appPath = path.join(workspacePath, 'test-app');
    const parentDir = path.dirname(repoRoot);
    const relativeDirectory = path.relative(parentDir, appPath);

    // Create Angular workspace
    execSync(
      `npx @angular/cli@latest new test-app --directory="${relativeDirectory}" --skip-git --skip-install --routing=true --style=scss --standalone=true --defaults`,
      { cwd: parentDir },
    );

    // Install dependencies and library
    execSync('npm install', { cwd: appPath });
    execSync(`npm install ${libraryPath}`, { cwd: appPath });

    // Run schematics
    execSync('npx ng add angular-django2 --skip-confirmation', { cwd: appPath });

    // Build application
    execSync('npx ng build --configuration=production', { cwd: appPath });

    // Verify build output
    expect(fs.existsSync(path.join(appPath, 'dist'))).toBe(true);

    // Cleanup
    deleteTempDir(workspacePath, repoRoot);
  },
  { timeout: E2E_TIMEOUT },
);
```

## Prerequisites for Integration Tests

Integration tests require the library to be built before running:

```bash
npm run build
npm run test:node
```

The build step compiles schematics into `dist/angular-django2/schematics/`, which the integration tests reference.

## Prerequisites for E2E Tests

E2E tests have additional requirements:

1. **Library must be built**: Run `npm run build` to create the distributable package in `dist/angular-django2/`
2. **Network access**: Tests download npm packages from the npm registry
3. **Disk space**: Tests create temporary Angular workspaces (each ~200MB)
4. **Time**: Each test can take 30 seconds to 5 minutes
5. **Node.js and npm**: Must be available in PATH for Angular CLI execution
6. **Port availability for runtime checks**: `E2E-01` starts `ng serve`, so its configured port must be free before the test begins

```bash
npm run build
npm run test:e2e
```

E2E tests automatically clean up temporary workspaces after execution.

The current E2E implementation uses shared helpers from `tests/utils/tmpfiles.ts` to anchor temporary directories to the repository root and to centralize cleanup behavior.

## Continuous Integration

The CI pipeline runs:

1. `npm run format:check` - Code formatting
2. `npm run lint` - Linting
3. `npm run build` - Build library (required for integration tests)
4. `npm run test:ci` - All tests (unit, integration, and Angular library tests)
5. `npm run pack:dry-run` - Package verification

Tests run in non-blocking mode, meaning all tests execute regardless of individual failures.
