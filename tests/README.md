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

## Prerequisites for Integration Tests

Integration tests require the library to be built before running:

```bash
npm run build
npm run test:node
```

The build step compiles schematics into `dist/angular-django2/schematics/`, which the integration tests reference.

## Continuous Integration

The CI pipeline runs:

1. `npm run format:check` - Code formatting
2. `npm run lint` - Linting
3. `npm run build` - Build library (required for integration tests)
4. `npm run test:ci` - All tests (unit, integration, and Angular library tests)
5. `npm run pack:dry-run` - Package verification

Tests run in non-blocking mode, meaning all tests execute regardless of individual failures.
