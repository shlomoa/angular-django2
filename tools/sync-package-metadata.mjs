import { readFile, writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';

const rootPackagePath = new URL('../package.json', import.meta.url);
const libraryPackagePath = new URL('../projects/angular-django2/package.json', import.meta.url);
const distPackagePath = new URL('../dist/angular-django2/package.json', import.meta.url);

export const sharedMetadataFields = [
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
];

export const rootOnlyFields = [
  'private',
  'scripts',
  'packageManager',
  'devDependencies',
  'workspaces',
];

export function syncPackageMetadata(rootPackage, libraryPackage) {
  const nextLibraryPackage = structuredClone(libraryPackage);

  for (const field of rootOnlyFields) {
    delete nextLibraryPackage[field];
  }

  for (const field of sharedMetadataFields) {
    if (field in rootPackage) {
      nextLibraryPackage[field] = structuredClone(rootPackage[field]);
      continue;
    }

    delete nextLibraryPackage[field];
  }

  nextLibraryPackage.publishConfig = {
    ...nextLibraryPackage.publishConfig,
    access: 'public',
  };

  return nextLibraryPackage;
}

/**
 * @param {string | URL} [rootManifestPath]
 * @param {string | URL} [libraryManifestPath]
 */
export async function syncPackageMetadataFiles(rootManifestPath, libraryManifestPath) {
  const resolvedRootManifestPath = rootManifestPath ?? rootPackagePath;
  const resolvedLibraryManifestPath = libraryManifestPath ?? libraryPackagePath;

  const rootPackage = JSON.parse(await readFile(resolvedRootManifestPath, 'utf8'));
  const libraryPackage = JSON.parse(await readFile(resolvedLibraryManifestPath, 'utf8'));
  const synchronizedLibraryPackage = syncPackageMetadata(rootPackage, libraryPackage);

  await writeFile(
    resolvedLibraryManifestPath,
    `${JSON.stringify(synchronizedLibraryPackage, null, 2)}\n`,
  );

  return {
    rootPackage,
    libraryPackage: synchronizedLibraryPackage,
  };
}

export function getPackageMetadataDrift(
  rootPackage,
  libraryPackage,
  packageTemplate = libraryPackage,
) {
  const expectedLibraryPackage = syncPackageMetadata(rootPackage, packageTemplate);

  return [...new Set([...Object.keys(libraryPackage), ...Object.keys(expectedLibraryPackage)])]
    .filter((field) => !isDeepStrictEqual(libraryPackage[field], expectedLibraryPackage[field]))
    .map((field) => ({
      field,
      actual: libraryPackage[field],
      expected: expectedLibraryPackage[field],
    }));
}

function formatValue(value) {
  return value === undefined ? '<absent>' : JSON.stringify(value);
}

/**
 * @param {string | URL} [rootManifestPath]
 * @param {string | URL} [libraryManifestPath]
 * @param {string | URL} [packageTemplatePath]
 */
export async function checkPackageMetadataFiles(
  rootManifestPath,
  libraryManifestPath,
  packageTemplatePath,
) {
  const resolvedRootManifestPath = rootManifestPath ?? rootPackagePath;
  const resolvedLibraryManifestPath = libraryManifestPath ?? libraryPackagePath;
  const resolvedPackageTemplatePath = packageTemplatePath ?? resolvedLibraryManifestPath;

  const [rootPackage, libraryPackage, packageTemplate] = await Promise.all(
    [resolvedRootManifestPath, resolvedLibraryManifestPath, resolvedPackageTemplatePath].map(
      async (path) => JSON.parse(await readFile(path, 'utf8')),
    ),
  );
  const drift = getPackageMetadataDrift(rootPackage, libraryPackage, packageTemplate);

  if (drift.length > 0) {
    const details = drift
      .map(
        ({ actual, expected, field }) =>
          `  - ${field}: expected ${formatValue(expected)}, received ${formatValue(actual)}`,
      )
      .join('\n');

    throw new Error(
      `Package metadata drift detected:\n${details}\nRun "npm run sync:package-metadata" to repair the source manifest, then rebuild generated artifacts.`,
    );
  }

  return {
    rootPackage,
    libraryPackage,
  };
}

export function parseCommandLineArgs(args) {
  let check = false;
  let dist = false;

  for (const argument of args) {
    if (argument === '--check') {
      check = true;
      continue;
    }

    if (argument === '--dist') {
      dist = true;
      continue;
    }

    throw new Error(`Unknown option "${argument}".`);
  }

  if (dist && !check) {
    throw new Error('The --dist option requires --check.');
  }

  return { check, dist };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { check, dist } = parseCommandLineArgs(process.argv.slice(2));

  if (check) {
    const targetPath = dist ? distPackagePath : libraryPackagePath;
    const { libraryPackage } = await checkPackageMetadataFiles(
      rootPackagePath,
      targetPath,
      libraryPackagePath,
    );

    console.log(
      `Package metadata is synchronized for ${libraryPackage.name}@${libraryPackage.version}.`,
    );
  } else {
    const { rootPackage, libraryPackage } = await syncPackageMetadataFiles();

    console.log(
      `Synchronized publishable package metadata from ${rootPackage.name}@${rootPackage.version} to ${libraryPackage.name}.`,
    );
  }
}
