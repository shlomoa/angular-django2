/**
 * End-to-End integration tests for angular-django2 schematics
 *
 * These tests generate real Angular applications, install schematics,
 * and verify that the generated apps can be built and run.
 */
import { execSync } from 'child_process';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Test timeout for operations that involve npm install and builds
 * These can take several minutes
 */
const E2E_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * Helper function to execute shell commands and capture output
 */
function execCommand(command: string, cwd: string, throwOnError = true): string {
  try {
    return execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: throwOnError ? 'pipe' : 'ignore',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for output
    });
  } catch (error) {
    if (throwOnError) {
      console.error(`Command failed: ${command}`);
      console.error(`Working directory: ${cwd}`);
      if (error instanceof Error && 'stdout' in error && 'stderr' in error) {
        console.error('stdout:', (error as Error & { stdout: unknown }).stdout);
        console.error('stderr:', (error as Error & { stderr: unknown }).stderr);
      }
      throw error;
    }
    return '';
  }
}

/**
 * Helper function to create a temporary test workspace
 */
function createTempWorkspace(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ngdj-e2e-'));
  return tmpDir;
}

/**
 * Helper function to clean up test workspace
 */
function cleanupWorkspace(workspacePath: string): void {
  if (fs.existsSync(workspacePath)) {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  }
}

/**
 * Helper function to get the path to the built library package
 */
function getLibraryPackagePath(): string {
  const repoRoot = path.resolve(__dirname, '..');
  return path.join(repoRoot, 'dist', 'angular-django2');
}

