/**
 * Master OpenUI document compiler (migration plan, phase 5).
 *
 * Compiles a complete Angular Material application from one OpenUI document by
 * dispatching each element to the schematic that owns it, top-down:
 *
 * 1. the `Application` node → `material-app` (app shell, theme, routing,
 *    navigation), then its `IndexHtml` / `Favicon` → host files;
 * 2. every root `DashboardPage` / `EmptyPage` → `page` (routed page registered
 *    in `app.routes.ts`, children composed into its slots);
 * 3. every root `SurfaceContainers` → `component` and root `Form` →
 *    `reactive-form`, under `src/app/features`;
 * 4. embedding of nested children into their parent slots happens inside the
 *    page and component compilers (plan step 3.3);
 * 5. every element with a `[data]` binding → `data-service`.
 *
 * All dispatch decisions are validated before the first schematic runs.
 */
import { strings } from '@angular-devkit/core';
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { chain, externalSchematic, SchematicsException } from '@angular-devkit/schematics';
import type { OpenUiDocument, OpenUiElement } from '@shlomoa/openui-spec';

import { APPLICATION_AST_TYPE, applicationFromAst } from '../application/ast';
import { SURFACE_CONTAINER_AST_TYPE } from '../component/ast';
import { DATA_ATTRIBUTE } from '../data-service/ast';
import { PAGE_AST_TYPES } from '../page/ast';
import { FORM_AST_TYPE } from '../reactive-form/ast';
import { astNodeSubject, createAstNodeResolver, readAstString } from '../utility/ast-compiler';
import { readOpenUiDocument } from '../utility/openui';
import { hostFilesFromDocument } from '../workspace-setup/index';
import type { CompileSchema } from './schema';

const COLLECTION = 'angular-django2';

/** Application-relative directory for pages and standalone views. */
const FEATURES_PATH = 'src/app/features';

/** Root element types the dispatcher compiles. */
export const COMPILABLE_ROOT_AST_TYPES = [
  APPLICATION_AST_TYPE,
  ...PAGE_AST_TYPES,
  SURFACE_CONTAINER_AST_TYPE,
  FORM_AST_TYPE,
] as const;

/** The dispatch plan for one document. */
export interface CompilationPlan {
  /** Angular project name (the dasherized `Application` id). */
  project: string;
  pages: readonly OpenUiElement[];
  containers: readonly OpenUiElement[];
  forms: readonly OpenUiElement[];
  /** Elements anywhere in the document with a `[data]` binding. */
  dataBindings: readonly OpenUiElement[];
  /** Bound root elements whose own markup has no compiler yet. */
  dataOnly: readonly OpenUiElement[];
}

/** Compile a complete application from `--document`. */
export function compile(options: CompileSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    if (!options.document?.trim()) {
      throw new SchematicsException('Pass the OpenUI application document with --document.');
    }

    const documentPath = options.document;
    const plan = planCompilation(readOpenUiDocument(tree, documentPath), documentPath);
    for (const node of plan.dataOnly) {
      context.logger.warn(
        `${astNodeSubject(documentPath, node)} (${node.type}) has no compiler yet; ` +
          'only its [data] binding is compiled (data-service).',
      );
    }

    const { project } = plan;
    const document = documentPath;
    return chain([
      externalSchematic(COLLECTION, 'material-app', { document }),
      hostFilesFromDocument(documentPath, project),
      ...plan.pages.map((node) =>
        externalSchematic(COLLECTION, 'page', {
          document,
          nodeId: node.id,
          project,
          path: `${FEATURES_PATH}/${strings.dasherize(node.id)}`,
        }),
      ),
      ...plan.containers.map((node) =>
        externalSchematic(COLLECTION, 'component', {
          document,
          nodeId: node.id,
          project,
          path: FEATURES_PATH,
        }),
      ),
      ...plan.forms.map((node) =>
        externalSchematic(COLLECTION, 'reactive-form', {
          document,
          nodeId: node.id,
          name: strings.dasherize(node.id),
          project,
          path: FEATURES_PATH,
        }),
      ),
      ...plan.dataBindings.map((node) =>
        externalSchematic(COLLECTION, 'data-service', { document, nodeId: node.id, project }),
      ),
    ])(tree, context);
  };
}

/**
 * Classify the root elements of a validated document.
 *
 * @throws SchematicsException when the document has no or several `Application`
 * nodes, or a root element no compiler handles.
 */
export function planCompilation(document: OpenUiDocument, documentPath: string): CompilationPlan {
  const roots = document.children ?? [];
  const applications = roots.filter((node) => node.type === APPLICATION_AST_TYPE);
  if (applications.length !== 1) {
    throw new SchematicsException(
      `OpenUI document "${documentPath}" must have exactly one root ${APPLICATION_AST_TYPE} element; ` +
        `found ${applications.length}.`,
    );
  }

  const dataBindings = [...createAstNodeResolver(document).walk()].filter(
    (node) => readAstString(node, DATA_ATTRIBUTE) !== undefined,
  );
  const ofType = (...types: readonly string[]) => roots.filter((node) => types.includes(node.type));
  const dataOnly = roots.filter(
    (node) =>
      !(COMPILABLE_ROOT_AST_TYPES as readonly string[]).includes(node.type) &&
      dataBindings.includes(node),
  );
  const unsupported = roots.find(
    (node) =>
      !(COMPILABLE_ROOT_AST_TYPES as readonly string[]).includes(node.type) &&
      !dataOnly.includes(node),
  );
  if (unsupported) {
    throw new SchematicsException(
      `OpenUI node "${astNodeSubject(documentPath, unsupported)}" has type "${unsupported.type}", ` +
        'which the compile schematic cannot compile at the document root. ' +
        `Supported root types: ${COMPILABLE_ROOT_AST_TYPES.join(', ')}, or any element with a ${DATA_ATTRIBUTE} binding.`,
    );
  }

  return {
    project: applicationFromAst(document, documentPath, applications[0].id).name,
    pages: ofType(...PAGE_AST_TYPES),
    containers: ofType(SURFACE_CONTAINER_AST_TYPE),
    forms: ofType(FORM_AST_TYPE),
    dataBindings,
    dataOnly,
  };
}
