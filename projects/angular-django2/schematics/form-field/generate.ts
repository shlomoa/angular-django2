import { strings } from '@angular-devkit/core';
import type { Rule, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import * as path from 'node:path';
import type { OpenUiElement } from '@shlomoa/openui-spec';
import { createSyntheticAstNode, readAstString } from '../utility/ast-compiler';
import { assertPackageDependencies } from '../utility/package-json';
import { resolveApplicationTargetDirectory } from '../utility/project-relative-path';
import {
  readWorkspace,
  requireWorkspaceProject,
  resolveApplicationProjectName,
} from '../utility/workspace';
import {
  FORM_FIELD_APPEARANCES,
  FORM_FIELD_CONTROL_TYPES,
  FORM_FIELD_PRIMITIVE_BINDINGS,
  FORM_FIELD_SUBSCRIPT_SIZINGS,
  type FormFieldAppearance,
  type FormFieldControlType,
  type FormFieldPrimitiveBinding,
  type FormFieldSubscriptSizing,
} from './schema';
import { CONTROL_ATTRIBUTES, controlAstType, controlName, controlTypeFromAst } from './ast';
import { formFieldComponentSource, formFieldTemplate } from './templates';

const DEFAULT_PATH = 'src/app/shared/form-helpers';

export interface CanonicalFormFieldOptions {
  name: string;
  path?: string;
  project?: string;
  controlType?: FormFieldControlType;
  appearance?: FormFieldAppearance;
  subscriptSizing?: FormFieldSubscriptSizing;
}

/**
 * @internal Stable schematic metadata for the generated form-field component.
 *
 * This is intentionally schematic-only metadata, not a runtime package API.
 */
export interface FormFieldPrimitiveDescriptor {
  className: string;
  selector: string;
  componentPath: string;
  controlTypes: readonly FormFieldControlType[];
  bindings: readonly FormFieldPrimitiveBinding[];
  canonical: boolean;
}

interface ResolvedFormFieldOptions {
  name: string;
  componentPath: string;
  templatePath: string;
  stylesheetPath: string;
  controlType: FormFieldControlType;
  appearance: FormFieldAppearance;
  subscriptSizing: FormFieldSubscriptSizing;
}

/** @internal Describe a canonical form-field from its naming and option contract. */
export function formFieldPrimitiveDescriptor(
  name: string,
  targetDirectory: string,
): FormFieldPrimitiveDescriptor {
  const componentName = `${name}-field`;

  return {
    className: `${strings.classify(name)}FieldComponent`,
    selector: `app-${componentName}`,
    componentPath: path.posix.join(targetDirectory, componentName, `${componentName}.ts`),
    controlTypes: FORM_FIELD_CONTROL_TYPES,
    bindings: FORM_FIELD_PRIMITIVE_BINDINGS,
    canonical: true,
  };
}

/** @internal Options that stay on the CLI when a control is compiled from an OpenUI node. */
export interface FormFieldAstOptions {
  /** Kebab-case base name; defaults to the dasherized node `[name]` or id. */
  name?: string;
  path?: string;
  project?: string;
}

/**
 * @internal Legacy CLI adapter: translate flat options into a synthetic OpenUI
 * control node and compile it through the same pipeline as `--document`.
 */
export function generateFormField(options: CanonicalFormFieldOptions): Rule {
  assertFieldName(options.name);
  const node = createSyntheticAstNode({
    id: options.name,
    type: controlAstType(options.controlType ?? 'text'),
    attrs: {
      [CONTROL_ATTRIBUTES.type]: options.controlType,
      [CONTROL_ATTRIBUTES.appearance]: options.appearance,
      [CONTROL_ATTRIBUTES.subscriptSizing]: options.subscriptSizing,
    },
  });

  return compileFormFieldFromAst(
    node,
    { name: options.name, path: options.path, project: options.project },
    options.name,
  );
}

/**
 * @internal Pure AST leaf compiler: generate the standalone typed CVA Material
 * form field described by an OpenUI control node (`TextInputs` or `RangeControl`).
 *
 * @param subject Diagnostic subject for the node (see `astNodeSubject`).
 */
export function compileFormFieldFromAst(
  node: OpenUiElement,
  options: FormFieldAstOptions,
  subject: string,
): Rule {
  const controlType = controlTypeFromAst(node, subject) as FormFieldControlType;
  const flatOptions: CanonicalFormFieldOptions = {
    name: options.name ?? strings.dasherize(controlName(node)),
    path: options.path,
    project: options.project,
    controlType,
    appearance: readAstString(node, CONTROL_ATTRIBUTES.appearance) as FormFieldAppearance,
    subscriptSizing: readAstString(
      node,
      CONTROL_ATTRIBUTES.subscriptSizing,
    ) as FormFieldSubscriptSizing,
  };

  return (tree: Tree) => {
    const resolved = resolveOptions(tree, flatOptions);
    assertNoCollision(tree, resolved);

    tree.create(
      resolved.componentPath,
      formFieldComponentSource({
        name: resolved.name,
        controlType: resolved.controlType,
        appearance: resolved.appearance,
        subscriptSizing: resolved.subscriptSizing,
      }),
    );
    tree.create(resolved.templatePath, formFieldTemplate());
    tree.create(resolved.stylesheetPath, '');
    return tree;
  };
}

function assertFieldName(name: string): void {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name ?? '')) {
    throw new SchematicsException('The field name must be non-empty kebab-case.');
  }
}