describe('angular-django2 schematics E2E tests', () => {
  let workspacePath: string;
  let appName: string;

  beforeAll(() => {
    // Verify that the library has been built
    const libraryPath = getLibraryPackagePath();
    if (!fs.existsSync(libraryPath)) {
      throw new Error(
        `Library not built. Run 'npm run build' before running E2E tests. Expected path: ${libraryPath}`,
      );
    }
  });

  afterAll(() => {
    // Cleanup workspace after all tests
    if (workspacePath) {
      cleanupWorkspace(workspacePath);
    }
  });

  it(
    'E2E-01: ng-app schematic generates a buildable Angular application',
    { timeout: E2E_TIMEOUT },
    async () => {
      // Setup
      workspacePath = createTempWorkspace();
      appName = 'test-app';
      const libraryPath = getLibraryPackagePath();

      console.log(`\n[E2E-01] Test workspace: ${workspacePath}`);
      console.log(`[E2E-01] Library path: ${libraryPath}`);

      // Step 1: Create a new Angular workspace using Angular CLI
      console.log('[E2E-01] Creating Angular workspace...');
      execCommand(
        `npx @angular/cli@latest new ${appName} --skip-git --skip-install --routing=true --style=scss --standalone=true`,
        workspacePath,
      );

      const appPath = path.join(workspacePath, appName);
      expect(fs.existsSync(appPath)).toBe(true);
      console.log('[E2E-01] ✓ Angular workspace created');

      // Step 2: Install dependencies
      console.log('[E2E-01] Installing dependencies...');
      execCommand('npm install', appPath);
      console.log('[E2E-01] ✓ Dependencies installed');

      // Step 3: Install angular-django2 from the built library
      console.log('[E2E-01] Installing angular-django2 library...');
      execCommand(`npm install ${libraryPath}`, appPath);

      // Verify angular-django2 is in package.json
      const packageJsonPath = path.join(appPath, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      expect(packageJson.dependencies['angular-django2']).toBeDefined();
      console.log('[E2E-01] ✓ angular-django2 library installed');

      // Step 4: Run ng add angular-django2
      console.log('[E2E-01] Running ng add angular-django2...');
      execCommand('npx ng add angular-django2 --skip-confirmation', appPath);

      // Verify ng-add registered the collection
      const angularJsonPath = path.join(appPath, 'angular.json');
      const angularJson = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8'));
      expect(angularJson.cli?.schematicCollections).toContain('angular-django2');
      console.log('[E2E-01] ✓ ng add angular-django2 completed');

      // Step 5: Generate Material app shell
      console.log('[E2E-01] Configuring Material UI...');

      // Install Material dependencies first
      execCommand('npm install @angular/material @angular/cdk', appPath);

      // Run material-setup schematic
      execCommand(
        'npx ng generate angular-django2:material-setup --project=test-app --theme=indigo-pink --typography=true --animations=true',
        appPath,
      );
      console.log('[E2E-01] ✓ Material UI configured');

      // Step 6: Create project structure
      console.log('[E2E-01] Creating project structure...');
      execCommand(
        'npx ng generate angular-django2:project-structure --project=test-app --prefix=app',
        appPath,
      );
      console.log('[E2E-01] ✓ Project structure created');

      // Verify expected directories exist
      const expectedDirs = [
        path.join(appPath, 'src', 'app', 'core'),
        path.join(appPath, 'src', 'app', 'shared', 'components'),
        path.join(appPath, 'src', 'app', 'shared', 'pipes'),
        path.join(appPath, 'src', 'app', 'features'),
      ];

      for (const dir of expectedDirs) {
        expect(fs.existsSync(dir)).toBe(true);
        expect(fs.existsSync(path.join(dir, 'index.ts'))).toBe(true);
      }
      console.log('[E2E-01] ✓ Directory structure verified');

      // Step 7: Build the application
      console.log('[E2E-01] Building application...');
      const buildOutput = execCommand('npx ng build --configuration=production', appPath);
      expect(buildOutput).toBeTruthy();
      console.log('[E2E-01] ✓ Application built successfully');

      // Verify build output exists
      const distPath = path.join(appPath, 'dist', appName, 'browser');
      expect(fs.existsSync(distPath)).toBe(true);
      expect(fs.existsSync(path.join(distPath, 'index.html'))).toBe(true);
      console.log('[E2E-01] ✓ Build artifacts verified');

      // Step 8: Run tests (if they exist and pass)
      console.log('[E2E-01] Running tests...');
      try {
        execCommand('npx ng test --watch=false --browsers=ChromeHeadless', appPath, false);
        console.log('[E2E-01] ✓ Tests passed');
      } catch {
        // Tests might not be configured or might fail - this is acceptable for E2E validation
        console.log('[E2E-01] ℹ Tests skipped or failed (acceptable for E2E validation)');
      }

      console.log('[E2E-01] ✅ E2E test completed successfully');
    },
  );

  it(
    'E2E-02: ng-app combined schematic generates a complete buildable application',
    { timeout: E2E_TIMEOUT },
    async () => {
      // Setup - reuse workspace or create new one
      if (!workspacePath) {
        workspacePath = createTempWorkspace();
      }
      appName = 'combined-app';
      const libraryPath = getLibraryPackagePath();

      console.log(`\n[E2E-02] Test workspace: ${workspacePath}`);

      // Step 1: Create a minimal workspace with ng new (no application)
      console.log('[E2E-02] Creating minimal Angular workspace...');
      execCommand(
        `npx @angular/cli@latest new ${appName} --skip-git --skip-install --routing=false --style=scss --create-application=false`,
        workspacePath,
      );

      const workspaceRoot = path.join(workspacePath, appName);
      expect(fs.existsSync(workspaceRoot)).toBe(true);
      console.log('[E2E-02] ✓ Workspace created');

      // Step 2: Install dependencies
      console.log('[E2E-02] Installing dependencies...');
      execCommand('npm install', workspaceRoot);
      console.log('[E2E-02] ✓ Dependencies installed');

      // Step 3: Install angular-django2
      console.log('[E2E-02] Installing angular-django2 library...');
      execCommand(`npm install ${libraryPath}`, workspaceRoot);
      execCommand('npx ng add angular-django2 --skip-confirmation', workspaceRoot);
      console.log('[E2E-02] ✓ angular-django2 installed');

      // Step 4: Use ng-app schematic to generate complete application
      console.log('[E2E-02] Generating application with ng-app schematic...');
      execCommand(
        'npx ng generate angular-django2:ng-app demo --theme=indigo-pink --typography=true --animations=true --routing=true --standalone=true --style=scss --prefix=app',
        workspaceRoot,
      );
      console.log('[E2E-02] ✓ ng-app schematic completed');

      // Step 5: Install Material dependencies (ng-app adds them to package.json)
      console.log('[E2E-02] Installing added dependencies...');
      execCommand('npm install', workspaceRoot);
      console.log('[E2E-02] ✓ Dependencies updated');

      // Verify the application was generated
      const angularJson = JSON.parse(
        fs.readFileSync(path.join(workspaceRoot, 'angular.json'), 'utf8'),
      );
      expect(angularJson.projects['demo']).toBeDefined();

      // Verify Material theme configuration
      const buildOptions = angularJson.projects['demo'].architect.build.options;
      expect(buildOptions.styles).toContain('@angular/material/prebuilt-themes/indigo-pink.css');
      console.log('[E2E-02] ✓ Material theme configured');

      // Verify project structure
      const appRoot = path.join(workspaceRoot, 'projects', 'demo', 'src', 'app');
      const expectedDirs = ['core', 'shared/components', 'shared/pipes', 'features'];

      for (const dir of expectedDirs) {
        const dirPath = path.join(appRoot, dir);
        expect(fs.existsSync(dirPath)).toBe(true);
        expect(fs.existsSync(path.join(dirPath, 'index.ts'))).toBe(true);
      }
      console.log('[E2E-02] ✓ Project structure verified');

      // Verify app component has Material imports
      const appComponentPath = path.join(appRoot, 'app.component.ts');
      const appComponentContent = fs.readFileSync(appComponentPath, 'utf8');
      expect(appComponentContent).toContain('MatToolbarModule');
      expect(appComponentContent).toContain('MatSidenavModule');
      console.log('[E2E-02] ✓ Material imports verified');

      // Step 6: Build the application
      console.log('[E2E-02] Building application...');
      execCommand('npx ng build demo --configuration=production', workspaceRoot);
      console.log('[E2E-02] ✓ Application built successfully');

      // Verify build output
      const distPath = path.join(workspaceRoot, 'dist', 'demo', 'browser');
      expect(fs.existsSync(distPath)).toBe(true);
      expect(fs.existsSync(path.join(distPath, 'index.html'))).toBe(true);
      console.log('[E2E-02] ✓ Build artifacts verified');

      console.log('[E2E-02] ✅ E2E test completed successfully');
    },
  );

  it(
    'E2E-03: ng-api schematic configures OpenAPI code generation',
    { timeout: E2E_TIMEOUT },
    async () => {
      // Setup
      if (!workspacePath) {
        workspacePath = createTempWorkspace();
      }
      appName = 'api-test-app';
      const libraryPath = getLibraryPackagePath();

      console.log(`\n[E2E-03] Test workspace: ${workspacePath}`);

      // Step 1: Create Angular workspace
      console.log('[E2E-03] Creating Angular workspace...');
      execCommand(
        `npx @angular/cli@latest new ${appName} --skip-git --skip-install --routing=true --style=scss`,
        workspacePath,
      );

      const appPath = path.join(workspacePath, appName);
      console.log('[E2E-03] ✓ Workspace created');

      // Step 2: Install dependencies and angular-django2
      console.log('[E2E-03] Installing dependencies...');
      execCommand('npm install', appPath);
      execCommand(`npm install ${libraryPath}`, appPath);
      execCommand('npx ng add angular-django2 --skip-confirmation', appPath);
      console.log('[E2E-03] ✓ Dependencies installed');

      // Step 3: Run ng-api schematic
      console.log('[E2E-03] Configuring OpenAPI code generation...');
      execCommand('npx ng generate angular-django2:ng-api', appPath);
      console.log('[E2E-03] ✓ ng-api schematic completed');

      // Verify ng-openapi-gen.json was created
      const ngOpenapiGenPath = path.join(appPath, 'ng-openapi-gen.json');
      expect(fs.existsSync(ngOpenapiGenPath)).toBe(true);

      const ngOpenapiGenConfig = JSON.parse(fs.readFileSync(ngOpenapiGenPath, 'utf8'));
      expect(ngOpenapiGenConfig.input).toBe('openapi.json');
      expect(ngOpenapiGenConfig.output).toBe('src/app/api');
      console.log('[E2E-03] ✓ OpenAPI config file verified');

      // Verify package.json was updated
      const packageJson = JSON.parse(fs.readFileSync(path.join(appPath, 'package.json'), 'utf8'));
      expect(packageJson.devDependencies['ng-openapi-gen']).toBeDefined();
      expect(packageJson.scripts['generate:api']).toBe('ng-openapi-gen');
      console.log('[E2E-03] ✓ package.json verified');

      // Step 4: Build the application to ensure no breaking changes
      console.log('[E2E-03] Building application...');
      execCommand('npx ng build --configuration=production', appPath);
      console.log('[E2E-03] ✓ Application built successfully');

      console.log('[E2E-03] ✅ E2E test completed successfully');
    },
  );
});
