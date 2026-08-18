import type { JsonObject } from '@angular-devkit/core';
import { SchematicsException } from '@angular-devkit/schematics';
import type { Tree } from '@angular-devkit/schematics';
import type { WorkspaceConfig, WorkspaceProject } from './workspace';

/**
 * Resolve pass-through generator paths relative to the selected Angular project.
 *
 * Angular's built-in `--path` option is workspace-relative. The angular-django2
 * command examples use `--project=<name> --path=src/...`, which is more natural
 * as a project-relative path for multi-project workspaces.
 *
 * @internal
 */
export function resolveProjectRelativePathOptions(tree: Tree, options: JsonObject): JsonObject {
  const project = typeof options['project'] === 'string' ? options['project'] : undefined;
  const destinationPath = typeof options['path'] === 'string' ? options['path'] : undefined;

  if (!project || !destinationPath) {
    return options;
  }

  const angularJson = tree.read('/angular.json');
  if (!angularJson) {
    return options;
  }

  const workspace = JSON.parse(angularJson.toString()) as WorkspaceConfig;
  const projectRoot = workspace.projects?.[project]?.root;
  if (!projectRoot) {
    return options;
  }

  const normalizedProjectRoot = normalizePath(projectRoot);
  const normalizedDestinationPath = normalizePath(destinationPath);

  if (
    !normalizedProjectRoot ||
    isWithinProjectRoot(normalizedDestinationPath, normalizedProjectRoot)
  ) {
    return options;
  }

  return {
    ...options,
    path: `${normalizedProjectRoot}/${normalizedDestinationPath}`,
  };
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/g, '').replace(/\/+$/g, '');
}

function isWithinProjectRoot(destinationPath: string, projectRoot: string): boolean {
  return destinationPath === projectRoot || destinationPath.startsWith(`${projectRoot}/`);
}

/**
 * Resolve a requested application directory and ensure it remains in sourceRoot.
 *
 * A path may be source-root-relative, project-root-relative, or workspace-relative.
 */
export function resolveApplicationTargetDirectory(
  project: WorkspaceProject,
  requestedPath: string | undefined,
  defaultPath: string,
): string {
  const sourceRoot = normalizePath(project.sourceRoot ?? '');
  const projectRoot = normalizePath(project.root ?? '');
  const path = requestedPath ?? defaultPath;
  const normalizedPath = normalizePath(path);

  if (!sourceRoot) {
    throw new SchematicsException('The selected project has no application sourceRoot.');
  }
  if (!normalizedPath || path.split(/[\\/]+/).includes('..')) {
    throw new SchematicsException(
      'The target path must be a non-empty path within the application source tree.',
    );
  }

  const targetDirectory =
    isWithinProjectRoot(normalizedPath, sourceRoot) ||
    (projectRoot && isWithinProjectRoot(normalizedPath, projectRoot))
      ? normalizedPath
      : [projectRoot, normalizedPath].filter(Boolean).join('/');

  if (!isWithinProjectRoot(targetDirectory, sourceRoot)) {
    throw new SchematicsException(
      `The target path "${path}" must be within the application source root "${sourceRoot}".`,
    );
  }

  return targetDirectory;
}
