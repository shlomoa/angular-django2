/**
 * Shared workspace configuration types and utilities for schematics.
 * @internal
 */
import type { Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';

export const ANGULAR_JSON_PATH = '/angular.json';

export interface WorkspaceArchitectTargetOptions {
  styles?: string[];
  lintFilePatterns?: string[];
  [key: string]: unknown;
}

export interface WorkspaceArchitectTarget {
  builder: string;
  options?: WorkspaceArchitectTargetOptions;
}

/** Index-signature map of architect targets; any named key (build, lint, …) is valid. */
export type WorkspaceArchitect = Record<string, WorkspaceArchitectTarget | undefined>;

export interface WorkspaceProject {
  root?: string;
  sourceRoot?: string;
  architect?: WorkspaceArchitect;
}

export interface WorkspaceConfig {
  cli?: {
    schematicCollections?: string[];
  };
  projects?: Record<string, WorkspaceProject>;
}

/** Read angular.json or throw a SchematicsException with the supplied message. */
export function readWorkspace(
  tree: Tree,
  missingMessage = 'Could not find angular.json in the workspace.',
): WorkspaceConfig {
  const angularJson = tree.read(ANGULAR_JSON_PATH);
  if (!angularJson) {
    throw new SchematicsException(missingMessage);
  }

  return JSON.parse(angularJson.toString()) as WorkspaceConfig;
}

/** Write angular.json using the repository's stable two-space JSON formatting. */
export function writeWorkspace(tree: Tree, workspace: WorkspaceConfig): void {
  tree.overwrite(ANGULAR_JSON_PATH, `${JSON.stringify(workspace, null, 2)}\n`);
}

/** Resolve a project from angular.json or throw a consistent SchematicsException. */
export function requireWorkspaceProject(
  workspace: WorkspaceConfig,
  projectName: string,
): WorkspaceProject {
  const project = workspace.projects?.[projectName];
  if (!project) {
    throw new SchematicsException(`Project "${projectName}" not found in angular.json.`);
  }

  return project;
}
