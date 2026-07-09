import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { getRepoRoot } from './utils/temp_areas';

const repoRoot = getRepoRoot();

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8')) as T;
}

describe('reference app workspace infrastructure', () => {
  it('declares a collision-free Angular Material reference app project with build, serve, test, and lint targets', () => {
    const angularJson = readJson<{
      projects: Record<
        string,
        {
          projectType: string;
          root: string;
          sourceRoot: string;
          architect: Record<string, unknown>;
        }
      >;
    }>('angular.json');
    const project = angularJson.projects['angular-django2-reference'];

    expect(project.projectType).toBe('application');
    expect(project.root).toBe('projects/angular-django2-reference');
    expect(project.sourceRoot).toBe('projects/angular-django2-reference/src');
    expect(project.architect.build).toBeDefined();
    expect(project.architect.serve).toBeDefined();
    expect(project.architect.test).toBeDefined();
    expect(project.architect.lint).toBeDefined();
  });

  it('exposes finite npm scripts for the reference app workspace slice', () => {
    const packageJson = readJson<{
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
    }>('package.json');

    expect(packageJson.scripts['build:reference-app']).toBe('ng build angular-django2-reference');
    expect(packageJson.scripts['lint:reference-app']).toBe('ng lint angular-django2-reference');
    expect(packageJson.scripts['test:reference-app']).toBe(
      'ng test angular-django2-reference --watch=false',
    );
    expect(packageJson.scripts['serve:reference-app']).toBe('ng serve angular-django2-reference');
    expect(packageJson.dependencies['@angular/material']).toBeDefined();
    expect(packageJson.dependencies['@angular/cdk']).toBeDefined();
    expect(packageJson.dependencies['@angular/animations']).toBeDefined();
  });
});
