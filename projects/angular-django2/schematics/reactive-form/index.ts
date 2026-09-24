import { strings } from '@angular-devkit/core';
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import * as path from 'node:path';
import {
  formFieldPrimitiveDescriptor,
  type FormFieldPrimitiveDescriptor,
} from '../form-field/generate';
import type { OpenUiElement } from '@shlomoa/openui-spec';
import {
  astNodeSubject,
  readAstNode,
  type AstCompilationContext,
  type AstCompilationResult,
} from '../utility/ast-compiler';
import { assertPackageDependencies } from '../utility/package-json';
import { resolveApplicationTargetDirectory } from '../utility/project-relative-path';
import {
  readWorkspace,
  requireWorkspaceProject,
  resolveApplicationProjectName,
  type WorkspaceProject,
} from '../utility/workspace';
import { FORM_AST_TYPE, reactiveFormDefinitionFromAst, reactiveFormDefinitionToAst } from './ast';
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
const ALLOWED_OPTIONS = new Set([
  'name',
  'definition',
  'document',
  'nodeId',
  'path',
  'project',
  'primitivesPath',
]);
const REQUIRED_DEPENDENCIES = ['@angular/forms', '@angular/material', '@angular/cdk'] as const;

/** Options that stay on the CLI when a form is compiled from an OpenUI node. */
export interface FormCompilationOptions {
  /** Kebab-case base name for the generated form component. */
  readonly name: string;
  /** Workspace-relative directory scanned for reusable field primitives. */
  readonly primitivesDirectory: string;
  /** Diagnostic subject for the node (a definition path or `<document>#<nodeId>`). */
  readonly subject: string;
}

/**
 * Generate a typed standalone OnPush Angular Material reactive form from an
 * OpenUI `Form` node (`--document`) or from a legacy isolated JSON definition
 * (`--definition`), which is first translated into a synthetic `Form` node.
 *
 * All validation runs before the first tree mutation, so an invalid document or
 * definition, an ambiguous field primitive, or a missing integration artifact
 * never leaves partial output behind.
 */
export function reactiveForm(options: ReactiveFormSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    assertSupportedOptions(options);
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(options.name ?? '')) {
      throw new SchematicsException('The reactive-form name must be non-empty kebab-case.');
    }

    const workspace = readWorkspace(tree);
    const projectName = resolveApplicationProjectName(workspace, options.project);
    const project = requireWorkspaceProject(workspace, projectName);
    const destinationPath = resolveApplicationTargetDirectory(project, options.path, DEFAULT_PATH);
    const primitivesDirectory = resolveApplicationTargetDirectory(
      project,
      options.primitivesPath,
      DEFAULT_PRIMITIVES_PATH,
    );
    assertPackageDependencies(tree, 'reactive-form', REQUIRED_DEPENDENCIES);

    const { node, subject } = resolveFormNode(tree, options);
    if (options.document === undefined) {
      context.logger.warn(definitionDeprecationWarning(subject, node));
    }
    compileFormFromAst(
      node,
      { tree, context, workspace, projectName, project, destinationPath },
      { name: options.name, primitivesDirectory, subject },
    );

    return tree;
  };
}

/** Options for a `Form` node nested in a composed OpenUI container. */
export interface NestedFormCompilationOptions {
  /** Kebab-case base name for the generated form component. */
  readonly name: string;
  /** Target Angular project name. */
  readonly project: string;
  /** Workspace-relative directory that receives the form component directory. */
  readonly destinationPath: string;
  /** Diagnostic subject for the node (`<document>#<nodeId>`). */
  readonly subject: string;
}

/**
 * Rule form of `compileFormFromAst` for a `Form` node nested in a composed
 * OpenUI container (plan step 3.3). Uses the default primitives directory.
 */
export function compileNestedFormFromAst(
  form: OpenUiElement,
  options: NestedFormCompilationOptions,
): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const workspace = readWorkspace(tree);
    const project = requireWorkspaceProject(workspace, options.project);
    assertPackageDependencies(tree, 'reactive-form', REQUIRED_DEPENDENCIES);
    compileFormFromAst(
      form,
      {
        tree,
        context,
        workspace,
        projectName: options.project,
        project,
        destinationPath: options.destinationPath,
      },
      {
        name: options.name,
        primitivesDirectory: resolveApplicationTargetDirectory(
          project,
          undefined,
          DEFAULT_PRIMITIVES_PATH,
        ),
        subject: options.subject,
      },
    );

    return tree;
  };
}

/**
 * Pure AST compiler: generate the reactive-form component for one OpenUI
 * `Form` node into `context.destinationPath`.
 *
 * When every output already exists it logs a warning and writes nothing; a
 * partially present output is rejected.
 *
 * @throws SchematicsException for any invalid input, before the first mutation.
 */
