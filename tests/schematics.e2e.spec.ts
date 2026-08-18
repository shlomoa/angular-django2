/**
 * End-to-End integration tests for angular-django2 schematics
 *
 * These tests generate real Angular applications, install schematics,
 * and verify that the generated apps can be built and run.
 */
import { spawn } from 'child_process';
import { describe, expect, it, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  cleanupTempAreas,
  createE2ETempArea,
  E2E_TEMP_AREA_PREFIX,
  DEFAULT_E2E_TIMEOUT,
  execAngularCli,
  execCommand,
  getAngularCliInvocation,
  getRepoRoot,
  isE2EDebugMode,
  type TestTempAreaHandle,
} from './utils/temp_areas';

/**
 * Helper function to get the path to the built library package
 */
function getLibraryPackagePath(): string {
  const repoRoot = getRepoRoot();
  return path.join(repoRoot, 'dist', 'angular-django2');
}

async function waitForCondition(
  condition: () => boolean,
  timeoutMs: number = 5000,
  intervalMs: number = 100,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (condition()) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return condition();
}

/**
 * Helper function to start Angular dev server and verify it responds
 * Returns the spawned process that should be killed after verification
 */
async function startAndVerifyDevServer(
  appPath: string,
  port: number = 4200,
  timeoutMs: number = 60000,
): Promise<{ stop: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const angularCli = getAngularCliInvocation();
    const serverProcess = spawn(
      angularCli.command,
      [...angularCli.args, 'serve', `--port=${port}`],
      {
        cwd: appPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );

    let serverStarted = false;
    let settled = false;
    const waitForExit = new Promise<void>((resolveExit) => {
      serverProcess.once('exit', () => resolveExit());
    });

    const timeout = setTimeout(() => {
      if (!serverStarted) {
        settled = true;
        serverProcess.kill();
        reject(new Error(`Dev server did not start within ${timeoutMs}ms`));
      }
    }, timeoutMs);

    serverProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      // Look for server ready indicators
      if (output.includes('Application bundle generation complete') || output.includes('Local:')) {
        serverStarted = true;
        clearTimeout(timeout);

        // Give it a moment to be fully ready
        setTimeout(() => {
          if (settled) {
            return;
          }

          settled = true;
          resolve({
            stop: async () => {
              if (serverProcess.exitCode !== null) {
                await waitForExit;
                return;
              }

              if (serverProcess.stdin && !serverProcess.stdin.destroyed) {
                serverProcess.stdin.write('\u0003');
                serverProcess.stdin.end();
              } else {
                serverProcess.kill();
              }

              const forceKillTimer = setTimeout(() => {
                if (serverProcess.exitCode === null) {
                  serverProcess.kill();
                }
              }, 10000);

              try {
                await waitForExit;
              } finally {
                clearTimeout(forceKillTimer);
              }
            },
          });
        }, 2000);
      }
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      // Log errors but don't fail immediately - some warnings are expected
      const error = data.toString();
      if (error.includes('error') || error.includes('Error')) {
        console.error(`[Server Error] ${error}`);
      }
    });

    serverProcess.on('error', (error: Error) => {
      clearTimeout(timeout);
      if (!settled) {
        settled = true;
        reject(error);
      }
    });

    serverProcess.on('exit', (code: number | null) => {
      clearTimeout(timeout);
      if (!settled && !serverStarted && code !== 0) {
        settled = true;
        reject(new Error(`Server process exited with code ${code}`));
      }
    });
  });
}

