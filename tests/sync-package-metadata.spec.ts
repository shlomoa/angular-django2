import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import {
  checkPackageMetadataFiles,
  rootOnlyFields,
  sharedMetadataFields,
  syncPackageMetadata,
  syncPackageMetadataFiles,
} from '../tools/sync-package-metadata.mjs';
import { createTempDir, deleteTempDir, getRepoRoot } from './utils/temp_areas';

describe('sync-package-metadata', () => {
  const tempDirectories: string[] = [];
  const repoRoot = getRepoRoot();

  afterEach(async () => {
    tempDirectories.forEach((directory) => deleteTempDir(directory, repoRoot));
    tempDirectories.length = 0;
  });

  it('copies root metadata onto the publishable package while preserving package-specific fields', () => {
    const rootPackage = {
      author: 'Example Author',
      bugs: {
        url: 'https://example.com/issues',
      },
      description: 'Root description',
      engines: {
        node: '>=22',
        npm: '>=11',
      },
      funding: 'https://example.com/funding',
      homepage: 'https://example.com',
      keywords: ['angular', 'django'],
      license: 'MIT',
      name: 'angular-django2',
      repository: {
        type: 'git',
        url: 'https://example.com/repo.git',
      },
      version: '1.2.3',
    };
    const originalRootPackage = structuredClone(rootPackage);
    const originalLibraryPackage = {
      dependencies: {
        consumer: '^1.0.0',
      },
      peerDependencies: {
        '@angular/core': '^22.0.0',
      },
      publishConfig: {
        tag: 'next',
      },
      schematics: './schematics/collection.json',
      version: '0.0.1',
    };

    const libraryPackage = syncPackageMetadata(rootPackage, originalLibraryPackage);

    expect(libraryPackage).toMatchObject({
      author: 'Example Author',
      bugs: {
        url: 'https://example.com/issues',
      },
      dependencies: {
        consumer: '^1.0.0',
      },
      description: 'Root description',
      engines: {
        node: '>=22',
        npm: '>=11',
      },
      funding: 'https://example.com/funding',
      homepage: 'https://example.com',
      keywords: ['angular', 'django'],
      license: 'MIT',
      name: 'angular-django2',
      peerDependencies: {
        '@angular/core': '^22.0.0',
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
      version: '1.2.3',
    });
    expect(sharedMetadataFields).toEqual([
      'name',
      'version',
      'description',
      'keywords',
      'license',
      'homepage',
      'bugs',
      'repository',
      'author',
      'funding',
      'engines',
    ]);
    expect(rootPackage).toEqual(originalRootPackage);
    expect(originalLibraryPackage.version).toBe('0.0.1');
  });

  it('removes root-only fields while preserving package-owned dependencies', () => {
    const libraryPackage = syncPackageMetadata(
      {
        name: 'angular-django2',
        version: '1.0.0',
      },
      {
        dependencies: { runtime: '^1.0.0' },
        devDependencies: { workspace: '^2.0.0' },
        packageManager: 'npm@11.0.0',
        private: true,
        scripts: { build: 'workspace-build' },
        workspaces: ['projects/*'],
      },
    );

    expect(rootOnlyFields.every((field) => !(field in libraryPackage))).toBe(true);
    expect(libraryPackage.dependencies).toEqual({ runtime: '^1.0.0' });
  });

  it('removes optional metadata that no longer exists in the root manifest and writes the updated file', async () => {
    const tempDirectory = createTempDir(repoRoot, 'angular-django2-metadata-');
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
        funding: 'https://example.com/old-funding',
        name: 'old-package-name',
        publishConfig: {
          tag: 'beta',
        },
        sideEffects: false,
        version: '0.0.1',
      }),
    );

    const { libraryPackage } = await syncPackageMetadataFiles(
      pathToFileURL(rootManifestPath),
      pathToFileURL(libraryManifestPath),
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

  it('checks structurally aligned manifests without writing either file', async () => {
    const tempDirectory = createTempDir(repoRoot, 'angular-django2-metadata-check-');
    const rootManifestPath = join(tempDirectory, 'package.json');
    const libraryManifestPath = join(tempDirectory, 'library-package.json');
    const rootContents = '{"version":"2.0.0","name":"angular-django2"}\n';
    const libraryContents =
      '{\n  "publishConfig": { "access": "public" },\n  "name": "angular-django2",\n  "version": "2.0.0"\n}\n';

    tempDirectories.push(tempDirectory);
    await writeFile(rootManifestPath, rootContents);
    await writeFile(libraryManifestPath, libraryContents);

    await expect(
      checkPackageMetadataFiles(
        pathToFileURL(rootManifestPath),
        pathToFileURL(libraryManifestPath),
      ),
    ).resolves.toEqual({
      rootPackage: JSON.parse(rootContents),
      libraryPackage: JSON.parse(libraryContents),
    });
    expect(await readFile(rootManifestPath, 'utf8')).toBe(rootContents);
    expect(await readFile(libraryManifestPath, 'utf8')).toBe(libraryContents);
  });

  it.each([
    ['version', { version: '1.0.1' }],
    ['engines', { engines: { node: '>=20' } }],
    ['description', { description: 'Unexpected description' }],
    ['scripts', { scripts: { build: 'unexpected' } }],
    ['publishConfig', { publishConfig: { access: 'restricted' } }],
  ])('reports %s drift without writing the target manifest', async (field, drift) => {
    const tempDirectory = createTempDir(repoRoot, 'angular-django2-metadata-drift-');
    const rootManifestPath = join(tempDirectory, 'package.json');
    const libraryManifestPath = join(tempDirectory, 'library-package.json');
    const rootPackage = {
      engines: { node: '>=22' },
      name: 'angular-django2',
      version: '1.0.0',
    };
    const libraryContents = `${JSON.stringify({
      engines: rootPackage.engines,
      name: rootPackage.name,
      publishConfig: { access: 'public' },
      version: rootPackage.version,
      ...drift,
    })}\n`;

    tempDirectories.push(tempDirectory);
    await writeFile(rootManifestPath, JSON.stringify(rootPackage));
    await writeFile(libraryManifestPath, libraryContents);

    await expect(
      checkPackageMetadataFiles(
        pathToFileURL(rootManifestPath),
        pathToFileURL(libraryManifestPath),
      ),
    ).rejects.toThrow(new RegExp(`Package metadata drift detected:[\\s\\S]*${field}`));
    expect(await readFile(libraryManifestPath, 'utf8')).toBe(libraryContents);
  });

  it('detects package-owned fields missing from a generated distribution manifest', async () => {
    const tempDirectory = createTempDir(repoRoot, 'angular-django2-dist-metadata-');
    const rootManifestPath = join(tempDirectory, 'package.json');
    const sourceManifestPath = join(tempDirectory, 'source-package.json');
    const distManifestPath = join(tempDirectory, 'dist-package.json');
    const rootPackage = { name: 'angular-django2', version: '1.0.0' };
    const sourcePackage = syncPackageMetadata(rootPackage, {
      'ng-add': { save: 'devDependencies' },
      publishConfig: { access: 'public' },
      schematics: './schematics/collection.json',
    });
    const distPackage = structuredClone(sourcePackage);

    delete distPackage.schematics;
    tempDirectories.push(tempDirectory);
    await writeFile(rootManifestPath, JSON.stringify(rootPackage));
    await writeFile(sourceManifestPath, JSON.stringify(sourcePackage));
    await writeFile(distManifestPath, JSON.stringify(distPackage));

    await expect(
      checkPackageMetadataFiles(
        pathToFileURL(rootManifestPath),
        pathToFileURL(distManifestPath),
        pathToFileURL(sourceManifestPath),
      ),
    ).rejects.toThrow(/Package metadata drift detected:[\s\S]*schematics/);
  });

  it('keeps the checked-in publishable manifest aligned and the schematics boundary independent', async () => {
    const rootPackage = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8'));
    const libraryPackage = JSON.parse(
      await readFile(join(repoRoot, 'projects', 'angular-django2', 'package.json'), 'utf8'),
    );
    const boundaryPackage = JSON.parse(
      await readFile(
        join(repoRoot, 'projects', 'angular-django2', 'schematics', 'package.json'),
        'utf8',
      ),
    );

    expect(syncPackageMetadata(rootPackage, libraryPackage)).toEqual(libraryPackage);
    expect(boundaryPackage).toEqual({ type: 'commonjs' });
  });
});
