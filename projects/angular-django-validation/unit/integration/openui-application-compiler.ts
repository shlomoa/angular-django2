/**
 * Validation-only OpenUI application compiler (migration plan, phase 5).
 *
 * Not part of the published angular-django2 package: it lives in the private
 * validation project and exists only to verify that the public `--document`
 * schematics compose into a complete application from one OpenUI document.
 *
 * It dispatches each element to the schematic that owns it, top-down:
 *
 * 1. the `Application` node -> `material-app` (app shell, theme, routing,
 *    navigation), then `workspace-setup` for its `IndexHtml` / `Favicon`;
 * 2. every root `DashboardPage` / `EmptyPage` -> `page` (routed page registered
 *    in `app.routes.ts`, children composed into its slots);
 * 3. every root `SurfaceContainers` -> `component` and root `Form` ->
 *    `reactive-form`, under `src/app/features`;
 * 4. embedding of nested children into their parent slots happens inside the
 *    page and component compilers (plan step 3.3);
 * 5. every element with a `[data]` binding -> `data-service`.
 *
 * Run it with `SchematicTestRunner.callRule` on a runner registered for the
 * built `angular-django2` collection.
 */
import { strings } from '@angular-devkit/core';
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { chain, externalSchematic, SchematicsException } from '@angular-devkit/schematics';
import type { OpenUiDocument, OpenUiElement } from '@shlomoa/openui-spec';

import {
  APPLICATION_AST_TYPE,
  applicationFromAst,
} from '../../../angular-django2/schematics/application/ast';
import { SURFACE_CONTAINER_AST_TYPE } from '../../../angular-django2/schematics/component/ast';
import { DATA_ATTRIBUTE } from '../../../angular-django2/schematics/data-service/ast';
import { PAGE_AST_TYPES } from '../../../angular-django2/schematics/page/ast';
import { FORM_AST_TYPE } from '../../../angular-django2/schematics/reactive-form/ast';
import {
  astNodeSubject,
  createAstNodeResolver,
  readAstString,
} from '../../../angular-django2/schematics/utility/ast-compiler';
import { readOpenUiDocument } from '../../../angular-django2/schematics/utility/openui';

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

/** Compile a complete application from the OpenUI document at `documentPath`. */
export function compileOpenUiApplication(documentPath: string): Rule {
  return (tree: Tree, context: SchematicContext) => {
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
      externalSchematic(COLLECTION, 'workspace-setup', { name: project, project, document }),
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
        'which the OpenUI application compiler cannot compile at the document root. ' +
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
