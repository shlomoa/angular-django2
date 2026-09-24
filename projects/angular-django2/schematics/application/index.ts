import type { JsonObject } from '@angular-devkit/core';
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { externalSchematic, SchematicsException } from '@angular-devkit/schematics';
import { readOpenUiDocument } from '../utility/openui';
import { applicationFromAst } from './ast';

const DEFAULT_APPLICATION_OPTIONS = {
  ssr: false,
  standalone: true,
  routing: true,
  zoneless: true,
  style: 'scss',
} as const;

/**
 * Generate an Angular application from CLI options or, with `--document`, from
 * an OpenUI `Application` node: `--name` defaults to the dasherized node id and
 * routing is enabled when the node has a `Routing` child.
 */
export function application(options: JsonObject): Rule {
  // Angular's application schematic rejects unknown keys, even with undefined
  // values, and undefined values must not override the defaults below.
  const angularOptions = Object.fromEntries(
    Object.entries(options).filter(
      ([key, value]) => value !== undefined && key !== 'document' && key !== 'nodeId',
    ),
  );

  if (options['document'] === undefined) {
    if (options['nodeId'] !== undefined) {
      throw new SchematicsException('--nodeId requires --document.');
    }
    return externalSchematic('@schematics/angular', 'application', {
      ...DEFAULT_APPLICATION_OPTIONS,
      ...angularOptions,
    });
  }
  if (options['routing'] !== undefined) {
    throw new SchematicsException(
      '--document cannot be combined with --routing; add or remove the Routing child of the OpenUI Application node instead.',
    );
  }

  const documentPath = String(options['document']);
  const nodeId = options['nodeId'] === undefined ? undefined : String(options['nodeId']);
  return (tree: Tree, context: SchematicContext) => {
    const app = applicationFromAst(readOpenUiDocument(tree, documentPath), documentPath, nodeId);
    return externalSchematic('@schematics/angular', 'application', {
      ...DEFAULT_APPLICATION_OPTIONS,
      ...angularOptions,
      name: options['name'] ?? app.name,
      routing: app.routing,
    })(tree, context);
  };
}
