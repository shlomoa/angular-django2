/**
 * Pure AST compiler of the stepper schematic: one validated `Stepper` node
 * becomes a standalone OnPush Angular Material stepper component whose steps
 * host the compiled and embedded step content.
 *
 * Step content reuses the shared composition engine of `component`: each child
 * of a `step` compiles into its own component (`SurfaceContainers`, `Form`, or
 * a form control) and is embedded into the step section of its `uses.slot`.
 *
 * @internal
 */
import type { Rule, Tree } from '@angular-devkit/schematics';
import { chain, SchematicsException } from '@angular-devkit/schematics';
import type { OpenUiElement } from '@shlomoa/openui-spec';
import * as path from 'node:path';

import { compileAstChild } from '../component/ast';
import { generateComponent } from '../component/generate';
import { composeAstChildren, readAstSlot } from '../embed-component/compose';
import { slotSection } from '../embed-component/index';
import { astNodeSubject } from '../utility/ast-compiler';
import { stepperFromAst, type StepperAstOptions } from './ast';
import {
  stepperComponentSource,
  stepperStylesheet,
  stepperTemplate,
  stepSection,
} from './templates';

/** Options that stay on the CLI when a stepper is compiled from an OpenUI node. */
export interface StepperCompilationOptions {
  /** Kebab-case component name. */
  readonly name: string;
  /** Workspace-relative directory that receives the component directory. */
  readonly path: string;
  /** Target Angular project name. */
  readonly project: string;
  /** Workspace-relative path of the OpenUI document (for diagnostics). */
  readonly documentPath: string;
}

/**
 * Generate the component for one `Stepper` node and compile and embed the
 * children of its steps.
 *
 * Every attribute, child, slot, and child type is validated before the rule
 * is returned, so an invalid node leaves no partial output.
 *
 * @throws SchematicsException for `uses.branching`, unsupported attributes,
 *   child types, slots, or invalid values.
 */
export function compileStepperFromAst(
  node: OpenUiElement,
  options: StepperCompilationOptions,
): Rule {
  assertKebabName(options.name);
  const stepper = stepperFromAst(node, options.documentPath);

  const directory = path.posix.join(options.path, options.name);
  const componentPath = path.posix.join(directory, `${options.name}.ts`);
  const templatePath = path.posix.join(directory, `${options.name}.html`);
  const target = {
    directory,
    project: options.project,
    documentPath: options.documentPath,
  };
  const children = stepper.steps.flatMap((step) =>
    (step.node.children ?? []).map((child) =>
      compileAstChild(
        child,
        target,
        stepSection(
          step,
          slotSection(readAstSlot(child, astNodeSubject(options.documentPath, child))),
        ),
      ),
    ),
  );

  return chain([
    generateComponent({
      name: options.name,
      path: options.path,
      project: options.project,
      standalone: true,
      changeDetection: 'OnPush',
    }),
    writeStepper(componentPath, templatePath, stepper),
    composeAstChildren(componentPath, children),
  ]);
}

/** Replace the placeholder template and style, and extend the generated component source. */
function writeStepper(
  componentPath: string,
  templatePath: string,
  stepper: StepperAstOptions,
): Rule {
  return (tree: Tree) => {
    const source = tree.read(componentPath)?.toString();
    if (source === undefined) {
      throw new SchematicsException(`The generated component ${componentPath} was not found.`);
    }
    tree.overwrite(componentPath, stepperComponentSource(source, stepper));
    tree.overwrite(templatePath, stepperTemplate(stepper));

    const styleUrl = /styleUrl:\s*['"]\.\/([^'"]+)['"]/.exec(source)?.[1];
    if (styleUrl !== undefined) {
      const stylePath = path.posix.join(path.posix.dirname(componentPath), styleUrl);
      if (tree.exists(stylePath)) {
        tree.overwrite(stylePath, stepperStylesheet());
      }
    }

    return tree;
  };
}

function assertKebabName(name: string): void {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)) {
    throw new SchematicsException(`The component name "${name}" must be non-empty kebab-case.`);
  }
}