describe('angular-django2 schematics E2E tests', () => {
  const repoRoot = getRepoRoot();
  const debugMode = isE2EDebugMode();

  function cleanupWorkspace(tempArea: TestTempAreaHandle, testId: string): void {
    if (debugMode) {
      console.log(`[${testId}] Debug mode enabled; preserving workspace at ${tempArea.path}`);
      return;
    }

    console.log(`[${testId}] Cleaning up workspace...`);
    tempArea.cleanup();
    console.log(`[${testId}] ✓ Workspace cleaned up`);
  }

  beforeAll(() => {
    if (debugMode) {
      console.log('[E2E] Debug mode enabled; skipping stale temp area cleanup.');
    } else {
      const deletedDirectories = cleanupTempAreas(repoRoot, [E2E_TEMP_AREA_PREFIX]);

      if (deletedDirectories.length > 0) {
        console.log(
          `[E2E] Removed ${deletedDirectories.length} stale temp area(s) before starting.`,
        );
      }
    }

    // Verify that the library has been built
    const libraryPath = getLibraryPackagePath();
    if (!fs.existsSync(libraryPath)) {
      throw new Error(
        `Library not built. Run 'npm run build' before running E2E tests. Expected path: ${libraryPath}`,
      );
    }
  });

  it(
    'E2E-01: material-app schematic generates a buildable Angular application',
    { timeout: DEFAULT_E2E_TIMEOUT },
    async () => {
      // Setup
      const tempArea = createE2ETempArea(repoRoot, debugMode);
      const workspacePath = tempArea.path;
      const appName = 'test-app';
      const appPath = path.join(workspacePath, appName);
      const libraryPath = getLibraryPackagePath();

      // For executing ng new outside the workspace scope to bypass the CLI workspace check
      const parentDir = path.dirname(repoRoot);
      const relativeDirectory = path.relative(parentDir, appPath);

      console.log(`\n[E2E-01] Test workspace: ${workspacePath}`);
      console.log(`[E2E-01] Library path: ${libraryPath}`);

      let server: { stop: () => Promise<void> } | null = null;

      try {
        // Step 1: Create a new Angular workspace using Angular CLI
        console.log('[E2E-01] Creating Angular workspace...');
        execAngularCli(
          [
            'new',
            appName,
            `--directory=${relativeDirectory}`,
            '--skip-git',
            '--skip-install',
            '--routing=true',
            '--style=scss',
            '--standalone=true',
            '--defaults',
          ],
          parentDir,
        );

        expect(fs.existsSync(appPath)).toBe(true);
        console.log('[E2E-01] ✓ Angular workspace created');

        // Step 2: Install dependencies
        console.log('[E2E-01] Installing dependencies...');
        execCommand('npm install', appPath);
        console.log('[E2E-01] ✓ Dependencies installed');

        // Step 3: Install angular-django2 from the built library
        console.log('[E2E-01] Installing angular-django2 library...');
        execCommand(`npm install "${libraryPath}"`, appPath);

        // Verify angular-django2 is in package.json
        const packageJsonPath = path.join(appPath, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        expect(packageJson.dependencies['angular-django2']).toBeDefined();
        console.log('[E2E-01] ✓ angular-django2 library installed');

        // Step 4: Run ng add angular-django2
        console.log('[E2E-01] Running ng add angular-django2...');
        execAngularCli(['add', 'angular-django2', '--skip-confirmation'], appPath);

        // Verify ng-add registered the collection
        const angularJsonPath = path.join(appPath, 'angular.json');
        const angularJson = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8'));
        expect(angularJson.cli?.schematicCollections).toContain('angular-django2');
        console.log('[E2E-01] ✓ ng add angular-django2 completed');

        // Step 5: Configure Angular Material
        console.log('[E2E-01] Configuring Material UI...');

        // Install Material dependencies first (including animations which is required)
        execCommand('npm install @angular/material @angular/cdk @angular/animations', appPath);

        // Run material-setup schematic
        execAngularCli(
          [
            'generate',
            'angular-django2:material-setup',
            '--project=test-app',
            '--theme=indigo-pink',
            '--typography=true',
            '--animations=true',
          ],
          appPath,
        );
        console.log('[E2E-01] ✓ Material UI configured');

        // Step 6: Create project structure
        console.log('[E2E-01] Creating project structure...');
        execAngularCli(
          ['generate', 'angular-django2:project-structure', '--project=test-app', '--prefix=app'],
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
        const buildOutput = execAngularCli(['build', '--configuration=production'], appPath);
        expect(buildOutput).toBeTruthy();
        console.log('[E2E-01] ✓ Application built successfully');

        // Verify build output exists
        const distPath = path.join(appPath, 'dist', appName, 'browser');
        expect(fs.existsSync(distPath)).toBe(true);
        expect(fs.existsSync(path.join(distPath, 'index.html'))).toBe(true);
        console.log('[E2E-01] ✓ Build artifacts verified');

        // Step 8: Run tests (if they exist and pass)
        console.log(
          '[E2E-01] Skipping browser-based ng test step to keep E2E validation OS agnostic',
        );

        // Step 9: Start dev server and verify it runs
        console.log('[E2E-01] Starting dev server...');
        server = await startAndVerifyDevServer(appPath, 4201, 90000); // 90 second timeout
        console.log('[E2E-01] ✓ Dev server started and is responding');
      } catch (error) {
        console.error('[E2E-01] ✗ Dev server failed to start:', error);
        throw error;
      } finally {
        if (server) {
          console.log('[E2E-01] Stopping dev server...');
          await server.stop();
          console.log('[E2E-01] ✓ Dev server stopped');
        }

        cleanupWorkspace(tempArea, 'E2E-01');
      }

      console.log('[E2E-01] ✅ E2E test completed successfully');
    },
  );

  it(
    'E2E-02: workspace-setup and material-app generate a complete buildable application',
    { timeout: DEFAULT_E2E_TIMEOUT },
    async () => {
      // Setup
      const tempArea = createE2ETempArea(repoRoot, debugMode);
      const workspacePath = tempArea.path;
      const appName = 'combined-app';
      const workspaceRoot = path.join(workspacePath, appName);
      const libraryPath = getLibraryPackagePath();

      // For executing ng new outside the workspace scope to bypass the CLI workspace check
      const parentDir = path.dirname(repoRoot);
      const relativeDirectory = path.relative(parentDir, workspaceRoot);

      console.log(`\n[E2E-02] Test workspace: ${workspacePath}`);

      try {
        // Step 1: Create a minimal workspace with ng new (no application)
        console.log('[E2E-02] Creating minimal Angular workspace...');
        execAngularCli(
          [
            'new',
            appName,
            `--directory=${relativeDirectory}`,
            '--skip-git',
            '--skip-install',
            '--create-application=false',
            '--defaults',
          ],
          parentDir,
        );

        expect(fs.existsSync(workspaceRoot)).toBe(true);
        console.log('[E2E-02] ✓ Workspace created');

        // Step 2: Install dependencies
        console.log('[E2E-02] Installing dependencies...');
        execCommand('npm install', workspaceRoot);
        console.log('[E2E-02] ✓ Dependencies installed');

        // Step 3: Install angular-django2
        console.log('[E2E-02] Installing angular-django2 library...');
        execCommand(`npm install "${libraryPath}"`, workspaceRoot);
        execAngularCli(['add', 'angular-django2', '--skip-confirmation'], workspaceRoot);
        console.log('[E2E-02] ✓ angular-django2 installed');

        // Step 4: Bootstrap workspace-level files
        console.log('[E2E-02] Bootstrapping workspace files with workspace-setup...');
        execAngularCli(['generate', 'angular-django2:workspace-setup', 'demo'], workspaceRoot);
        console.log('[E2E-02] ✓ workspace-setup schematic completed');

        // Verify workspace bootstrap files
        const workspaceReadmePath = path.join(workspaceRoot, 'README.md');
        const copilotInstructionsPath = path.join(
          workspaceRoot,
          '.github',
          'copilot-instructions.md',
        );
        expect(fs.existsSync(workspaceReadmePath)).toBe(true);
        expect(fs.existsSync(copilotInstructionsPath)).toBe(true);
        expect(fs.readFileSync(workspaceReadmePath, 'utf8')).toContain('angular-django2');
        expect(fs.readFileSync(copilotInstructionsPath, 'utf8')).toContain(
          '# demo Repo Instructions',
        );
        console.log('[E2E-02] ✓ Workspace bootstrap files verified');

        // Step 5: Use material-app schematic to generate complete application
        console.log('[E2E-02] Generating application with material-app schematic...');
        execAngularCli(
          [
            'generate',
            'angular-django2:material-app',
            'demo',
            '--theme=indigo-pink',
            '--typography=true',
            '--animations=true',
            '--routing=true',
            '--standalone=true',
            '--ssr=false',
            '--zoneless=true',
            '--defaults',
            '--style=scss',
            '--prefix=app',
          ],
          workspaceRoot,
        );
        console.log('[E2E-02] ✓ material-app schematic completed');

        // Step 6: Install Material dependencies (material-app adds them to package.json)
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
        // Angular 21+ uses app.ts, older versions use app.component.ts
        const appComponentPath = fs.existsSync(path.join(appRoot, 'app.ts'))
          ? path.join(appRoot, 'app.ts')
          : path.join(appRoot, 'app.component.ts');
        const appComponentContent = fs.readFileSync(appComponentPath, 'utf8');
        expect(appComponentContent).toContain('MatToolbarModule');
        expect(appComponentContent).toContain('MatSidenavModule');
        console.log('[E2E-02] ✓ Material imports verified');

        const indexHtmlContent = fs.readFileSync(
          path.join(workspaceRoot, 'projects', 'demo', 'src', 'index.html'),
          'utf8',
        );
        expect(indexHtmlContent).toContain(
          '<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />',
        );
        console.log('[E2E-02] ✓ Material Icons stylesheet verified');

        // Step 7: Build the application
        console.log('[E2E-02] Building application...');
        execAngularCli(['build', 'demo', '--configuration=production'], workspaceRoot);
        console.log('[E2E-02] ✓ Application built successfully');

        // Verify build output
        const distPath = path.join(workspaceRoot, 'dist', 'demo', 'browser');
        expect(fs.existsSync(distPath)).toBe(true);
        expect(fs.existsSync(path.join(distPath, 'index.html'))).toBe(true);
        console.log('[E2E-02] ✓ Build artifacts verified');

        console.log('[E2E-02] ✅ E2E test completed successfully');
      } finally {
        cleanupWorkspace(tempArea, 'E2E-02');
      }
    },
  );

  it(
    'E2E-03: openapi-setup schematic configures OpenAPI code generation',
    { timeout: DEFAULT_E2E_TIMEOUT },
    async () => {
      // Setup
      const tempArea = createE2ETempArea(repoRoot, debugMode);
      const workspacePath = tempArea.path;
      const appName = 'api-test-app';
      const appPath = path.join(workspacePath, appName);
      const libraryPath = getLibraryPackagePath();

      // For executing ng new outside the workspace scope to bypass the CLI workspace check
      const parentDir = path.dirname(repoRoot);
      const relativeDirectory = path.relative(parentDir, appPath);

      console.log(`\n[E2E-03] Test workspace: ${workspacePath}`);

      try {
        // Step 1: Create Angular workspace
        console.log('[E2E-03] Creating Angular workspace...');
        execAngularCli(
          [
            'new',
            appName,
            `--directory=${relativeDirectory}`,
            '--skip-git',
            '--skip-install',
            '--routing=true',
            '--style=scss',
            '--defaults',
          ],
          parentDir,
        );

        console.log('[E2E-03] ✓ Workspace created');

        // Step 2: Install dependencies and angular-django2
        console.log('[E2E-03] Installing dependencies...');
        execCommand('npm install', appPath);
        execCommand(`npm install "${libraryPath}"`, appPath);
        execAngularCli(['add', 'angular-django2', '--skip-confirmation'], appPath);
        console.log('[E2E-03] ✓ Dependencies installed');

        // Step 3: Run openapi-setup schematic
        console.log('[E2E-03] Configuring OpenAPI code generation...');
        execAngularCli(['generate', 'angular-django2:openapi-setup'], appPath);
        console.log('[E2E-03] ✓ openapi-setup schematic completed');

        // Verify ng-openapi-gen.json was created
        const ngOpenapiGenPath = path.join(appPath, 'ng-openapi-gen.json');
        const configCreated = await waitForCondition(() => fs.existsSync(ngOpenapiGenPath));

        if (!configCreated) {
          throw new Error(
            `Expected ng-openapi-gen configuration at ${ngOpenapiGenPath}, but it was not created.`,
          );
        }

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
        execAngularCli(['build', '--configuration=production'], appPath);
        console.log('[E2E-03] ✓ Application built successfully');

        console.log('[E2E-03] ✅ E2E test completed successfully');
      } finally {
        cleanupWorkspace(tempArea, 'E2E-03');
      }
    },
  );

  it(
    'E2E-04: component hooks and embed-component wire a child into a parent in a buildable app',
    { timeout: DEFAULT_E2E_TIMEOUT },
    async () => {
      // Setup
      const tempArea = createE2ETempArea(repoRoot, debugMode);
      const workspacePath = tempArea.path;
      const appName = 'embed-test-app';
      const appPath = path.join(workspacePath, appName);
      const libraryPath = getLibraryPackagePath();

      // For executing ng new outside the workspace scope to bypass the CLI workspace check
      const parentDir = path.dirname(repoRoot);
      const relativeDirectory = path.relative(parentDir, appPath);

      console.log(`\n[E2E-04] Test workspace: ${workspacePath}`);

      try {
        // Step 1: Create Angular workspace with a default application
        console.log('[E2E-04] Creating Angular workspace...');
        execAngularCli(
          [
            'new',
            appName,
            `--directory=${relativeDirectory}`,
            '--skip-git',
            '--skip-install',
            '--routing=false',
            '--style=scss',
            '--defaults',
          ],
          parentDir,
        );
        console.log('[E2E-04] ✓ Workspace created');

        // Step 2: Install dependencies and angular-django2
        console.log('[E2E-04] Installing dependencies...');
        execCommand('npm install', appPath);
        execCommand(`npm install "${libraryPath}"`, appPath);
        execAngularCli(['add', 'angular-django2', '--skip-confirmation'], appPath);
        console.log('[E2E-04] ✓ Dependencies installed');

        // Step 3: Generate two components with embedding hooks
        console.log('[E2E-04] Generating components...');
        execAngularCli(['generate', 'angular-django2:component', 'hero-card'], appPath);
        execAngularCli(['generate', 'angular-django2:component', 'dashboard'], appPath);
        console.log('[E2E-04] ✓ Components generated');

        const appRoot = path.join(appPath, 'src', 'app');
        const childTsPath = path.join(appRoot, 'hero-card', 'hero-card.ts');
        const childHtmlPath = path.join(appRoot, 'hero-card', 'hero-card.html');
        const parentTsPath = path.join(appRoot, 'dashboard', 'dashboard.ts');
        const parentHtmlPath = path.join(appRoot, 'dashboard', 'dashboard.html');

        // Verify the generated component includes the embedding hooks
        const childTsInitial = fs.readFileSync(childTsPath, 'utf8');
        expect(childTsInitial).toContain('// Begin import section');
        expect(childTsInitial).toContain('// Begin injected services section');
        expect(childTsInitial).toContain('// Begin input signals section');
        expect(childTsInitial).toContain('// Begin output signals section');
        expect(fs.readFileSync(childHtmlPath, 'utf8')).toContain('<!-- Begin children section -->');
        console.log('[E2E-04] ✓ Component hooks verified');

        // Step 4: Add input/output signals to the child inside its marked sections
        const childTsWithSignals = childTsInitial
          .replace(
            '// End import section',
            "import { input, output } from '@angular/core';\n// End import section",
          )
          .replace(
            '  // End input signals section',
            '  readonly title = input<string>();\n  // End input signals section',
          )
          .replace(
            '  // End output signals section',
            '  readonly selected = output<string>();\n  // End output signals section',
          );
        fs.writeFileSync(childTsPath, childTsWithSignals);

        // Step 5: Embed the child into the parent
        console.log('[E2E-04] Embedding hero-card into dashboard...');
        execAngularCli(
          [
            'generate',
            'angular-django2:embed-component',
            '--component=src/app/hero-card/hero-card.ts',
            '--parent=src/app/dashboard/dashboard.ts',
          ],
          appPath,
        );
        console.log('[E2E-04] ✓ embed-component schematic completed');

        // Verify the parent TypeScript wiring
        const parentTs = fs.readFileSync(parentTsPath, 'utf8');
        expect(parentTs).toContain("import { HeroCard } from '../hero-card/hero-card';");
        expect(parentTs).toContain('imports: [HeroCard]');
        expect(parentTs).toContain('onSelected($event: unknown): void {');
        expect(parentTs).toContain("throw new Error('onSelected is not implemented');");

        // Verify the parent template wiring
        const parentHtml = fs.readFileSync(parentHtmlPath, 'utf8');
        expect(parentHtml).toContain(
          '<app-hero-card [title]="undefined" (selected)="onSelected($event)"></app-hero-card>',
        );
        console.log('[E2E-04] ✓ Parent wiring verified');

        // Step 6: Embed the dashboard into the root app component and build
        const appComponentPath = fs.existsSync(path.join(appRoot, 'app.ts'))
          ? path.join(appRoot, 'app.ts')
          : path.join(appRoot, 'app.component.ts');
        const appComponentHtmlPath = fs.existsSync(path.join(appRoot, 'app.html'))
          ? path.join(appRoot, 'app.html')
          : path.join(appRoot, 'app.component.html');
        const appComponentRelTs = path.relative(appPath, appComponentPath).replace(/\\/g, '/');

        execAngularCli(
          [
            'generate',
            'angular-django2:embed-component',
            '--component=src/app/dashboard/dashboard.ts',
            `--parent=${appComponentRelTs}`,
          ],
          appPath,
        );

        expect(fs.readFileSync(appComponentPath, 'utf8')).toContain('imports: [Dashboard]');
        expect(fs.readFileSync(appComponentHtmlPath, 'utf8')).toContain('<app-dashboard>');
        console.log('[E2E-04] ✓ Dashboard embedded into root app component');

        console.log('[E2E-04] Building application...');
        execAngularCli(['build', '--configuration=production'], appPath);
        console.log('[E2E-04] ✓ Application built successfully');

        console.log('[E2E-04] ✅ E2E test completed successfully');
      } finally {
        cleanupWorkspace(tempArea, 'E2E-04');
      }
    },
  );

  it(
    'E2E-05: embed-component wires an Angular Material component into a parent in a buildable app',
    { timeout: DEFAULT_E2E_TIMEOUT },
    async () => {
      // Setup
      const tempArea = createE2ETempArea(repoRoot, debugMode);
      const workspacePath = tempArea.path;
      const appName = 'embed-material-app';
      const appPath = path.join(workspacePath, appName);
      const libraryPath = getLibraryPackagePath();

      // For executing ng new outside the workspace scope to bypass the CLI workspace check
      const parentDir = path.dirname(repoRoot);
      const relativeDirectory = path.relative(parentDir, appPath);

      console.log(`\n[E2E-05] Test workspace: ${workspacePath}`);

      try {
        // Step 1: Create Angular workspace with a default application
        console.log('[E2E-05] Creating Angular workspace...');
        execAngularCli(
          [
            'new',
            appName,
            `--directory=${relativeDirectory}`,
            '--skip-git',
            '--skip-install',
            '--routing=false',
            '--style=scss',
            '--defaults',
          ],
          parentDir,
        );
        console.log('[E2E-05] ✓ Workspace created');

        // Step 2: Install dependencies, Angular Material, and angular-django2
        console.log('[E2E-05] Installing dependencies...');
        execCommand('npm install', appPath);
        execCommand('npm install @angular/material @angular/cdk', appPath);
        execCommand(`npm install "${libraryPath}"`, appPath);
        execAngularCli(['add', 'angular-django2', '--skip-confirmation'], appPath);
        console.log('[E2E-05] ✓ Dependencies installed');

        // Step 3: Generate a parent component with embedding hooks
        console.log('[E2E-05] Generating parent component...');
        execAngularCli(['generate', 'angular-django2:component', 'scheduler'], appPath);
        console.log('[E2E-05] ✓ Component generated');

        const appRoot = path.join(appPath, 'src', 'app');
        const parentTsPath = path.join(appRoot, 'scheduler', 'scheduler.ts');
        const parentHtmlPath = path.join(appRoot, 'scheduler', 'scheduler.html');

        // Step 4: Embed the existing Angular Material MatDateRangePicker into the
        // parent. This is "package mode": the component is imported from a
        // package rather than a local file, but the parent wiring is identical.
        console.log('[E2E-05] Embedding MatDateRangePicker into scheduler...');
        execAngularCli(
          [
            'generate',
            'angular-django2:embed-component',
            '--component=MatDateRangePicker',
            '--parent=src/app/scheduler/scheduler.ts',
            '--from=@angular/material/datepicker',
            '--selector=mat-date-range-picker',
            '--outputs=opened,closed',
          ],
          appPath,
        );
        console.log('[E2E-05] ✓ embed-component schematic completed');

        // Verify the parent TypeScript wiring
        const parentTs = fs.readFileSync(parentTsPath, 'utf8');
        expect(parentTs).toContain(
          "import { MatDateRangePicker } from '@angular/material/datepicker';",
        );
        expect(parentTs).toContain('imports: [MatDateRangePicker]');
        expect(parentTs).toContain('onOpened($event: unknown): void {');
        expect(parentTs).toContain("throw new Error('onOpened is not implemented');");
        expect(parentTs).toContain('onClosed($event: unknown): void {');

        // Verify the parent template wiring. `ng generate` may run the
        // workspace formatter, which can wrap the long element across multiple
        // lines, so assert on the individual bindings rather than an exact
        // single-line string.
        const parentHtml = fs.readFileSync(parentHtmlPath, 'utf8');
        expect(parentHtml).toContain('<mat-date-range-picker');
        expect(parentHtml).toContain('(opened)="onOpened($event)"');
        expect(parentHtml).toContain('(closed)="onClosed($event)"');
        expect(parentHtml.indexOf('<!-- Begin children section -->')).toBeLessThan(
          parentHtml.indexOf('<mat-date-range-picker'),
        );
        console.log('[E2E-05] ✓ Parent wiring verified');

        // Step 5: Embed the scheduler into the root app component and build.
        const appComponentPath = fs.existsSync(path.join(appRoot, 'app.ts'))
          ? path.join(appRoot, 'app.ts')
          : path.join(appRoot, 'app.component.ts');
        const appComponentHtmlPath = fs.existsSync(path.join(appRoot, 'app.html'))
          ? path.join(appRoot, 'app.html')
          : path.join(appRoot, 'app.component.html');
        const appComponentRelTs = path.relative(appPath, appComponentPath).replace(/\\/g, '/');

        execAngularCli(
          [
            'generate',
            'angular-django2:embed-component',
            '--component=src/app/scheduler/scheduler.ts',
            `--parent=${appComponentRelTs}`,
          ],
          appPath,
        );

        expect(fs.readFileSync(appComponentPath, 'utf8')).toContain('imports: [Scheduler]');
        expect(fs.readFileSync(appComponentHtmlPath, 'utf8')).toContain('<app-scheduler>');
        console.log('[E2E-05] ✓ Scheduler embedded into root app component');

        console.log('[E2E-05] Building application...');
        execAngularCli(['build', '--configuration=production'], appPath);
        console.log('[E2E-05] ✓ Application built successfully');

        console.log('[E2E-05] ✅ E2E test completed successfully');
      } finally {
        cleanupWorkspace(tempArea, 'E2E-05');
      }
    },
  );

  it(
    'E2E-06: complex-component create, modify, and delete flows build in development mode',
    { timeout: DEFAULT_E2E_TIMEOUT },
    async () => {
      const tempArea = createE2ETempArea(repoRoot, debugMode);
      const workspacePath = tempArea.path;
      const appName = 'complex-component-app';
      const appPath = path.join(workspacePath, appName);
      const libraryPath = getLibraryPackagePath();
      const parentDir = path.dirname(repoRoot);
      const relativeDirectory = path.relative(parentDir, appPath);

      try {
        execAngularCli(
          [
            'new',
            appName,
            `--directory=${relativeDirectory}`,
            '--skip-git',
            '--skip-install',
            '--routing=false',
            '--style=scss',
            '--defaults',
          ],
          parentDir,
        );
        execCommand('npm install', appPath);
        execCommand('npm install @angular/material @angular/cdk', appPath);
        execCommand(`npm install "${libraryPath}"`, appPath);
        execAngularCli(['add', 'angular-django2', '--skip-confirmation'], appPath);

        execAngularCli(
          [
            'generate',
            'angular-django2:complex-component',
            'dashboard-card',
            '--path=src/app/features',
            '--features=mixins,nested,projection,cdk-overlay',
          ],
          appPath,
        );
        execAngularCli(['build', '--configuration=development'], appPath);

        execAngularCli(
          [
            'generate',
            'angular-django2:complex-component',
            'dashboard-card',
            '--path=src/app/features',
            '--features=projection,nested',
            '--mode=modify',
          ],
          appPath,
        );
        execAngularCli(['build', '--configuration=development'], appPath);

        execAngularCli(
          [
            'generate',
            'angular-django2:complex-component',
            'dashboard-card',
            '--path=src/app/features',
            '--features=mixins',
            '--mode=delete',
            '--confirm=true',
          ],
          appPath,
        );
        execAngularCli(['build', '--configuration=development'], appPath);
      } finally {
        cleanupWorkspace(tempArea, 'E2E-06');
      }
    },
  );

  it(
    'E2E-07: field-component and form-field generate in a buildable application',
    { timeout: DEFAULT_E2E_TIMEOUT },
    async () => {
      const tempArea = createE2ETempArea(repoRoot, debugMode);
      const workspacePath = tempArea.path;
      const appName = 'form-controls-app';
      const appPath = path.join(workspacePath, appName);
      const libraryPath = getLibraryPackagePath();
      const parentDir = path.dirname(repoRoot);
      const relativeDirectory = path.relative(parentDir, appPath);

      try {
        execAngularCli(
          [
            'new',
            appName,
            `--directory=${relativeDirectory}`,
            '--skip-git',
            '--skip-install',
            '--routing=false',
            '--style=scss',
            '--defaults',
          ],
          parentDir,
        );
        execCommand('npm install', appPath);
        execCommand('npm install @angular/material @angular/cdk', appPath);
        execCommand(`npm install "${libraryPath}"`, appPath);
        execAngularCli(['add', 'angular-django2', '--skip-confirmation'], appPath);
        for (const kind of ['text', 'email', 'password', 'textarea']) {
          execAngularCli(
            ['generate', 'angular-django2:field-component', `${kind}-field`, `--kind=${kind}`],
            appPath,
          );
        }

        execAngularCli(
          ['generate', 'angular-django2:form-field', 'email-form', '--control-type=email'],
          appPath,
        );

        const appRoot = path.join(appPath, 'src', 'app');
        const rootComponentPath = fs.existsSync(path.join(appRoot, 'app.ts'))
          ? path.join(appRoot, 'app.ts')
          : path.join(appRoot, 'app.component.ts');
        const rootTemplatePath = fs.existsSync(path.join(appRoot, 'app.html'))
          ? path.join(appRoot, 'app.html')
          : path.join(appRoot, 'app.component.html');
        const rootTemplateName = path.basename(rootTemplatePath);

        fs.writeFileSync(
          rootComponentPath,
          `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmailFormFieldComponent } from './shared/form-helpers/email-form-field/email-form-field';
import { TextFieldComponent } from './shared/form-helpers/text-field/text-field';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, EmailFormFieldComponent, TextFieldComponent],
  templateUrl: './${rootTemplateName}',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly text = new FormControl<string>('', { nonNullable: true });
  readonly email = new FormControl<string | null>('', [Validators.email, Validators.required]);
  readonly serverErrors = ['The server rejected this address.'];

  constructor() {
    this.email.markAsTouched();
    this.email.disable();
  }
}
`,
        );
        fs.writeFileSync(
          rootTemplatePath,
          `<app-text-field [formControl]="text" label="Text"></app-text-field>
<app-email-form-field
  [formControl]="email"
  fieldId="account-email"
  label="Email"
  hint="Used for account notices"
  [serverErrors]="serverErrors"
></app-email-form-field>
`,
        );

        const generatedField = fs.readFileSync(
          path.join(appRoot, 'shared', 'form-helpers', 'email-form-field', 'email-form-field.ts'),
          'utf8',
        );
        expect(generatedField).toContain('implements ControlValueAccessor');
        expect(generatedField).toContain('setDisabledState(disabled: boolean)');
        expect(fs.readFileSync(rootTemplatePath, 'utf8')).toContain('[formControl]="text"');
        expect(fs.readFileSync(rootTemplatePath, 'utf8')).toContain('[formControl]="email"');
        execAngularCli(['build', '--configuration=development'], appPath);
      } finally {
        cleanupWorkspace(tempArea, 'E2E-07');
      }
    },
  );

  it(
    'E2E-08: reactive-form generates a buildable Angular Material form',
    { timeout: DEFAULT_E2E_TIMEOUT },
    async () => {
      const tempArea = createE2ETempArea(repoRoot, debugMode);
      const workspacePath = tempArea.path;
      const appName = 'reactive-form-app';
      const appPath = path.join(workspacePath, appName);
      const libraryPath = getLibraryPackagePath();
      const parentDir = path.dirname(repoRoot);
      const relativeDirectory = path.relative(parentDir, appPath);

      try {
        execAngularCli(
          [
            'new',
            appName,
            `--directory=${relativeDirectory}`,
            '--skip-git',
            '--skip-install',
            '--routing=false',
            '--style=scss',
            '--defaults',
          ],
          parentDir,
        );
        execCommand('npm install', appPath);
        execCommand('npm install @angular/material @angular/cdk', appPath);
        execCommand(`npm install "${libraryPath}"`, appPath);
        execAngularCli(['add', 'angular-django2', '--skip-confirmation'], appPath);

        // Canonical and façade-generated primitives share the canonical contract.
        execAngularCli(
          ['generate', 'angular-django2:form-field', 'email', '--control-type=email'],
          appPath,
        );
        execAngularCli(
          ['generate', 'angular-django2:field-component', 'notes', '--kind=textarea'],
          appPath,
        );

        fs.writeFileSync(
          path.join(appPath, 'contact-form.json'),
          `${JSON.stringify(
            {
              title: 'Create contact',
              endpoint: '/api/contacts/',
              submitLabel: 'Create contact',
              fields: [
                {
                  name: 'email',
                  label: 'Email',
                  control: 'email',
                  required: true,
                  autocomplete: 'email',
                },
                {
                  name: 'fullName',
                  label: 'Full name',
                  control: 'text',
                  initialValue: 'Jane Doe',
                  validators: [
                    { type: 'required' },
                    { type: 'minLength', value: 2 },
                    { type: 'maxLength', value: 120 },
                    { type: 'pattern', value: '^[A-Za-z .-]+$' },
                  ],
                },
                {
                  name: 'headcount',
                  label: 'Headcount',
                  control: 'number',
                  initialValue: 1,
                  validators: [
                    { type: 'min', value: 1 },
                    { type: 'max', value: 500 },
                  ],
                },
                { name: 'notes', label: 'Notes', control: 'textarea', hint: 'Optional context' },
              ],
            },
            null,
            2,
          )}\n`,
        );

        execAngularCli(
          [
            'generate',
            'angular-django2:reactive-form',
            'contact',
            '--definition=contact-form.json',
          ],
          appPath,
        );

        const appRoot = path.join(appPath, 'src', 'app');
        const formDirectory = path.join(appRoot, 'features', 'contact-form');
        const generatedComponent = fs.readFileSync(
          path.join(formDirectory, 'contact-form.ts'),
          'utf8',
        );
        const generatedTemplate = fs.readFileSync(
          path.join(formDirectory, 'contact-form.html'),
          'utf8',
        );

        expect(generatedComponent).toContain('changeDetection: ChangeDetectionStrategy.OnPush');
        expect(generatedComponent).toContain('export interface ContactFormPayload {');
        expect(generatedComponent).toContain('readonly submitted = output<ContactFormPayload>();');
        expect(generatedComponent).toContain('private readonly formBuilder = inject(FormBuilder);');
        expect(generatedComponent).toContain('readonly form = this.formBuilder.group({');
        expect(generatedComponent).toContain("  fullName: 'Jane Doe',");
        expect(generatedComponent).toContain('this.form.reset(INITIAL_VALUES);');
        expect(generatedComponent).toContain('Validators.minLength(2)');
        expect(generatedComponent).toContain(
          'headcount: this.formBuilder.control<number | null>(1, [Validators.min(1), Validators.max(500)]),',
        );
        expect(generatedComponent).toContain(
          "import { EmailFieldComponent } from '../../shared/form-helpers/email-field/email-field';",
        );
        expect(generatedComponent).toContain(
          "import { NotesFieldComponent } from '../../shared/form-helpers/notes-field/notes-field';",
        );
        expect(generatedTemplate).toContain('<app-email-field');
        expect(generatedTemplate).toContain('<app-notes-field');
        expect(generatedTemplate).toContain('[serverErrors]="serverErrors(\'notes\')"');
        expect(generatedTemplate).toContain('formControlName="fullName"');
        expect(generatedTemplate).toContain('[attr.aria-busy]="submitting()"');

        // The schematic is create-only: a rerun must not touch existing output.
        execAngularCli(
          [
            'generate',
            'angular-django2:reactive-form',
            'contact',
            '--definition=contact-form.json',
          ],
          appPath,
        );
        expect(fs.readFileSync(path.join(formDirectory, 'contact-form.ts'), 'utf8')).toBe(
          generatedComponent,
        );

        const rootComponentPath = fs.existsSync(path.join(appRoot, 'app.ts'))
          ? path.join(appRoot, 'app.ts')
          : path.join(appRoot, 'app.component.ts');
        const rootTemplatePath = fs.existsSync(path.join(appRoot, 'app.html'))
          ? path.join(appRoot, 'app.html')
          : path.join(appRoot, 'app.component.html');
        const rootTemplateName = path.basename(rootTemplatePath);

        fs.writeFileSync(
          rootComponentPath,
          `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ContactFormComponent } from './features/contact-form/contact-form';
import type { ContactFormPayload } from './features/contact-form/contact-form';

@Component({
  selector: 'app-root',
  imports: [ContactFormComponent],
  templateUrl: './${rootTemplateName}',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  onSubmitted(payload: ContactFormPayload): void {
    console.log(payload.email);
  }
}
`,
        );
        fs.writeFileSync(
          rootTemplatePath,
          `<app-contact-form (submitted)="onSubmitted($event)"></app-contact-form>\n`,
        );

        execAngularCli(['build', '--configuration=development'], appPath);
      } finally {
        cleanupWorkspace(tempArea, 'E2E-08');
      }
    },
  );

  it(
    'E2E-09: page generates a lazy Angular Material route that builds in development mode',
    { timeout: DEFAULT_E2E_TIMEOUT },
    async () => {
      const tempArea = createE2ETempArea(repoRoot, debugMode);
      const workspacePath = tempArea.path;
      const appName = 'page-app';
      const appPath = path.join(workspacePath, appName);
      const libraryPath = getLibraryPackagePath();
      const parentDir = path.dirname(repoRoot);
      const relativeDirectory = path.relative(parentDir, appPath);

      try {
        execAngularCli(
          [
            'new',
            appName,
            `--directory=${relativeDirectory}`,
            '--skip-git',
            '--skip-install',
            '--routing',
            '--style=scss',
            '--defaults',
          ],
          parentDir,
        );
        execCommand('npm install', appPath);
        execCommand('npm install @angular/material @angular/cdk', appPath);
        execCommand(`npm install "${libraryPath}"`, appPath);
        execAngularCli(['add', 'angular-django2', '--skip-confirmation'], appPath);
        execAngularCli(
          [
            'generate',
            'angular-django2:page',
            'orders',
            '--path=src/app/features/orders',
            '--navigation-label=Orders',
            '--navigation-icon=shopping_cart',
          ],
          appPath,
        );

        const appRoot = path.join(appPath, 'src', 'app');
        const pageRoute = fs.readFileSync(
          path.join(appRoot, 'features', 'orders', 'orders.page.routes.ts'),
          'utf8',
        );
        expect(pageRoute).toContain('loadComponent');
        expect(pageRoute).toContain("path: 'orders'");
        expect(pageRoute).toContain("navigation: { label: 'Orders', icon: 'shopping_cart' }");
        execAngularCli(['build', '--configuration=development'], appPath);
      } finally {
        cleanupWorkspace(tempArea, 'E2E-09');
      }
    },
  );

  it(
    'E2E-10: site assembles an OpenUI Material shell, routes, forms, and OpenAPI setup that builds',
    { timeout: DEFAULT_E2E_TIMEOUT },
    async () => {
      const tempArea = createE2ETempArea(repoRoot, debugMode);
      const workspacePath = tempArea.path;
      const appName = 'site-app';
      const appPath = path.join(workspacePath, appName);
      const libraryPath = getLibraryPackagePath();
      const parentDir = path.dirname(repoRoot);
      const relativeDirectory = path.relative(parentDir, appPath);

      try {
        execAngularCli(
          [
            'new',
            appName,
            `--directory=${relativeDirectory}`,
            '--skip-git',
            '--skip-install',
            '--routing',
            '--style=scss',
            '--defaults',
          ],
          parentDir,
        );
        execCommand('npm install', appPath);
        execCommand(`npm install "${libraryPath}"`, appPath);
        execAngularCli(['add', 'angular-django2', '--skip-confirmation'], appPath);
        execAngularCli(
          ['generate', 'angular-django2:material-app', appName, '--ssr=false', '--defaults'],
          appPath,
        );

        const appRoot = path.join(appPath, 'src', 'app');
        const openuiDirectory = path.join(appRoot, 'openui');
        fs.mkdirSync(openuiDirectory, { recursive: true });
        fs.writeFileSync(
          path.join(openuiDirectory, 'contact-form.json'),
          JSON.stringify({
            title: 'Contact',
            endpoint: '/api/contact/',
            fields: [{ name: 'email', label: 'Email', control: 'email', required: true }],
          }),
        );
        fs.writeFileSync(
          path.join(openuiDirectory, 'site.json'),
          JSON.stringify({
            pages: [
              {
                name: 'contact',
                navigation: { id: 'contact', label: 'Contact', icon: 'mail' },
              },
            ],
            forms: [{ name: 'contact', definition: 'src/app/openui/contact-form.json' }],
            openapi: { spec: 'openapi.json' },
          }),
        );
        fs.writeFileSync(path.join(appPath, 'openapi.json'), JSON.stringify({ openapi: '3.0.0' }));

        execAngularCli(
          [
            'generate',
            'angular-django2:site',
            `--project=${appName}`,
            '--source=src/app/openui/site.json',
          ],
          appPath,
        );

        expect(fs.existsSync(path.join(appRoot, 'features', 'contact', 'contact-page.ts'))).toBe(
          true,
        );
        expect(
          fs.existsSync(path.join(appRoot, 'features', 'contact-form', 'contact-form.ts')),
        ).toBe(true);
        expect(fs.readFileSync(path.join(appRoot, 'app.html'), 'utf8')).toContain(
          'routerLink="/contact"',
        );
        expect(fs.readFileSync(path.join(appRoot, 'app.config.ts'), 'utf8')).toContain(
          'withXsrfConfiguration',
        );
        execAngularCli(['build', '--configuration=development'], appPath);
      } finally {
        cleanupWorkspace(tempArea, 'E2E-10');
      }
    },
  );
});
