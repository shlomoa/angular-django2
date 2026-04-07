import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { syncPackageMetadata, syncPackageMetadataFiles } from '../tools/sync-package-metadata.mjs';

describe('sync-package-metadata', () => {
  const tempDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirectories.map((directory) => rm(directory, { force: true, recursive: true })),
    );
    tempDirectories.length = 0;
  });

  it('copies root metadata onto the publishable package while preserving package-specific fields', () => {
    const libraryPackage = syncPackageMetadata(
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
        version: '1.2.3',
      },
      {
        peerDependencies: {
          '@angular/core': '^21.2.0',
        },
        publishConfig: {
          tag: 'next',
        },
        version: '0.0.1',
      },
    );

    expect(libraryPackage).toMatchObject({
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
      version: '1.2.3',
    });
  });

  it('removes optional metadata that no longer exists in the root manifest and writes the updated file', async () => {
    const tempDirectory = await mkdtemp(join(tmpdir(), 'angular-django2-metadata-'));
    const rootManifestPath = join(tempDirectory, 'package.json');
    const libraryManifestPath = join(tempDirectory, 'library-package.json');

    tempDirectories.push(tempDirectory);

    await writeFile(
      rootManifestPath,
      JSON.stringify({
        description: 'Synchronized description',
        name: 'angular-django2',
        version: '2.0.0',
      }),
    );
    await writeFile(
      libraryManifestPath,
      JSON.stringify({
        author: 'Old Author',
        name: 'old-package-name',
        publishConfig: {
          tag: 'beta',
        },
        sideEffects: false,
        version: '0.0.1',
      }),
    );

    const { libraryPackage } = await syncPackageMetadataFiles(
      rootManifestPath,
      libraryManifestPath,
    );
    const writtenLibraryPackage = JSON.parse(await readFile(libraryManifestPath, 'utf8'));

    expect(libraryPackage.author).toBeUndefined();
    expect(writtenLibraryPackage).toEqual({
      description: 'Synchronized description',
      name: 'angular-django2',
      publishConfig: {
        access: 'public',
        tag: 'beta',
      },
      sideEffects: false,
      version: '2.0.0',
    });
  });
});