export function compileFormFromAst(
  form: OpenUiElement,
  context: AstCompilationContext,
  options: FormCompilationOptions,
): AstCompilationResult {
  const { tree } = context;
  const definition = reactiveFormDefinitionFromAst(form, options.subject);

  const names = reactiveFormNames(options.name);
  const componentDirectory = path.posix.join(context.destinationPath, names.fileName);
  const fields = definition.fields.map((field) =>
    resolveField(tree, field, options.primitivesDirectory, componentDirectory),
  );
  const integration = definition.integration
    ? resolveIntegration(tree, context.project, definition.integration, componentDirectory)
    : undefined;

  const componentPath = path.posix.join(componentDirectory, `${names.fileName}.ts`);
  const templatePath = path.posix.join(componentDirectory, `${names.fileName}.html`);
  const stylesheetPath = path.posix.join(componentDirectory, `${names.fileName}.scss`);
  const outputs = [componentPath, templatePath, stylesheetPath];
  const result: AstCompilationResult = {
    nodeId: form.id,
    files: outputs,
    symbolName: names.className,
    selector: names.selector,
    importPath: componentPath.replace(/\.ts$/, ''),
  };

  const existingOutputs = outputs.filter((output) => tree.exists(output));
  if (existingOutputs.length > 0 && existingOutputs.length !== outputs.length) {
    throw new SchematicsException(
      `reactive-form output is only partially present: ${existingOutputs.join(', ')}. ` +
        'Remove the remaining files or choose another name; reactive-form never rewrites part of a form.',
    );
  }
  if (existingOutputs.length > 0) {
    context.context.logger.warn(
      `${componentPath} already exists; skipping reactive-form generation.`,
    );
    return result;
  }

  const templateOptions = buildTemplateOptions(
    options.name,
    names,
    definition,
    fields,
    integration,
  );
  tree.create(componentPath, reactiveFormComponentSource(templateOptions));
  tree.create(templatePath, reactiveFormTemplate(templateOptions));
  tree.create(stylesheetPath, reactiveFormStylesheet(templateOptions));

  return result;
}

/**
 * Non-breaking deprecation warning for `--definition` (plan step 6.1). It
 * carries the equivalent OpenUI `Form` node, so converting a definition needs
 * no separate tool.
 *
 * @internal exported for direct unit testing.
 */
export function definitionDeprecationWarning(definitionPath: string, form: OpenUiElement): string {
  return (
    `--definition (reactiveFormDefinition) is deprecated; compile an OpenUI Form document with ` +
    `--document instead. To convert "${definitionPath}", add this Form node to the children of an ` +
    'OpenUI 0.3.0 document (see docs/cli/reactive-form.md#openui-form-documents) and pass ' +
    `--document=<document> --nodeId=${form.id}:\n${JSON.stringify(form, null, 2)}`
  );
}

/**
 * Schema resolver / CLI adapter: resolve the `Form` node from `--document`, or
 * translate a legacy `--definition` file into a synthetic `Form` node.
 */
function resolveFormNode(
  tree: Tree,
  options: ReactiveFormSchema,
): { node: OpenUiElement; subject: string } {
  if (options.document !== undefined) {
    if (options.definition !== undefined) {
      throw new SchematicsException('Pass either --definition or --document, not both.');
    }
    const node = readAstNode(tree, options.document, options.nodeId, FORM_AST_TYPE);
    return { node, subject: astNodeSubject(options.document, node) };
  }
  if (options.nodeId !== undefined) {
    throw new SchematicsException('--nodeId requires --document.');
  }

  const definitionPath = resolveDefinitionPath(options.definition);
  const definitionContent = tree.read(`/${definitionPath}`);
  if (!definitionContent) {
    throw new SchematicsException(
      `The reactive-form definition "${definitionPath}" was not found in the workspace.`,
    );
  }
  const definition = parseReactiveFormDefinition(definitionContent.toString(), definitionPath);

  return {
    node: reactiveFormDefinitionToAst(definition, options.name),
    subject: definitionPath,
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

function resolveDefinitionPath(definition: string | undefined): string {
  const normalized = normalizeWorkspacePath(definition ?? '');
  if (!normalized || (definition ?? '').split(/[\\/]+/).includes('..')) {
    throw new SchematicsException(
      'Pass --definition with the workspace-relative path of the JSON form definition, ' +
        'or --document with an OpenUI document.',
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
 * Compose the canonical reusable field primitive generated for this field when
 * it exists locally.
 *
 * `field-component` delegates to `form-field`, so both schematics produce the
 * same canonical component path and contract. Resolution therefore needs no
 * generated-source parsing or secondary competing layout.
 */
function resolveField(
  tree: Tree,
  field: ReactiveFormFieldDefinition,
  primitivesDirectory: string,
  componentDirectory: string,
): ResolvedReactiveFormField {
  const descriptor = formFieldPrimitiveDescriptor(
    strings.dasherize(field.name),
    primitivesDirectory,
  );
  if (!tree.exists(`/${descriptor.componentPath}`)) {
    return { definition: field };
  }

  return {
    definition: field,
    primitive: resolvedPrimitive(descriptor, componentDirectory),
  };
}

function resolvedPrimitive(
  descriptor: FormFieldPrimitiveDescriptor,
  componentDirectory: string,
): ReactiveFormPrimitive {
  return {
    className: descriptor.className,
    selector: descriptor.selector,
    importPath: relativeImportPath(componentDirectory, descriptor.componentPath),
    bindings: descriptor.bindings,
  };
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
