import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { syncPackageMetadataFiles } from './sync-package-metadata.mjs';

const rootPackagePath = new URL('../package.json', import.meta.url);
const libraryPackagePath = new URL('../projects/angular-django2/package.json', import.meta.url);

const releaseTypes = new Set(['patch', 'minor', 'major', 'prerelease']);
const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

function isObject(value) {
  return value !== null && typeof value === 'object';
}

function normalizePath(pathLike) {
  return pathLike instanceof URL ? fileURLToPath(pathLike) : String(pathLike);
}

export function parseVersion(version) {
  const match = semverPattern.exec(version);

  if (!match) {
    throw new Error(`Expected a semantic version like 1.2.3 or 1.2.3-rc.0, received "${version}".`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : [],
  };
}

export function formatVersion({ major, minor, patch, prerelease = [] }) {
  const baseVersion = `${major}.${minor}.${patch}`;

  return prerelease.length > 0 ? `${baseVersion}-${prerelease.join('.')}` : baseVersion;
}

function incrementNumericIdentifier(identifier) {
  if (!/^(0|[1-9]\d*)$/.test(identifier)) {
    return null;
  }

  return String(Number(identifier) + 1);
}

export function calculateNextVersion(currentVersion, releaseTypeOrVersion = 'patch', options = {}) {
  const { preid = 'rc' } = options;

  if (!preid || !/^[0-9A-Za-z-]+$/.test(preid)) {
    throw new Error(
      `Expected --preid to contain only letters, numbers, or hyphens, received "${preid}".`,
    );
  }

  if (releaseTypes.has(releaseTypeOrVersion)) {
    const current = parseVersion(currentVersion);

    switch (releaseTypeOrVersion) {
      case 'patch':
        return formatVersion({
          major: current.major,
          minor: current.minor,
          patch: current.patch + 1,
        });
      case 'minor':
        return formatVersion({
          major: current.major,
          minor: current.minor + 1,
          patch: 0,
        });
      case 'major':
        return formatVersion({
          major: current.major + 1,
          minor: 0,
          patch: 0,
        });
      case 'prerelease': {
        if (current.prerelease[0] === preid) {
          const nextPrerelease = [...current.prerelease];
          const lastIndex = nextPrerelease.length - 1;
          const incrementedValue = incrementNumericIdentifier(nextPrerelease[lastIndex] ?? '');

          if (incrementedValue !== null) {
            nextPrerelease[lastIndex] = incrementedValue;
          } else {
            nextPrerelease.push('0');
          }

          return formatVersion({
            major: current.major,
            minor: current.minor,
            patch: current.patch,
            prerelease: nextPrerelease,
          });
        }

        return formatVersion({
          major: current.major,
          minor: current.minor,
          patch: current.patch + 1,
          prerelease: [preid, '0'],
        });
      }
      default:
        break;
    }
  }

  parseVersion(releaseTypeOrVersion);
  return releaseTypeOrVersion;
}

export function parseCommandLineArgs(args) {
  let releaseTypeOrVersion = 'patch';
  let preid = 'rc';
  let showHelp = false;
  let positionalArgumentConsumed = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--help' || argument === '-h') {
      showHelp = true;
      continue;
    }

    if (argument === '--preid') {
      const nextValue = args[index + 1];

      if (!nextValue || nextValue.startsWith('--')) {
        throw new Error('Expected a value after --preid.');
      }

      preid = nextValue;
      index += 1;
      continue;
    }

    if (argument === '--bump') {
      const nextValue = args[index + 1];

      if (!nextValue || nextValue.startsWith('--')) {
        throw new Error('Expected a value after --bump.');
      }

      releaseTypeOrVersion = nextValue;
      positionalArgumentConsumed = true;
      index += 1;
      continue;
    }

    if (argument.startsWith('--')) {
      throw new Error(`Unknown option "${argument}".`);
    }

    if (positionalArgumentConsumed) {
      throw new Error(`Unexpected extra argument "${argument}".`);
    }

    releaseTypeOrVersion = argument;
    positionalArgumentConsumed = true;
  }

  return {
    preid,
    releaseTypeOrVersion,
    showHelp,
  };
}

export async function updateReleaseVersionFiles(releaseTypeOrVersion = 'patch', options = {}) {
  const {
    preid = 'rc',
    rootManifestPath = rootPackagePath,
    libraryManifestPath = libraryPackagePath,
  } = options;

  const rootPackage = JSON.parse(await readFile(rootManifestPath, 'utf8'));

  if (!isObject(rootPackage) || typeof rootPackage.version !== 'string') {
    throw new Error('Expected the root package manifest to contain a string version field.');
  }

  const currentVersion = rootPackage.version;
  const nextVersion = calculateNextVersion(currentVersion, releaseTypeOrVersion, { preid });
  const nextRootPackage = {
    ...rootPackage,
    version: nextVersion,
  };

  await writeFile(rootManifestPath, `${JSON.stringify(nextRootPackage, null, 2)}\n`);
  const { libraryPackage } = await syncPackageMetadataFiles(rootManifestPath, libraryManifestPath);

  return {
    changedFiles: [normalizePath(rootManifestPath), normalizePath(libraryManifestPath)],
    currentVersion,
    nextVersion,
    preid,
    releaseTypeOrVersion,
    libraryVersion: libraryPackage.version,
  };
}

export function getHelpText() {
  return `Usage: npm run release:version -- [patch|minor|major|prerelease|<version>] [--preid rc]\n\nExamples:\n  npm run release:version -- patch\n  npm run release:version -- minor\n  npm run release:version -- prerelease --preid next\n  npm run release:version -- 0.2.0`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { preid, releaseTypeOrVersion, showHelp } = parseCommandLineArgs(process.argv.slice(2));

  if (showHelp) {
    console.log(getHelpText());
  } else {
    const result = await updateReleaseVersionFiles(releaseTypeOrVersion, { preid });

    console.log(
      `Bumped release version from ${result.currentVersion} to ${result.nextVersion} and synchronized ${result.changedFiles.length} manifest files.`,
    );
  }
}
