import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { getRepoRoot } from './utils/temp_areas';

const repoRoot = getRepoRoot();

function readRepositoryFile(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('documentation validation', () => {
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
