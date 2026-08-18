import { strings } from '@angular-devkit/core';
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import * as path from 'node:path';
import { assertPackageDependencies } from '../utility/package-json';
import { resolveApplicationTargetDirectory } from '../utility/project-relative-path';
import {
  readWorkspace,
  requireWorkspaceProject,
  type WorkspaceProject,
} from '../utility/workspace';
import { parseReactiveFormDefinition } from './definition';
import type {
  ReactiveFormDefinition,
  ReactiveFormFieldDefinition,
  ReactiveFormIntegrationDefinition,
  ReactiveFormSchema,
} from './schema';
import {
  reactiveFormComponentSource,
  reactiveFormNames,
  reactiveFormStylesheet,
  reactiveFormTemplate,
  type ReactiveFormPrimitive,
  type ReactiveFormTemplateOptions,
  type ResolvedReactiveFormField,
  type ResolvedReactiveFormIntegration,
} from './templates';

const DEFAULT_PATH = 'src/app/features';
const DEFAULT_PRIMITIVES_PATH = 'src/app/shared/form-helpers';
const ALLOWED_OPTIONS = new Set(['name', 'definition', 'path', 'project', 'primitivesPath']);
const REQUIRED_DEPENDENCIES = ['@angular/forms', '@angular/material', '@angular/cdk'] as const;

interface ResolvedReactiveFormOptions {
  templateOptions: ReactiveFormTemplateOptions;
  componentPath: string;
  templatePath: string;
  stylesheetPath: string;
  existingOutputs: readonly string[];
}

/**
 * Generate a typed standalone OnPush Angular Material reactive form from a
 * single isolated JSON definition contract.
 *
 * All validation runs before the first tree mutation, so an invalid definition,
 * an ambiguous field primitive, or a missing integration artifact never leaves
 * partial output behind.
 */
export function reactiveForm(options: ReactiveFormSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const resolved = resolveOptions(tree, options);

    if (resolved.existingOutputs.length > 0) {
      context.logger.warn(
        `${resolved.componentPath} already exists; skipping reactive-form generation.`,
      );
      return tree;
    }

    tree.create(resolved.componentPath, reactiveFormComponentSource(resolved.templateOptions));
    tree.create(resolved.templatePath, reactiveFormTemplate(resolved.templateOptions));
    tree.create(resolved.stylesheetPath, reactiveFormStylesheet(resolved.templateOptions));

    return tree;
  };
}

function resolveOptions(tree: Tree, options: ReactiveFormSchema): ResolvedReactiveFormOptions {
  assertSupportedOptions(options);
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(options.name ?? '')) {
    throw new SchematicsException('The reactive-form name must be non-empty kebab-case.');
  }

  const workspace = readWorkspace(tree);
  const projectName = resolveProjectName(workspace.projects ?? {}, options.project);
  const project = requireWorkspaceProject(workspace, projectName);
  const targetDirectory = resolveApplicationTargetDirectory(project, options.path, DEFAULT_PATH);
  const primitivesDirectory = resolveApplicationTargetDirectory(
    project,
    options.primitivesPath,
    DEFAULT_PRIMITIVES_PATH,
  );
  assertPackageDependencies(tree, 'reactive-form', REQUIRED_DEPENDENCIES);

  const definitionPath = resolveDefinitionPath(options.definition);
  const definitionContent = tree.read(`/${definitionPath}`);
  if (!definitionContent) {
    throw new SchematicsException(
      `The reactive-form definition "${definitionPath}" was not found in the workspace.`,
    );
  }
  const definition = parseReactiveFormDefinition(definitionContent.toString(), definitionPath);

  const names = reactiveFormNames(options.name);
  const componentDirectory = path.posix.join(targetDirectory, names.fileName);
  const fields = definition.fields.map((field) =>
    resolveField(tree, field, primitivesDirectory, componentDirectory),
  );
  const integration = definition.integration
    ? resolveIntegration(tree, project, definition.integration, componentDirectory)
    : undefined;

  const componentPath = path.posix.join(componentDirectory, `${names.fileName}.ts`);
  const templatePath = path.posix.join(componentDirectory, `${names.fileName}.html`);
  const stylesheetPath = path.posix.join(componentDirectory, `${names.fileName}.scss`);
  const outputs = [componentPath, templatePath, stylesheetPath];
  const existingOutputs = outputs.filter((output) => tree.exists(output));
  if (existingOutputs.length > 0 && existingOutputs.length !== outputs.length) {
    throw new SchematicsException(
      `reactive-form output is only partially present: ${existingOutputs.join(', ')}. ` +
        'Remove the remaining files or choose another name; reactive-form never rewrites part of a form.',
    );
  }

  return {
    templateOptions: buildTemplateOptions(options.name, names, definition, fields, integration),
    componentPath,
    templatePath,
    stylesheetPath,
    existingOutputs,
  };
}

function buildTemplateOptions(
  name: string,
  names: ReturnType<typeof reactiveFormNames>,
  definition: ReactiveFormDefinition,
  fields: readonly ResolvedReactiveFormField[],
  integration: ResolvedReactiveFormIntegration | undefined,
): ReactiveFormTemplateOptions {
  return {
    name,
    fileName: names.fileName,
    className: names.className,
    selector: names.selector,
    definition,
    fields,
    ...(integration ? { integration } : {}),
  };
}

