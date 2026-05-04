import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  calculateNextVersion,
  parseCommandLineArgs,
  updateReleaseVersionFiles,
} from '../tools/release-version.mjs';
import { createTempDir, deleteTempDir, getRepoRoot } from './utils/tmpfiles';

describe('release-version', () => {
  const tempDirectories: string[] = [];
  const repoRoot = getRepoRoot();

  afterEach(() => {
    tempDirectories.forEach((directory) => deleteTempDir(directory, repoRoot));
    tempDirectories.length = 0;
  });

  it('increments patch, minor, and major versions', () => {
    expect(calculateNextVersion('0.1.3', 'patch')).toBe('0.1.4');
    expect(calculateNextVersion('0.1.3', 'minor')).toBe('0.2.0');
    expect(calculateNextVersion('0.1.3', 'major')).toBe('1.0.0');
  });

  it('creates and increments prerelease versions using the configured preid', () => {
    expect(calculateNextVersion('0.1.3', 'prerelease')).toBe('0.1.4-rc.0');
    expect(calculateNextVersion('0.1.4-rc.0', 'prerelease')).toBe('0.1.4-rc.1');
    expect(calculateNextVersion('0.1.4-beta.2', 'prerelease', { preid: 'beta' })).toBe(
      '0.1.4-beta.3',
    );
    expect(calculateNextVersion('0.1.4-beta', 'prerelease', { preid: 'beta' })).toBe(
      '0.1.4-beta.0',
    );
  });

  it('accepts an explicit semantic version', () => {
    expect(calculateNextVersion('0.1.3', '2.0.0')).toBe('2.0.0');
    expect(calculateNextVersion('0.1.3', '2.0.0-next.4')).toBe('2.0.0-next.4');
  });

  it('parses command line options with positional and named bump arguments', () => {
    expect(parseCommandLineArgs(['minor'])).toEqual({
      preid: 'rc',
      releaseTypeOrVersion: 'minor',
      showHelp: false,
    });

    expect(parseCommandLineArgs(['--bump', 'prerelease', '--preid', 'next'])).toEqual({
      preid: 'next',
      releaseTypeOrVersion: 'prerelease',
      showHelp: false,
    });
  });

  it('rejects invalid versions and malformed arguments', () => {
    expect(() => calculateNextVersion('0.1.3', 'banana')).toThrow(
      'Expected a semantic version like 1.2.3 or 1.2.3-rc.0',
    );
    expect(() => parseCommandLineArgs(['--preid'])).toThrow('Expected a value after --preid.');
    expect(() => parseCommandLineArgs(['patch', 'minor'])).toThrow(
      'Unexpected extra argument "minor".',
    );
  });

  it('updates the root and library manifests while preserving library-specific fields', async () => {
    const tempDirectory = createTempDir(repoRoot, 'angular-django2-release-version-');
    const rootManifestPath = join(tempDirectory, 'package.json');
    const libraryManifestPath = join(tempDirectory, 'library-package.json');

    tempDirectories.push(tempDirectory);

    await writeFile(
      rootManifestPath,
      `${JSON.stringify(
        {
          bugs: {
            url: 'https://example.com/issues',
          },
          description: 'Root description',
          homepage: 'https://example.com',
          keywords: ['angular', 'django'],
          license: 'MIT',
          name: 'angular-django2',
          repository: {
            type: 'git',
            url: 'https://example.com/repo.git',
          },
          version: '0.1.3',
        },
        null,
        2,
      )}\n`,
    );
    await writeFile(
      libraryManifestPath,
      `${JSON.stringify(
        {
          peerDependencies: {
            '@angular/core': '^21.2.0',
          },
          publishConfig: {
            tag: 'next',
          },
          schematics: './schematics/collection.json',
          sideEffects: false,
          version: '0.0.1',
        },
        null,
        2,
      )}\n`,
    );

    const result = await updateReleaseVersionFiles('minor', {
      libraryManifestPath,
      rootManifestPath,
    });

    const rootManifest = JSON.parse(await readFile(rootManifestPath, 'utf8'));
    const libraryManifest = JSON.parse(await readFile(libraryManifestPath, 'utf8'));

    expect(result.currentVersion).toBe('0.1.3');
    expect(result.nextVersion).toBe('0.2.0');
    expect(result.libraryVersion).toBe('0.2.0');
    expect(result.changedFiles).toEqual([rootManifestPath, libraryManifestPath]);

    expect(rootManifest.version).toBe('0.2.0');
    expect(libraryManifest).toEqual({
      bugs: {
        url: 'https://example.com/issues',
      },
      description: 'Root description',
      homepage: 'https://example.com',
      keywords: ['angular', 'django'],
      license: 'MIT',
      name: 'angular-django2',
      peerDependencies: {
        '@angular/core': '^21.2.0',
      },
      publishConfig: {
        access: 'public',
        tag: 'next',
      },
      repository: {
        type: 'git',
        url: 'https://example.com/repo.git',
      },
      schematics: './schematics/collection.json',
      sideEffects: false,
      version: '0.2.0',
    });
  });
});
