/**
 * OpenUI data binding vocabulary (migration plan, step 4.4).
 *
 * A bound node (for example a `Table` or `Report`) names the generated OpenAPI
 * service it reads from with `[data]="<apiPath>#<ApiService>"`:
 *
 * - `<apiPath>` is the application path of the generated services module (the
 *   `ng-openapi-gen` `services` barrel, for example `src/app/api/services`); it
 *   is converted to an import path relative to the generated data service, like
 *   the legacy `--apiPath`.
 * - `<ApiService>` is the exported service class, like `--apiService`.
 *
 * Only `[data]` is read; the node's other attributes belong to the compiler of
 * its own type. `(paginate)`, `(sort)`, and `(filter)` are reserved for the
 * widget compilers and generate nothing here.
 *
 * @internal
 */
import { SchematicsException } from '@angular-devkit/schematics';
import type { OpenUiDocument, OpenUiElement } from '@shlomoa/openui-spec';

import { astNodeSubject, createAstNodeResolver, readAstString } from '../utility/ast-compiler';

/** Catalog-style attribute binding a node to a generated OpenAPI service. */
export const DATA_ATTRIBUTE = '[data]';

/** A decoded `[data]` binding. */
export interface DataBinding {
  /** The bound node. */
  node: OpenUiElement;
  /** Application path of the generated services module. */
  apiPath: string;
  /** Exported OpenAPI service class name. */
  apiService: string;
}

/**
 * Resolve the bound node (by `nodeId`, else the first node with `[data]`) and
 * decode its binding.
 *
 * @throws SchematicsException when no bound node exists or the binding is malformed.
 */
export function dataBindingFromAst(
  document: OpenUiDocument,
  documentPath: string,
  nodeId: string | undefined,
): DataBinding {
  const resolver = createAstNodeResolver(document);
  const node =
    nodeId === undefined
      ? [...resolver.walk()].find((candidate) => readAstString(candidate, DATA_ATTRIBUTE))
      : resolver.findById(nodeId);
  if (!node) {
    throw new SchematicsException(
      nodeId === undefined
        ? `OpenUI document "${documentPath}" has no element with a ${DATA_ATTRIBUTE} binding.`
        : `OpenUI node "${nodeId}" was not found in the document (object not found: ${nodeId}). ` +
            'Pass an existing element id with --nodeId.',
    );
  }

  const subject = astNodeSubject(documentPath, node);
  const binding = readAstString(node, DATA_ATTRIBUTE);
  if (binding === undefined) {
    throw new SchematicsException(`OpenUI node "${subject}" has no ${DATA_ATTRIBUTE} binding.`);
  }

  const separator = binding.lastIndexOf('#');
  const apiPath = binding.slice(0, separator).trim();
  const apiService = binding.slice(separator + 1).trim();
  if (separator < 0 || !apiPath || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(apiService)) {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${DATA_ATTRIBUTE}="${binding}" must be "<apiPath>#<ApiService>", ` +
        'for example "src/app/api/services#UsersApiService".',
    );
  }

  return { node, apiPath, apiService };
}
