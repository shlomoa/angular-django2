/**
 * Dialog schematic: compile an OpenUI `dialog` node (`widgets/dialog`) into a
 * standalone OnPush component that opens an Angular Material dialog.
 *
 * The generated component reuses the `component` schematic for its files and
 * section markers, so the children of the dialog regions are compiled and
 * embedded exactly as the slot children of a `SurfaceContainers` node.
 */
import { strings } from '@angular-devkit/core';
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { chain, SchematicsException } from '@angular-devkit/schematics';
import * as path from 'node:path';

import { compileAstChild } from '../component/ast';
import { generateComponent } from '../component/generate';
import { composeAstChildren } from '../embed-component/compose';
import { astNodeSubject, resolveAstNode } from '../utility/ast-compiler';
import { readOpenUiDocument } from '../utility/openui';
import { assertPackageDependencies } from '../utility/package-json';
import { resolveApplicationTargetDirectory } from '../utility/project-relative-path';
import {
  readWorkspace,
  requireWorkspaceProject,
  resolveApplicationProjectName,
} from '../utility/workspace';
import { DIALOG_AST_TYPE, dialogOptionsFromAst } from './ast';
import type { DialogSchema } from './schema';
import { dialogComponentSource, dialogTemplate } from './templates';

/**
 * Generate the dialog component described by an OpenUI `dialog` node and compile
 * and embed the children of its title, content and actions regions.
 *
 * @throws SchematicsException for unsupported attributes or children, missing
 * prerequisites, or a document without a `dialog` node. Everything is validated
 * before the first file is written.
 */
export function dialog(options: DialogSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const document = readOpenUiDocument(tree, options.document);
    const node = resolveAstNode(document, options.nodeId, DIALOG_AST_TYPE);
    const subject = astNodeSubject(options.document, node);
    const described = dialogOptionsFromAst(document, node, options.document);

    const name = options.name ?? strings.dasherize(node.id);
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)) {
      throw new SchematicsException(
        `The dialog name "${name}" of "${subject}" must be non-empty kebab-case.`,
      );
    }

    assertPackageDependencies(tree, 'dialog', ['@angular/material', '@angular/cdk']);
    const workspace = readWorkspace(tree);
    const projectName = resolveApplicationProjectName(workspace, options.project);
    const project = requireWorkspaceProject(workspace, projectName);
    const destination = resolveApplicationTargetDirectory(
      project,
      options.path,
      `${project.sourceRoot}/app`,
    );

    const directory = path.posix.join(destination, name);
    const componentPath = path.posix.join(directory, `${name}.ts`);
    const templatePath = path.posix.join(directory, `${name}.html`);
    const target = { directory, project: projectName, documentPath: options.document };
    const children = described.regions.flatMap((region) =>
      (region.node.children ?? []).map((child) => compileAstChild(child, target, region.section)),
    );

    return chain([
      generateComponent({
        name,
        path: destination,
        project: projectName,
        standalone: true,
        changeDetection: 'OnPush',
      }),
      (host: Tree) => {
        const generated = host.read(componentPath)?.toString() ?? '';
        const className = /export\s+class\s+(\w+)/.exec(generated)?.[1];
        const selector = /selector:\s*'([^']+)'/.exec(generated)?.[1];
        if (className === undefined || selector === undefined) {
          throw new SchematicsException(
            `Could not read the class and selector of the generated component ${componentPath}.`,
          );
        }

        host.overwrite(
          componentPath,
          dialogComponentSource(
            {
              name,
              className,
              selector,
              styleUrl: /styleUrl:\s*'([^']+)'/.exec(generated)?.[1],
            },
            described,
          ),
        );
        host.overwrite(templatePath, dialogTemplate(name, described));
        return host;
      },
      composeAstChildren(componentPath, children),
    ])(tree, context);
  };
}
