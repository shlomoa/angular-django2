import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { getRepoRoot } from './utils/temp_areas';

const repoRoot = getRepoRoot();

function readRepositoryFile(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('documentation validation', () => {
  it('organizes the tutorial as focused workflows with canonical references', () => {
    const tutorial = readRepositoryFile('docs/TUTORIAL.md');

    for (const heading of [
      '## Prerequisites and workspace choice',
      '## Fastest complete Material app',
      '## Explicit step-by-step composition',
      '## Component composition',
      '## Forms and validation',
      '## Page and site generation',
      '## OpenAPI client integration',
    ]) {
      expect(tutorial).toContain(heading);
    }

    expect(tutorial).toContain('[CLI reference](cli/index.md)');
    expect(tutorial).toContain('[`material-app`](cli/material-app.md)');
    expect(tutorial).toContain('[`reactive-form`](cli/reactive-form.md)');
    expect(tutorial).toContain('[`site` reference](cli/site.md)');
    expect(tutorial).toContain(
      'https://github.com/shlomoa/angular-django2/blob/main/projects/angular-django2/schematics/reactive-form/schema.json#/definitions/reactiveFormDefinition',
    );
    expect(tutorial).toContain(
      '"$schema": "./node_modules/angular-django2/schematics/reactive-form/schema.json#/definitions/reactiveFormDefinition"',
    );
  });

  it('provides a canonical strict MkDocs build command', () => {
    const packageJson = JSON.parse(readRepositoryFile('package.json')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['docs:build']).toBe('python -m mkdocs build --strict');
  });

  it('uses the Read the Docs Python version and requirements in CI', () => {
    expect(readRepositoryFile('.readthedocs.yaml')).toContain("python: '3.12'");

    const workflow = readRepositoryFile('.github/workflows/ci.yml');
    expect(workflow).toContain('uses: actions/setup-python@v5');
    expect(workflow).toContain("python-version: '3.12'");
    expect(workflow).toContain('python -m pip install --requirement docs/requirements.txt');
    expect(workflow).toContain('npm run docs:build');
  });
});
