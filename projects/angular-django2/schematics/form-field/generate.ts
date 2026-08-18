import type { Rule, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import * as path from 'node:path';
import { assertPackageDependencies } from '../utility/package-json';
import { resolveApplicationTargetDirectory } from '../utility/project-relative-path';
import {
  readWorkspace,
  requireWorkspaceProject,
  type WorkspaceProject,
} from '../utility/workspace';
import {
  FORM_FIELD_APPEARANCES,
  FORM_FIELD_CONTROL_TYPES,
  FORM_FIELD_SUBSCRIPT_SIZINGS,
  type FormFieldAppearance,
  type FormFieldControlType,
  type FormFieldSubscriptSizing,
} from './schema';
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

interface ResolvedFormFieldOptions {
  name: string;
  componentPath: string;
  templatePath: string;
  stylesheetPath: string;
  controlType: FormFieldControlType;
  appearance: FormFieldAppearance;
  subscriptSizing: FormFieldSubscriptSizing;
}

/** @internal Shared implementation for Material native-control CVA schematics. */
export function generateFormField(options: CanonicalFormFieldOptions): Rule {
  return (tree: Tree) => {
    const resolved = resolveOptions(tree, options);
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

function resolveOptions(tree: Tree, options: CanonicalFormFieldOptions): ResolvedFormFieldOptions {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(options.name)) {
    throw new SchematicsException('The field name must be non-empty kebab-case.');
  }

  const workspace = readWorkspace(tree);
  const projectName = resolveProjectName(workspace.projects ?? {}, options.project);
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

  const componentName = `${options.name}-field`;
  const componentDirectory = path.posix.join(targetDirectory, componentName);
  return {
    name: options.name,
    componentPath: path.posix.join(componentDirectory, `${componentName}.ts`),
    templatePath: path.posix.join(componentDirectory, `${componentName}.html`),
    stylesheetPath: path.posix.join(componentDirectory, `${componentName}.scss`),
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
  ].filter((path) => tree.exists(path));
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

function resolveProjectName(
  projects: Record<string, WorkspaceProject>,
  requestedProject: string | undefined,
): string {
  if (requestedProject) {
    return requestedProject;
  }

  const applicationProjects = Object.entries(projects)
    .filter(([, project]) => !!project.sourceRoot)
    .map(([name]) => name);
  if (applicationProjects.length !== 1) {
    throw new SchematicsException(
      'Specify --project when the workspace does not have exactly one application sourceRoot.',
    );
  }

  return applicationProjects[0];
}
