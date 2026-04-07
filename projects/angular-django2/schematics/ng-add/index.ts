import type { Rule, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';

const COLLECTION_NAME = 'angular-django2';

interface WorkspaceConfig {
  cli?: {
    schematicCollections?: string[];
  };
}

export function ngAdd(): Rule {
  return (tree: Tree) => {
    const angularJsonPath = '/angular.json';
    const angularJson = tree.read(angularJsonPath);

    if (!angularJson) {
      throw new SchematicsException('Could not find angular.json in the target workspace.');
    }

    const workspace = JSON.parse(angularJson.toString()) as WorkspaceConfig;
    const existingCollections = workspace.cli?.schematicCollections ?? [];

    if (existingCollections.includes(COLLECTION_NAME)) {
      return tree;
    }

    workspace.cli = {
      ...(workspace.cli ?? {}),
      schematicCollections: [COLLECTION_NAME, ...existingCollections],
    };

    tree.overwrite(angularJsonPath, `${JSON.stringify(workspace, null, 2)}\n`);

    return tree;
  };
}
