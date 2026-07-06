/**
 * Shared package.json utilities for schematics.
 * @internal
 */
import type { Tree, SchematicContext } from '@angular-devkit/schematics';

export interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  [key: string]: unknown;
}

const PACKAGE_JSON_PATH = '/package.json';

/**
 * Read and parse the workspace package.json.
 * Returns null and emits a warning when the file is absent.
 */
export function readPackageJson(tree: Tree, context: SchematicContext): PackageJson | null {
  const buf = tree.read(PACKAGE_JSON_PATH);
  if (!buf) {
    context.logger.warn('Could not find package.json.');
    return null;
  }
  return JSON.parse(buf.toString()) as PackageJson;
}

/**
 * Write a (possibly mutated) package.json back to the tree.
 */
export function writePackageJson(tree: Tree, packageJson: PackageJson): void {
  tree.overwrite(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n');
}

/**
 * Add a devDependency entry if not already present.
 * Returns true if the entry was added (install needed), false if it already existed.
 */
export function ensureDevDependency(
  packageJson: PackageJson,
  name: string,
  version: string,
): boolean {
  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }
  if (packageJson.devDependencies[name]) {
    return false;
  }
  packageJson.devDependencies[name] = version;
  return true;
}

/**
 * Add a dependency entry if not already present.
 * Returns true if the entry was added (install needed), false if it already existed.
 */
export function ensureDependency(packageJson: PackageJson, name: string, version: string): boolean {
  if (!packageJson.dependencies) {
    packageJson.dependencies = {};
  }
  if (packageJson.dependencies[name]) {
    return false;
  }
  packageJson.dependencies[name] = version;
  return true;
}

/**
 * Add a script entry if not already present.
 * Returns true if the entry was added, false if it already existed.
 */
export function ensureScript(packageJson: PackageJson, name: string, command: string): boolean {
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }
  if (packageJson.scripts[name]) {
    return false;
  }
  packageJson.scripts[name] = command;
  return true;
}
