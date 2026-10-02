import { strings } from '@angular-devkit/core';
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import { readAstNode } from '../utility/ast-compiler';
import { assertPackageDependencies } from '../utility/package-json';
import { resolveApplicationTargetDirectory } from '../utility/project-relative-path';
import {
  readWorkspace,
  requireWorkspaceProject,
  resolveApplicationProjectName,
} from '../utility/workspace';
import { STEPPER_AST_TYPE } from './ast';
import { compileStepperFromAst } from './generate';
import type { StepperSchema } from './schema';

const REQUIRED_DEPENDENCIES = ['@angular/material', '@angular/cdk'] as const;

/**
 * Compile an OpenUI `Stepper` node (`widgets/stepper`) into a standalone OnPush
 * Angular Material stepper component. The steps' children are compiled and
 * embedded recursively, as `component` does for a `SurfaceContainers` node.
 *
 * The schematic is document-driven: it has no CLI-only mode. All validation
 * runs before the first tree mutation.
 */
export function stepper(options: StepperSchema): Rule {
  if (options.document === undefined) {
    throw new SchematicsException(
      'stepper compiles an OpenUI Stepper node: pass --document=<path>.',
    );
  }

  const documentPath = options.document;
  return (tree: Tree, context: SchematicContext) => {
    assertPackageDependencies(tree, 'stepper', REQUIRED_DEPENDENCIES);

    const node = readAstNode(tree, documentPath, options.nodeId, STEPPER_AST_TYPE);
    const workspace = readWorkspace(tree);
    const projectName = resolveApplicationProjectName(workspace, options.project);
    const project = requireWorkspaceProject(workspace, projectName);
    const destination = resolveApplicationTargetDirectory(
      project,
      options.path,
      `${project.sourceRoot}/app`,
    );

    return compileStepperFromAst(node, {
      name: options.name ?? strings.dasherize(node.id),
      path: destination,
      project: projectName,
      documentPath,
    })(tree, context);
  };
}
