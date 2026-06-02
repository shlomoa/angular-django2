import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_E2E_TIMEOUT,
  execAngularCli,
  execCommand,
  getRepoRoot,
  withTempArea,
} from './utils/temp_areas';

const repoRoot = getRepoRoot();
const angularDjango2PackagePath = path.join(repoRoot, 'dist', 'angular-django2');

describe('angular-django2 application schematic', () => {
  it(
    'generates and builds the Angular app scaffold for my-app in a temp area',
    { timeout: DEFAULT_E2E_TIMEOUT },
    async () => {
      await withTempArea(
        (tempArea) => {
          const parentDir = path.dirname(repoRoot);
          const workspaceName = `validation-workspace-${Date.now().toString(36)}`;
          const workspaceRoot = path.join(tempArea.path, workspaceName);

          expect(existsSync(angularDjango2PackagePath)).toBe(true);

          execAngularCli(
            [
              'new',
              workspaceName,
              `--directory=${path.relative(parentDir, workspaceRoot)}`,
              '--no-create-application',
              '--package-manager',
              'npm',
              '--skip-git',
              '--defaults',
            ],
            parentDir,
          );
          execCommand(`npm install "${angularDjango2PackagePath}"`, workspaceRoot);
          execAngularCli(
            ['add', 'angular-django2', '--skip-confirmation', '--defaults'],
            workspaceRoot,
          );
          execAngularCli(
            ['generate', 'angular-django2:application', 'my-app', '--defaults'],
            workspaceRoot,
          );
          const buildOutput = execAngularCli(['build', 'my-app'], workspaceRoot);

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
          tempRoot: repoRoot,
        },
      );
    },
  );
});
