/**
 * OpenUI surface container compiler (migration plan, step 3.1) and the child
 * dispatcher shared by every composed container (step 3.3).
 *
 * A `SurfaceContainers` node compiles into a standalone OnPush component whose
 * template is a Layer 1 HTML5 region:
 *
 * | OpenUI                       | Generated template                                  |
 * | :--------------------------- | :-------------------------------------------------- |
 * | `SurfaceContainers`          | `<section>`                                         |
 * | `[title]`                    | `<h2>` inside the `<header>`                        |
 * | child with `[slot]="header"` | `<header>` (`header` section)                       |
 * | child without `[slot]`       | body (`children` section, the content slot)         |
 * | child with `[slot]="actions"`| `<footer>` (`actions` section)                      |
 *
 * Supported child node types: `SurfaceContainers` (recursively), `Form`, and
 * the form controls `TextInputs` / `RangeControl`. Each child compiles into its
 * own component inside the parent's directory.
 *
 * @internal
 */
import type { JsonObject } from '@angular-devkit/core';
import { strings } from '@angular-devkit/core';
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { chain, SchematicsException } from '@angular-devkit/schematics';
import type { OpenUiElement } from '@shlomoa/openui-spec';
import * as path from 'node:path';

import {
  AST_SLOT_ATTRIBUTE,
  astSlotSection,
  composeAstChildren,
  withoutCompositionAttributes,
  type AstChildCompilation,
} from '../embed-component/compose';
import { templateSectionMarkers } from '../embed-component/index';
import { CONTROL_AST_NODE_TYPES, controlName } from '../form-field/ast';
import { compileFormFieldFromAst, formFieldPrimitiveDescriptor } from '../form-field/generate';
import { FORM_AST_TYPE } from '../reactive-form/ast';
import { compileNestedFormFromAst } from '../reactive-form/index';
import { reactiveFormNames } from '../reactive-form/templates';
import {
  assertAstAttributes,
  astNodeSubject,
  readAstNode,
  readAstString,
} from '../utility/ast-compiler';
import { resolveApplicationTargetDirectory } from '../utility/project-relative-path';
import {
  readWorkspace,
  requireWorkspaceProject,
  resolveApplicationProjectName,
} from '../utility/workspace';
import { generateComponent } from './generate';

/** OpenUI catalog type compiled by the component schematic. */
export const SURFACE_CONTAINER_AST_TYPE = 'SurfaceContainers';

/** Catalog-style attribute keys understood on `SurfaceContainers` nodes. */
export const SURFACE_CONTAINER_ATTRIBUTES = {
  title: '[title]',
  slot: AST_SLOT_ATTRIBUTE,
} as const;

/** Node types a composed container can compile as children. */
export const COMPOSABLE_CHILD_AST_TYPES = [
  SURFACE_CONTAINER_AST_TYPE,
  FORM_AST_TYPE,
  ...CONTROL_AST_NODE_TYPES,
] as const;

/** Options that stay on the CLI when a container is compiled from an OpenUI node. */
export interface ContainerCompilationOptions {
  /** Kebab-case component name. */
  readonly name: string;
  /** Workspace-relative directory that receives the component directory. */
  readonly path: string;
  /** Target Angular project name. */
  readonly project: string;
  /** Workspace-relative path of the OpenUI document (for diagnostics). */
  readonly documentPath: string;
}

/** Where compiled children of one parent component go. */
export interface ChildCompilationTarget {
  /** Workspace-relative directory of the parent component; children get subdirectories. */
  readonly directory: string;
  /** Target Angular project name. */
  readonly project: string;
  /** Workspace-relative path of the OpenUI document (for diagnostics). */
  readonly documentPath: string;
}

/**
 * Schema resolver for `component --document`: resolve the `SurfaceContainers`
 * node and compile it.
 */
export function compileComponentDocument(options: JsonObject): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const documentPath = String(options['document']);
    const nodeId = options['nodeId'] === undefined ? undefined : String(options['nodeId']);
    const node = readAstNode(tree, documentPath, nodeId, SURFACE_CONTAINER_AST_TYPE);
    const name =
      options['name'] === undefined ? strings.dasherize(node.id) : String(options['name']);

    const workspace = readWorkspace(tree);
    const requestedProject =
      options['project'] === undefined ? undefined : String(options['project']);
    const projectName = resolveApplicationProjectName(workspace, requestedProject);
    const project = requireWorkspaceProject(workspace, projectName);
    const requestedPath = options['path'] === undefined ? undefined : String(options['path']);
    const destination = resolveApplicationTargetDirectory(
      project,
      requestedPath,
      `${project.sourceRoot}/app`,
    );

    return compileSurfaceContainerFromAst(node, {
      name,
      path: destination,
      project: projectName,
      documentPath,
    })(tree, context);
  };
}

