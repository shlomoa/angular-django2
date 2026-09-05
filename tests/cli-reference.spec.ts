import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getRepoRoot } from './utils/temp_areas';

interface Collection {
  schematics: Record<string, unknown>;
}

describe('CLI reference', () => {
  it('provides exactly one navigable page for every collection schematic', () => {
    const repoRoot = getRepoRoot();
    const collection = JSON.parse(
      readFileSync(join(repoRoot, 'projects/angular-django2/schematics/collection.json'), 'utf8'),
    ) as Collection;
    const schematicNames = Object.keys(collection.schematics).sort();
    const cliDirectory = join(repoRoot, 'docs/cli');
    const documentedNames = readdirSync(cliDirectory)
      .filter((file) => file.endsWith('.md') && file !== 'index.md')
      .map((file) => file.slice(0, -'.md'.length))
      .sort();
    const mkdocsConfig = readFileSync(join(repoRoot, 'mkdocs.yml'), 'utf8');
    const cliIndex = readFileSync(join(cliDirectory, 'index.md'), 'utf8');
    const navSection = mkdocsConfig.split('\nnav:\n')[1].split('\ntheme:')[0];
    const navigatedNames = Array.from(
      navSection.matchAll(/^\s+- .+: cli\/([\w-]+)\.md$/gm),
      ([, schematic]) => schematic,
    ).sort();

    expect(documentedNames).toEqual(schematicNames);
    expect(navigatedNames).toEqual(['index', ...schematicNames].sort());
    for (const schematic of schematicNames) {
      expect(existsSync(join(cliDirectory, `${schematic}.md`))).toBe(true);
      expect(cliIndex).toContain(`](${schematic}.md)`);
    }

    for (const repositoryOnlyDocument of [
      'REQUIREMENTS.md',
      'INTEGRATION_TESTING.md',
      'RELEASING.md',
    ]) {
      expect(mkdocsConfig).toMatch(new RegExp(`^  ${repositoryOnlyDocument}$`, 'm'));
      expect(navSection).not.toContain(repositoryOnlyDocument);
    }
  });
});