function assertSupportedOptions(options: ReactiveFormSchema): void {
  const unknown = Object.keys(options).filter((option) => !ALLOWED_OPTIONS.has(option));
  if (unknown.length > 0) {
    throw new SchematicsException(`Unsupported reactive-form option(s): ${unknown.join(', ')}.`);
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

function resolveDefinitionPath(definition: string | undefined): string {
  const normalized = normalizeWorkspacePath(definition ?? '');
  if (!normalized || (definition ?? '').split(/[\\/]+/).includes('..')) {
    throw new SchematicsException(
      'Pass --definition with the workspace-relative path of the JSON form definition.',
    );
  }
  if (!normalized.endsWith('.json')) {
    throw new SchematicsException(
      `The reactive-form definition "${normalized}" must be a .json file.`,
    );
  }

  return normalized;
}

/**
 * Compose the reusable field primitive generated for this field when exactly
 * one exists locally. Two or more candidates are ambiguous and rejected.
 *
 * Only the documented primitive layouts are considered, so discovery stays
 * deterministic: `<field>-field/<field>-field.ts` (the `form-field` layout),
 * `<field>/<field>.ts` (the `field-component` layout), and the `.component.ts`
 * variant of each.
 */
function resolveField(
  tree: Tree,
  field: ReactiveFormFieldDefinition,
  primitivesDirectory: string,
  componentDirectory: string,
): ResolvedReactiveFormField {
  const fieldName = strings.dasherize(field.name);
  const candidates: { filePath: string; primitive: ReactiveFormPrimitive }[] = [];

  for (const directoryName of [`${fieldName}-field`, fieldName]) {
    for (const fileName of [`${directoryName}.ts`, `${directoryName}.component.ts`]) {
      const filePath = path.posix.join(primitivesDirectory, directoryName, fileName);
      const content = tree.read(`/${filePath}`)?.toString();
      if (!content) {
        continue;
      }

      const primitive = readPrimitive(content, filePath, componentDirectory, field);
      if (primitive) {
        candidates.push({ filePath, primitive });
      }
    }
  }

  if (candidates.length > 1) {
    throw new SchematicsException(
      `Field "${field.name}" matches more than one form-field primitive: ${candidates
        .map((candidate) => candidate.filePath)
        .join(', ')}. Remove the ambiguity or point --primitives-path at a single directory.`,
    );
  }

  return candidates.length === 1
    ? { definition: field, primitive: candidates[0].primitive }
    : { definition: field };
}

function readPrimitive(
  content: string,
  filePath: string,
  componentDirectory: string,
  field: ReactiveFormFieldDefinition,
): ReactiveFormPrimitive | null {
  if (!content.includes('implements ControlValueAccessor')) {
    return null;
  }

  const className = /export class (\w+)/.exec(content)?.[1];
  const selector = /selector:\s*'([^']+)'/.exec(content)?.[1];
  if (!className || !selector) {
    return null;
  }

  return {
    className,
    selector,
    importPath: relativeImportPath(componentDirectory, filePath),
    inputs: {
      fieldId: hasInput(content, 'fieldId'),
      label: hasInput(content, 'label'),
      hint: hasInput(content, 'hint'),
      placeholder: hasInput(content, 'placeholder'),
      required: hasInput(content, 'required'),
      controlType: hasInput(content, 'controlType') && content.includes(`'${field.control}'`),
      serverErrors: hasInput(content, 'serverErrors'),
    },
  };
}

function hasInput(content: string, name: string): boolean {
  return (
    new RegExp(`@Input\\([^)]*\\)\\s+(?:set\\s+)?${name}\\b`).test(content) ||
    new RegExp(`\\b${name}\\s*=\\s*input(?:\\.required)?\\s*[(<]`).test(content)
  );
}

/**
 * Resolve the optional integration artifact. The artifact must already exist
 * locally and must export the declared symbol and method.
 */
function resolveIntegration(
  tree: Tree,
  project: WorkspaceProject,
  integration: ReactiveFormIntegrationDefinition,
  componentDirectory: string,
): ResolvedReactiveFormIntegration {
  const normalized = normalizeWorkspacePath(integration.artifact);
  if (!normalized.endsWith('.ts')) {
    throw new SchematicsException(
      `The reactive-form integration artifact "${integration.artifact}" must be a TypeScript file.`,
    );
  }

  const requestedDirectory = path.posix.dirname(normalized);
  const artifactDirectory = resolveApplicationTargetDirectory(
    project,
    requestedDirectory,
    requestedDirectory,
  );
  const artifactPath = path.posix.join(artifactDirectory, path.posix.basename(normalized));
  const content = tree.read(`/${artifactPath}`)?.toString();
  if (!content) {
    throw new SchematicsException(
      `The reactive-form integration artifact "${artifactPath}" does not exist. ` +
        'Generate or remove it before composing it into a form.',
    );
  }
  if (!new RegExp(`export\\s+(?:abstract\\s+)?class\\s+${integration.symbol}\\b`).test(content)) {
    throw new SchematicsException(
      `The reactive-form integration artifact "${artifactPath}" does not export class "${integration.symbol}".`,
    );
  }
  if (!new RegExp(`\\b${integration.method}\\b\\s*[(<]`).test(content)) {
    throw new SchematicsException(
      `"${integration.symbol}" in "${artifactPath}" does not declare a "${integration.method}" member.`,
    );
  }

  return {
    symbol: integration.symbol,
    method: integration.method,
    importPath: relativeImportPath(componentDirectory, artifactPath),
    propertyName: strings.camelize(integration.symbol),
  };
}

function relativeImportPath(fromDirectory: string, targetPath: string): string {
  const relative = path.posix.relative(`/${fromDirectory}`, `/${targetPath}`).replace(/\.ts$/, '');

  return relative.startsWith('.') ? relative : `./${relative}`;
}

function normalizeWorkspacePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/g, '').replace(/\/+$/g, '');
}