/**
 * Pure AST compiler: generate the component for one `SurfaceContainers` node
 * and compile and embed its children.
 *
 * @throws SchematicsException for unsupported attributes, slots, or child types.
 */
export function compileSurfaceContainerFromAst(
  node: OpenUiElement,
  options: ContainerCompilationOptions,
): Rule {
  assertKebabName(options.name);
  const subject = astNodeSubject(options.documentPath, node);
  assertAstAttributes(node, Object.values(SURFACE_CONTAINER_ATTRIBUTES), subject);

  const directory = path.posix.join(options.path, options.name);
  const componentPath = path.posix.join(directory, `${options.name}.ts`);
  const templatePath = path.posix.join(directory, `${options.name}.html`);
  const children = (node.children ?? []).map((child) =>
    compileAstChild(child, {
      directory,
      project: options.project,
      documentPath: options.documentPath,
    }),
  );

  return chain([
    generateComponent({
      name: options.name,
      path: options.path,
      project: options.project,
      standalone: true,
      changeDetection: 'OnPush',
    }),
    (tree: Tree) => {
      tree.overwrite(templatePath, surfaceContainerTemplate(readAstString(node, '[title]')));
      return tree;
    },
    composeAstChildren(componentPath, children),
  ]);
}

/**
 * Compile one child node into its own component under `target.directory`,
 * placed by its `[slot]` unless `section` overrides it.
 *
 * @throws SchematicsException for unsupported child types or slots.
 */
export function compileAstChild(
  child: OpenUiElement,
  target: ChildCompilationTarget,
  section?: string,
): AstChildCompilation {
  const subject = astNodeSubject(target.documentPath, child);
  const node = withoutCompositionAttributes(child);
  const placement = section ?? astSlotSection(child, subject);
  const name = strings.dasherize(child.id);

  if (child.type === SURFACE_CONTAINER_AST_TYPE) {
    return {
      node: child,
      section: placement,
      componentPath: path.posix.join(target.directory, name, `${name}.ts`),
      rule: compileSurfaceContainerFromAst(node, {
        name,
        path: target.directory,
        project: target.project,
        documentPath: target.documentPath,
      }),
    };
  }

  if (child.type === FORM_AST_TYPE) {
    const fileName = reactiveFormNames(name).fileName;
    return {
      node: child,
      section: placement,
      componentPath: path.posix.join(target.directory, fileName, `${fileName}.ts`),
      rule: compileNestedFormFromAst(node, {
        name,
        project: target.project,
        destinationPath: target.directory,
        subject,
      }),
    };
  }

  if ((CONTROL_AST_NODE_TYPES as readonly string[]).includes(child.type)) {
    const fieldName = strings.dasherize(controlName(node));
    return {
      node: child,
      section: placement,
      componentPath: formFieldPrimitiveDescriptor(fieldName, target.directory).componentPath,
      rule: compileFormFieldFromAst(
        node,
        { name: fieldName, path: target.directory, project: target.project },
        subject,
      ),
    };
  }

  throw new SchematicsException(
    `OpenUI node "${subject}" has type "${child.type}", which cannot be composed into a container. ` +
      `Supported child types: ${COMPOSABLE_CHILD_AST_TYPES.join(', ')}.`,
  );
}

/**
 * Escape text for an Angular template text node: HTML special characters plus
 * the `{`, `}`, and `@` characters Angular reserves for interpolation, ICU
 * messages, and control-flow blocks.
 */
export function escapeTemplateText(value: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '{': '&#123;',
    '}': '&#125;',
    '@': '&#64;',
  };

  return value.replace(/[&<>{}@]/g, (character) => entities[character]);
}

/** Layer 1 HTML5 template of a surface container with its three slot sections. */
export function surfaceContainerTemplate(title: string | undefined): string {
  const heading = title === undefined ? '' : `    <h2>${escapeTemplateText(title)}</h2>\n`;

  return `<section>
  <header>
${heading}${templateSectionMarkers('header', '    ')}
  </header>
${templateSectionMarkers('children', '  ')}
  <footer>
${templateSectionMarkers('actions', '    ')}
  </footer>
</section>
`;
}

function assertKebabName(name: string): void {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)) {
    throw new SchematicsException(`The component name "${name}" must be non-empty kebab-case.`);
  }
}
