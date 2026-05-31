import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { withTempArea } from './utils/temp_areas';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const angularDjango2PackagePath = path.resolve(
  repoRoot,
  '..',
  'angular-django2',
  'dist',
  'angular-django2',
);
const E2E_TIMEOUT = 5 * 60 * 1000;

function execCommand(command: string, cwd: string): string {
  return execSync(command, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 10 * 1024 * 1024,
  });
}

describe('angular-django2 application schematic', () => {
  it(
    'generates and builds the Angular app scaffold for my-app in a temp area',
    { timeout: E2E_TIMEOUT },
    async () => {
      await withTempArea(
        (tempArea) => {
          const workspaceName = `validation-workspace-${Date.now().toString(36)}`;
          const workspaceRoot = path.join(tempArea.path, workspaceName);

          expect(existsSync(angularDjango2PackagePath)).toBe(true);

          execCommand(
            `npx -y @angular/cli@21 new ${workspaceName} --no-create-application --package-manager npm --skip-git --defaults`,
            tempArea.path,
          );
          execCommand(`npm install "${angularDjango2PackagePath}"`, workspaceRoot);
          execCommand('npx ng add angular-django2 --skip-confirmation --defaults', workspaceRoot);
          execCommand(
            'npx ng generate angular-django2:application my-app --defaults',
            workspaceRoot,
          );
          const buildOutput = execCommand('npx ng build my-app', workspaceRoot);

          for (const relativePath of [
            'angular.json',
            'package.json',
            'projects/my-app/src/main.ts',
            'projects/my-app/src/index.html',
            'projects/my-app/src/styles.scss',
            'projects/my-app/src/app/app.ts',
            'projects/my-app/src/app/app.html',
            'projects/my-app/src/app/app.config.ts',
            'projects/my-app/src/app/app.routes.ts',
            'projects/my-app/src/app/app.spec.ts',
            'dist/my-app',
          ]) {
            expect(existsSync(path.join(workspaceRoot, relativePath))).toBe(true);
          }

          const angularJson = readFileSync(path.join(workspaceRoot, 'angular.json'), 'utf8');
          const appTs = readFileSync(
            path.join(workspaceRoot, 'projects', 'my-app', 'src', 'app', 'app.ts'),
            'utf8',
          );
          const appConfig = readFileSync(
            path.join(workspaceRoot, 'projects', 'my-app', 'src', 'app', 'app.config.ts'),
            'utf8',
          );
          const appRoutes = readFileSync(
            path.join(workspaceRoot, 'projects', 'my-app', 'src', 'app', 'app.routes.ts'),
            'utf8',
          );

          expect(angularJson).toContain('"my-app"');
          expect(appTs).toContain("title = signal('my-app')");
          expect(appTs).toContain("styleUrl: './app.scss'");
          expect(appConfig).toContain('provideRouter(routes)');
          expect(appRoutes).toContain('export const routes: Routes = [];');
          expect(buildOutput).toContain('Application bundle generation complete');
        },
        {
          prefix: 'ngdj-application-',
        },
      );
    },
  );
});
