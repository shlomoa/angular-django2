import { strings } from '@angular-devkit/core';
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import * as path from 'node:path';
import type { OpenUiElement } from '@shlomoa/openui-spec';

import { astNodeSubject, readAstNode } from '../utility/ast-compiler';
import { assertPackageDependencies } from '../utility/package-json';
import { resolveApplicationTargetDirectory } from '../utility/project-relative-path';
import {
  readWorkspace,
  requireWorkspaceProject,
  resolveApplicationProjectName,
} from '../utility/workspace';
import { TABLE_AST_TYPE, tableDefinitionFromAst } from './ast';
import type { TableSchema } from './schema';
import { tableComponentSource, tableNames, tableStyles, tableTemplate } from './templates';

const ALLOWED_OPTIONS = new Set(['name', 'path', 'project', 'document', 'nodeId']);

const DEFAULT_PATH = 'src/app/shared/tables';

/**
 * Generate a standalone OnPush Angular Material table component from the
 * OpenUI `table` element of a document.
 */
export function table(options: TableSchema): Rule {
  assertSupportedOptions(options);
  if (typeof options.document !== 'string' || options.document === '') {
    throw new SchematicsException(
      '--document is required: the table is compiled from an OpenUI `table` node.',
    );
  }
  const documentPath = options.document;

  return (tree: Tree, context: SchematicContext) => {
    const node = readAstNode(tree, documentPath, options.nodeId, TABLE_AST_TYPE);
    return compileTableFromAst(
      node,
      { name: options.name, path: options.path, project: options.project },
      astNodeSubject(documentPath, node),
    )(tree, context);
  };
}

/** @internal Options that stay on the CLI when a table is compiled from an OpenUI node. */
export interface TableAstOptions {
  /** Kebab-case base name; defaults to the dasherized node id. */
  name?: string;
  path?: string;
  project?: string;
}

/**
 * @internal Pure AST leaf compiler: generate the standalone OnPush Material
 * table described by an OpenUI `table` node.
 *
 * @param subject Diagnostic subject for the node (see `astNodeSubject`).
 * @throws SchematicsException for unsupported attributes or children, an invalid name,
 *   missing dependencies, or output that already exists.
 */
export function compileTableFromAst(
  node: OpenUiElement,
  options: TableAstOptions,
  subject: string,
): Rule {
  const definition = tableDefinitionFromAst(node, subject);
  const name = options.name ?? strings.dasherize(node.id);
  assertTableName(name);
  const names = tableNames(name);

  return (tree: Tree) => {
    const workspace = readWorkspace(tree);
    const projectName = resolveApplicationProjectName(workspace, options.project);
    const project = requireWorkspaceProject(workspace, projectName);
    const targetDirectory = resolveApplicationTargetDirectory(project, options.path, DEFAULT_PATH);
    assertPackageDependencies(tree, 'Material table generation', [
      '@angular/material',
      '@angular/cdk',
    ]);

    const directory = path.posix.join(targetDirectory, names.fileName);
    const files = {
      component: path.posix.join(directory, `${names.fileName}.ts`),
      template: path.posix.join(directory, `${names.fileName}.html`),
      stylesheet: path.posix.join(directory, `${names.fileName}.scss`),
    };
    const existing = Object.values(files).filter((filePath) => tree.exists(filePath));
    if (existing.length > 0) {
      throw new SchematicsException(
        `A table named "${name}" already exists at ${existing.join(', ')}. Choose a different name or remove the existing output first.`,
      );
    }

    tree.create(files.component, tableComponentSource(definition, names));
    tree.create(files.template, tableTemplate(definition, names));
    tree.create(files.stylesheet, tableStyles(names));
    return tree;
  };
}

function assertSupportedOptions(options: TableSchema): void {
  const unknown = Object.keys(options).filter((option) => !ALLOWED_OPTIONS.has(option));
  if (unknown.length > 0) {
    throw new SchematicsException(`Unsupported table option(s): ${unknown.join(', ')}.`);
  }
}

function assertTableName(name: string): void {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)) {
    throw new SchematicsException(`The table name "${name}" must be non-empty kebab-case.`);
  }
}