function resolveOptions(tree: Tree, options: CanonicalFormFieldOptions): ResolvedFormFieldOptions {
  assertFieldName(options.name);

  const workspace = readWorkspace(tree);
  const projectName = resolveApplicationProjectName(workspace, options.project);
  const project = requireWorkspaceProject(workspace, projectName);
  const targetDirectory = resolveApplicationTargetDirectory(project, options.path, DEFAULT_PATH);
  assertPackageDependencies(tree, 'Material form-field generation', [
    '@angular/forms',
    '@angular/material',
    '@angular/cdk',
  ]);

  const controlType = options.controlType ?? 'text';
  const appearance = options.appearance ?? 'fill';
  const subscriptSizing = options.subscriptSizing ?? 'fixed';
  assertEnum(controlType, FORM_FIELD_CONTROL_TYPES, 'control type');
  assertEnum(appearance, FORM_FIELD_APPEARANCES, 'appearance');
  assertEnum(subscriptSizing, FORM_FIELD_SUBSCRIPT_SIZINGS, 'subscript sizing');

  const primitive = formFieldPrimitiveDescriptor(options.name, targetDirectory);
  const componentDirectory = path.posix.dirname(primitive.componentPath);
  return {
    name: options.name,
    componentPath: primitive.componentPath,
    templatePath: path.posix.join(componentDirectory, `${options.name}-field.html`),
    stylesheetPath: path.posix.join(componentDirectory, `${options.name}-field.scss`),
    controlType,
    appearance,
    subscriptSizing,
  };
}

function assertNoCollision(tree: Tree, options: ResolvedFormFieldOptions): void {
  const existingPaths = [
    options.componentPath,
    options.templatePath,
    options.stylesheetPath,
  ].filter((filePath) => tree.exists(filePath));
  if (existingPaths.length > 0) {
    throw new SchematicsException(
      `A form field named "${options.name}" already exists at ${existingPaths.join(', ')}. Choose a different name or remove the existing output first.`,
    );
  }
}

function assertEnum<T extends string>(
  value: string,
  allowed: readonly T[],
  label: string,
): asserts value is T {
  if (!allowed.includes(value as T)) {
    throw new SchematicsException(
      `Unsupported form-field ${label} "${value}". Supported values: ${allowed.join(', ')}.`,
    );
  }
}
