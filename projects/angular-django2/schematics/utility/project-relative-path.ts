import type { JsonObject } from '@angular-devkit/core';
import type { Tree } from '@angular-devkit/schematics';
import type { WorkspaceConfig } from './workspace';

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
