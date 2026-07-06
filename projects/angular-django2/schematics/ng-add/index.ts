import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { readWorkspace, writeWorkspace } from '../utility/workspace';

const COLLECTION_NAME = 'angular-django2';

export function ngAdd(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const workspace = readWorkspace(tree, 'Could not find angular.json in the target workspace.');
    const existingCollections = workspace.cli?.schematicCollections ?? [];

    if (existingCollections.includes(COLLECTION_NAME)) {
      context.logger.info(`${COLLECTION_NAME} is already configured as a schematic collection.`);
      return tree;
    }

    workspace.cli = {
      ...(workspace.cli ?? {}),
      schematicCollections: [COLLECTION_NAME, ...existingCollections],
    };

    writeWorkspace(tree, workspace);
    context.logger.info(`Added ${COLLECTION_NAME} to cli.schematicCollections.`);

    return tree;
  };
}
