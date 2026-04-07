import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const rootPackagePath = new URL('../package.json', import.meta.url);
const libraryPackagePath = new URL('../projects/angular-django2/package.json', import.meta.url);

export const metadataFields = [
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
];

export function syncPackageMetadata(rootPackage, libraryPackage) {
  const nextLibraryPackage = structuredClone(libraryPackage);

  for (const field of metadataFields) {
    if (field in rootPackage) {
      nextLibraryPackage[field] = rootPackage[field];
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

export async function syncPackageMetadataFiles(
  rootManifestPath = rootPackagePath,
  libraryManifestPath = libraryPackagePath,
) {
  const rootPackage = JSON.parse(await readFile(rootManifestPath, 'utf8'));
  const libraryPackage = JSON.parse(await readFile(libraryManifestPath, 'utf8'));
  const synchronizedLibraryPackage = syncPackageMetadata(rootPackage, libraryPackage);

  await writeFile(libraryManifestPath, `${JSON.stringify(synchronizedLibraryPackage, null, 2)}\n`);

  return {
    rootPackage,
    libraryPackage: synchronizedLibraryPackage,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { rootPackage, libraryPackage } = await syncPackageMetadataFiles();

  console.log(
    `Synchronized publishable package metadata from ${rootPackage.name}@${rootPackage.version} to ${libraryPackage.name}.`,
  );
}
