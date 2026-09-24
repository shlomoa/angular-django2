import { strings } from '@angular-devkit/core';
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { chain, externalSchematic, SchematicsException } from '@angular-devkit/schematics';
import type { OpenUiElement } from '@shlomoa/openui-spec';
import * as path from 'node:path';
import type {
  ComplexComponentFeature,
  ComplexComponentMode,
  ComplexComponentSchema,
} from './schema';
import {
  compileAstChild,
  escapeTemplateText,
  SURFACE_CONTAINER_AST_TYPE,
  SURFACE_CONTAINER_ATTRIBUTES,
} from '../component/ast';
import { AST_SLOT_ATTRIBUTE, composeAstChildren } from '../embed-component/compose';
import { templateSectionMarkers } from '../embed-component/index';
import {
  assertAstAttributes,
  astNodeSubject,
  readAstNode,
  readAstString,
} from '../utility/ast-compiler';
import {
  readWorkspace,
  requireWorkspaceProject,
  resolveApplicationProjectName,
  type WorkspaceProject,
} from '../utility/workspace';

const FEATURES: readonly ComplexComponentFeature[] = [
  'mixins',
  'nested',
  'projection',
  'cdk-overlay',
];
const NESTED_CHILD_SUFFIXES = ['header', 'content'] as const;

/** OpenUI catalog type of the optional overlay configuration child. */
export const OVERLAY_CONTAINER_AST_TYPE = 'OverlayContainers';

/** Catalog-style attribute keys understood on the overlay configuration child. */
export const OVERLAY_CONTAINER_ATTRIBUTES = { label: '[label]' } as const;

const DEFAULT_OVERLAY_LABEL = 'Toggle details';

/** A complex component compiled from an OpenUI `SurfaceContainers` node. */
interface ComplexComponentDocument {
  documentPath: string;
  node: OpenUiElement;
  title: string | undefined;
  /** Children composed into the header, content, and actions slots. */
  children: readonly OpenUiElement[];
  /** The `OverlayContainers` child, when present. */
  overlay: OpenUiElement | undefined;
}

interface ResolvedComplexComponentOptions {
  name: string;
  project: string;
  sourceRoot: string;
  componentDirectory: string;
  componentPath: string;
  templatePath: string;
  features: readonly ComplexComponentFeature[];
  mode: ComplexComponentMode;
  document: ComplexComponentDocument | undefined;
}

/**
 * Generate or maintain an Angular Material component that composes the
 * collection's component and embed-component schematics for common advanced
 * component features.
 *
 * With `--document`, the component is compiled from an OpenUI
 * `SurfaceContainers` node instead of a feature list: its children are compiled
 * and embedded into the header, content, and actions slots, and an
 * `OverlayContainers` child adds the CDK overlay.
 */
export function complexComponent(options: ComplexComponentSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const resolved = resolveOptions(tree, options, resolveDocument(tree, options));

    if (resolved.mode === 'delete') {
      if (!options.confirm) {
        throw new SchematicsException('Deleting a complex component requires --confirm=true.');
      }

      return deleteComplexComponent(resolved)(tree, context);
    }

    assertMaterialPrerequisites(tree);

    const rules: Rule[] = [];
    if (resolved.mode === 'create') {
      rules.push(
        externalSchematic('angular-django2', 'component', {
          name: resolved.name,
          path: withoutLeadingSlash(path.posix.dirname(resolved.componentDirectory)),
          project: resolved.project,
          standalone: true,
          changeDetection: 'OnPush',
        }),
      );
    }

    rules.push(applyComplexFeatures(resolved));

    if (resolved.document) {
      rules.push(composeDocumentChildren(resolved, resolved.document));
    }

    if (resolved.features.includes('nested')) {
      for (const suffix of NESTED_CHILD_SUFFIXES) {
        const childName = `${resolved.name}-${suffix}`;
        const childDirectory = path.posix.join(resolved.componentDirectory, childName);
        const childPath = path.posix.join(childDirectory, `${childName}.ts`);

        if (!tree.exists(childPath)) {
          rules.push(
            externalSchematic('angular-django2', 'component', {
              name: childName,
              path: withoutLeadingSlash(resolved.componentDirectory),
              project: resolved.project,
              standalone: true,
              changeDetection: 'OnPush',
            }),
          );
        }
        rules.push(
          externalSchematic('angular-django2', 'embed-component', {
            component: withoutLeadingSlash(childPath),
            parent: withoutLeadingSlash(resolved.componentPath),
          }),
        );
      }
    }

    return chain(rules)(tree, context);
  };
}

/**
 * Schema resolver for `--document`: resolve and validate the `SurfaceContainers`
 * node before any mutation.
 */
function resolveDocument(
  tree: Tree,
  options: ComplexComponentSchema,
): ComplexComponentDocument | undefined {
  if (options.document === undefined) {
    if (options.nodeId !== undefined) {
      throw new SchematicsException('--nodeId requires --document.');
    }
    return undefined;
  }
  if (options.features !== undefined) {
    throw new SchematicsException(
      '--document cannot be combined with --features; the OpenUI node describes the component.',
    );
  }
  if ((options.mode ?? 'create') !== 'create') {
    throw new SchematicsException('--document supports only --mode=create.');
  }

  const documentPath = options.document;
  const node = readAstNode(tree, documentPath, options.nodeId, SURFACE_CONTAINER_AST_TYPE);
  const subject = astNodeSubject(documentPath, node);
  assertAstAttributes(node, Object.values(SURFACE_CONTAINER_ATTRIBUTES), subject);

  const overlays = (node.children ?? []).filter(
    (child) => child.type === OVERLAY_CONTAINER_AST_TYPE,
  );
  if (overlays.length > 1) {
    throw new SchematicsException(
      `OpenUI node "${subject}" has ${overlays.length} ${OVERLAY_CONTAINER_AST_TYPE} children; at most one is supported.`,
    );
  }
  const overlay = overlays[0];
  if (overlay) {
    const overlaySubject = astNodeSubject(documentPath, overlay);
    assertAstAttributes(overlay, Object.values(OVERLAY_CONTAINER_ATTRIBUTES), overlaySubject);
    const slotted = (overlay.children ?? []).find(
      (child) => readAstString(child, AST_SLOT_ATTRIBUTE) !== undefined,
    );
    if (slotted) {
      throw new SchematicsException(
        `OpenUI node "${astNodeSubject(documentPath, slotted)}" is inside an ${OVERLAY_CONTAINER_AST_TYPE} ` +
          `and cannot choose a ${AST_SLOT_ATTRIBUTE}; overlay children always go into the overlay.`,
      );
    }
  }

  return {
    documentPath,
    node,
    title: readAstString(node, SURFACE_CONTAINER_ATTRIBUTES.title),
    children: (node.children ?? []).filter((child) => child !== overlay),
    overlay,
  };
}

function resolveOptions(
  tree: Tree,
  options: ComplexComponentSchema,
  document: ComplexComponentDocument | undefined,
): ResolvedComplexComponentOptions {
  const name = options.name ?? (document ? strings.dasherize(document.node.id) : '');
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)) {
    throw new SchematicsException('The component name must be non-empty kebab-case.');
  }

  const features: ComplexComponentFeature[] = document
    ? ['projection', ...(document.overlay ? (['cdk-overlay'] as const) : [])]
    : parseFeatures(options.features ?? '');
  const mode = options.mode ?? 'create';
  const workspace = readWorkspace(tree);
  const projectName = resolveApplicationProjectName(workspace, options.project);
  const project = requireWorkspaceProject(workspace, projectName);
  const sourceRoot = normalizeWorkspacePath(project.sourceRoot ?? '');
  if (!sourceRoot) {
    throw new SchematicsException(`Project "${projectName}" has no application sourceRoot.`);
  }

  const targetDirectory = resolveTargetDirectory(options.path, project, sourceRoot);
  const componentDirectory = path.posix.join(targetDirectory, name);

  return {
    name,
    project: projectName,
    sourceRoot,
    componentDirectory,
    componentPath: path.posix.join(componentDirectory, `${name}.ts`),
    templatePath: path.posix.join(componentDirectory, `${name}.html`),
    features,
    mode,
    document,
  };
}

/**
 * Compile every document child into its own component under the complex
 * component's directory and embed it: slot children by their `[slot]`, overlay
 * children into the `overlay` section.
 */
function composeDocumentChildren(
  resolved: ResolvedComplexComponentOptions,
  document: ComplexComponentDocument,
): Rule {
  const target = {
    directory: withoutLeadingSlash(resolved.componentDirectory),
    project: resolved.project,
    documentPath: document.documentPath,
  };
  const children = [
    ...document.children.map((child) => compileAstChild(child, target)),
    ...(document.overlay?.children ?? []).map((child) => compileAstChild(child, target, 'overlay')),
  ];

  return composeAstChildren(withoutLeadingSlash(resolved.componentPath), children);
}

function parseFeatures(value: string): ComplexComponentFeature[] {
  const features = value
    .split(',')
    .map((feature) => feature.trim())
    .filter(Boolean);

  if (features.length === 0) {
    throw new SchematicsException('The feature list must contain at least one supported feature.');
  }

  const unknown = features.filter(
    (feature): feature is string => !FEATURES.includes(feature as ComplexComponentFeature),
  );
  if (unknown.length > 0) {
    throw new SchematicsException(
      `Unsupported complex-component feature(s): ${unknown.join(', ')}. Supported features: ${FEATURES.join(', ')}.`,
    );
  }

  return [...new Set(features)] as ComplexComponentFeature[];
}

function resolveTargetDirectory(
  requestedPath: string,
  project: WorkspaceProject,
  sourceRoot: string,
): string {
  const normalizedPath = normalizeWorkspacePath(requestedPath);
  if (!normalizedPath || requestedPath.split(/[\\/]+/).includes('..')) {
    throw new SchematicsException(
      'The target path must be a non-empty path within the application source tree.',
    );
  }

  const projectRoot = normalizeWorkspacePath(project.root ?? '');
  const targetDirectory =
    isWithin(normalizedPath, sourceRoot) || (projectRoot && isWithin(normalizedPath, projectRoot))
      ? normalizedPath
      : normalizeWorkspacePath(path.posix.join(projectRoot, normalizedPath));

  if (!isWithin(targetDirectory, sourceRoot)) {
    throw new SchematicsException(
      `The target path "${requestedPath}" must be within the application source root "${sourceRoot}".`,
    );
  }

  return `/${targetDirectory}`;
}

function assertMaterialPrerequisites(tree: Tree): void {
  const packageJson = tree.read('/package.json');
  if (!packageJson) {
    throw new SchematicsException(
      'complex-component requires package.json with @angular/material and @angular/cdk dependencies.',
    );
  }

  const parsed = JSON.parse(packageJson.toString()) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const dependencies = { ...parsed.devDependencies, ...parsed.dependencies };
  if (dependencies['angular-django2']) {
    return;
  }
  const missing = ['@angular/material', '@angular/cdk'].filter(
    (dependency) => !dependencies[dependency],
  );
  if (missing.length > 0) {
    throw new SchematicsException(
      `complex-component requires installed Angular Material/CDK prerequisites: ${missing.join(', ')}.`,
    );
  }
}

function applyComplexFeatures(resolved: ResolvedComplexComponentOptions): Rule {
  return (tree: Tree) => {
    if (!tree.exists(resolved.componentPath) || !tree.exists(resolved.templatePath)) {
      throw new SchematicsException(
        `Complex component files were not found at ${resolved.componentDirectory}. Use --mode=create first.`,
      );
    }

    const componentContent = tree.read(resolved.componentPath)!.toString();
    const templateContent = tree.read(resolved.templatePath)!.toString();
    const updatedComponent = updateComponentSource(componentContent, resolved);
    const updatedTemplate = updateComponentTemplate(templateContent, resolved);

    if (updatedComponent !== componentContent) {
      tree.overwrite(resolved.componentPath, updatedComponent);
    }
    if (updatedTemplate !== templateContent) {
      tree.overwrite(resolved.templatePath, updatedTemplate);
    }
    if (resolved.features.includes('mixins')) {
      registerThemeMixin(tree, resolved);
    }

    return tree;
  };
}

function updateComponentSource(content: string, resolved: ResolvedComplexComponentOptions): string {
  let result = addImport(content, 'MatCardModule', '@angular/material/card');
  result = addToImportsArray(result, 'MatCardModule');
  result = addPublicApiDocumentation(result, resolved);

  if (resolved.features.includes('cdk-overlay')) {
    result = addImport(result, 'MatButtonModule', '@angular/material/button');
    result = addImport(result, 'CdkConnectedOverlay, CdkOverlayOrigin', '@angular/cdk/overlay');
    result = addImport(result, 'signal', '@angular/core');
    result = addToImportsArray(result, 'MatButtonModule');
    result = addToImportsArray(result, 'CdkConnectedOverlay');
    result = addToImportsArray(result, 'CdkOverlayOrigin');
    result = addClassMember(
      result,
      'protected readonly overlayOpen = signal(false);',
      'overlayOpen = signal(false)',
    );
  }

  return result;
}

function updateComponentTemplate(
  content: string,
  resolved: ResolvedComplexComponentOptions,
): string {
  if (resolved.mode === 'create') {
    return createTemplate(resolved);
  }

  let result = content;
  const marker = '<!-- Begin children section -->';
  if (!result.includes(marker)) {
    result = `${result.replace(/\s*$/, '')}\n\n${marker}\n<!-- End children section -->\n`;
  }
  if (resolved.features.includes('projection') && !result.includes(`[${resolved.name}-header]`)) {
    result = result.replace(marker, `${projectionSlots(resolved.name)}\n${marker}`);
  }
  if (resolved.features.includes('cdk-overlay') && !result.includes('cdkConnectedOverlay')) {
    result = result.replace(marker, `${overlayTemplate(resolved.name)}\n${marker}`);
  }

  return result;
}

function createTemplate(resolved: ResolvedComplexComponentOptions): string {
  if (resolved.document) {
    return documentTemplate(resolved.name, resolved.document);
  }

  const advancedContent = [
    resolved.features.includes('projection')
      ? projectionSlots(resolved.name)
      : '<ng-content></ng-content>',
    resolved.features.includes('cdk-overlay') ? overlayTemplate(resolved.name) : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return `<mat-card>
  ${advancedContent.split('\n').join('\n  ')}

  <!-- Begin children section -->
  <!-- End children section -->
</mat-card>
`;
}

/**
 * Material 3 card compiled from an OpenUI node: each slot projects consumer
 * content and hosts the embedded document children in its section.
 */
function documentTemplate(name: string, document: ComplexComponentDocument): string {
  const title =
    document.title === undefined
      ? ''
      : `    <mat-card-title>${escapeTemplateText(document.title)}</mat-card-title>\n`;
  const overlay = document.overlay
    ? `\n  ${overlayTemplate(
        name,
        readAstString(document.overlay, OVERLAY_CONTAINER_ATTRIBUTES.label) ??
          DEFAULT_OVERLAY_LABEL,
        templateSectionMarkers('overlay', '    '),
      )
        .split('\n')
        .join('\n  ')}\n`
    : '';

  return `<!-- Projection slots (BKM: project multiple elements via <ng-container ${name}-actions> / <ng-container ${name}-header>) -->
<mat-card>
  <mat-card-header>
${title}    <ng-content select="[${name}-header]"></ng-content>
${templateSectionMarkers('header', '    ')}
  </mat-card-header>
  <mat-card-content>
    <ng-content></ng-content>
${templateSectionMarkers('children', '    ')}
  </mat-card-content>
  <mat-card-actions>
    <ng-content select="[${name}-actions]"></ng-content>
${templateSectionMarkers('actions', '    ')}
  </mat-card-actions>
${overlay}</mat-card>
`;
}

function projectionSlots(name: string): string {
  return `<!-- Projection slots (BKM: project multiple elements via <ng-container ${name}-actions> / <ng-container ${name}-header>) -->
<ng-content select="[${name}-header]"></ng-content>
<ng-content></ng-content>
<ng-content select="[${name}-actions]"></ng-content>`;
}

function overlayTemplate(
  name: string,
  label = DEFAULT_OVERLAY_LABEL,
  content = 'Overlay content',
): string {
  const originName = `${strings.camelize(name)}OverlayOrigin`;
  const card = content.includes('\n')
    ? `<mat-card>\n${content}\n  </mat-card>`
    : `<mat-card>${content}</mat-card>`;

  return `<button mat-button type="button" cdkOverlayOrigin #${originName}="cdkOverlayOrigin" (click)="overlayOpen.set(!overlayOpen())">
  ${escapeTemplateText(label)}
</button>
<ng-template cdkConnectedOverlay [cdkConnectedOverlayOrigin]="${originName}" [cdkConnectedOverlayOpen]="overlayOpen()">
  ${card}
</ng-template>`;
}

function addPublicApiDocumentation(
  content: string,
  resolved: ResolvedComplexComponentOptions,
): string {
  const projectionSlots = resolved.features.includes('projection')
    ? `[${resolved.name}-header], default, [${resolved.name}-actions]`
    : 'none';
  const projectionBkm = resolved.features.includes('projection')
    ? `\n * - Projection BKM: Project multiple sibling elements via <ng-container ${resolved.name}-actions> or <ng-container ${resolved.name}-header> to preserve layout without wrapper <div> tags.`
    : '';
  const documentation = `/**\n * Complex component public API:\n * - Inputs: none.\n * - Outputs: none.\n * - Projection slots: ${projectionSlots}.${projectionBkm}\n */\n`;
  const existingDocumentation = /\/\*\n \* Complex component public API:\n[\s\S]*? \*\/\n/;

  if (existingDocumentation.test(content)) {
    return content.replace(existingDocumentation, documentation);
  }

  return content.replace(/(export\s+(?:default\s+)?class\s+\w+)/, `${documentation}$1`);
}

function addImport(content: string, imported: string, moduleSpecifier: string): string {
  const statement = `import { ${imported} } from '${moduleSpecifier}';`;
  if (content.includes(statement)) {
    return content;
  }

  if (content.includes('// End import section')) {
    return content.replace('// End import section', `${statement}\n// End import section`);
  }

  const importBlock = /^((?:import[^\n]*\n)+)/;
  return importBlock.test(content)
    ? content.replace(importBlock, (block) => `${block}${statement}\n`)
    : `${statement}\n${content}`;
}

function addToImportsArray(content: string, className: string): string {
  const importsArray = /imports:\s*\[([^\]]*)\]/;
  const match = content.match(importsArray);
  if (!match) {
    return content;
  }

  const items = match[1]
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (items.includes(className)) {
    return content;
  }

  return content.replace(importsArray, `imports: [${[...items, className].join(', ')}]`);
}

function addClassMember(content: string, member: string, existingFragment: string): string {
  if (content.includes(existingFragment)) {
    return content;
  }

  const closingIndex = content.lastIndexOf('}');
  return closingIndex === -1
    ? `${content}\n${member}\n`
    : `${content.slice(0, closingIndex)}\n  ${member}\n${content.slice(closingIndex)}`;
}

function registerThemeMixin(tree: Tree, resolved: ResolvedComplexComponentOptions): void {
  const stylesPath = resolveThemeEntryPoint(tree, resolved);
  const partialPath = path.posix.join(resolved.componentDirectory, `_${resolved.name}-theme.scss`);
  const alias = `${strings.camelize(resolved.name)}Theme`;
  const mixinName = `${resolved.name}-theme`;
  const importPath = sassImportPath(stylesPath, partialPath);
  const importStatement = `@use '${importPath}' as ${alias};`;
  const includeStatement = `@include ${alias}.${mixinName}();`;

  if (!tree.exists(partialPath)) {
    tree.create(
      partialPath,
      `@use '@angular/material' as mat;\n\n// Component-specific Angular Material theme extension.\n@mixin ${mixinName}() {\n  // Add Material Sass overrides for ${resolved.name} here.\n}\n`,
    );
  }

  const styles = tree.read(stylesPath)!.toString();
  const withImport = styles.includes(importStatement) ? styles : `${importStatement}\n${styles}`;
  const withInclude = withImport.includes(includeStatement)
    ? withImport
    : `${withImport.replace(/\s*$/, '')}\n\n${includeStatement}\n`;
  if (withInclude !== styles) {
    tree.overwrite(stylesPath, withInclude);
  }
}

function deleteComplexComponent(resolved: ResolvedComplexComponentOptions): Rule {
  return (tree: Tree) => {
    const componentFiles: string[] = [];
    tree.visit((filePath) => {
      if (filePath.startsWith(`${resolved.componentDirectory}/`)) {
        componentFiles.push(filePath);
      }
    });
    componentFiles.forEach((filePath) => tree.delete(filePath));

    const stylesPath = tryResolveThemeEntryPoint(tree, resolved);
    if (stylesPath && tree.exists(stylesPath)) {
      const alias = `${strings.camelize(resolved.name)}Theme`;
      const mixinName = `${resolved.name}-theme`;
      const partialPath = path.posix.join(
        resolved.componentDirectory,
        `_${resolved.name}-theme.scss`,
      );
      const styles = tree.read(stylesPath)!.toString();
      const updated = styles
        .replace(`@use '${sassImportPath(stylesPath, partialPath)}' as ${alias};\n`, '')
        .replace(`\n@include ${alias}.${mixinName}();`, '')
        .replace(/\n{3,}/g, '\n\n');
      if (updated !== styles) {
        tree.overwrite(stylesPath, updated);
      }
    }

    return tree;
  };
}

function resolveThemeEntryPoint(tree: Tree, resolved: ResolvedComplexComponentOptions): string {
  const workspace = readWorkspace(tree);
  const project = requireWorkspaceProject(workspace, resolved.project);
  const configuredStyles = project.architect?.['build']?.options?.styles ?? [];
  const configuredScss = configuredStyles.find((style) => style.endsWith('.scss'));
  const stylesPath = normalizeTreePath(configuredScss ?? `${resolved.sourceRoot}/styles.scss`);

  if (!tree.exists(stylesPath)) {
    throw new SchematicsException(
      `Could not find an SCSS application theme entry point at ${stylesPath} for the mixins feature.`,
    );
  }

  return stylesPath;
}

function tryResolveThemeEntryPoint(
  tree: Tree,
  resolved: ResolvedComplexComponentOptions,
): string | null {
  try {
    return resolveThemeEntryPoint(tree, resolved);
  } catch {
    return null;
  }
}

function sassImportPath(stylesPath: string, partialPath: string): string {
  let relative = path.posix
    .relative(path.posix.dirname(stylesPath), partialPath)
    .replace(/\.scss$/, '');
  relative = relative.replace(/\/_([^/]+)$/, '/$1');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

function normalizeWorkspacePath(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/^\.\//, '');
}

function normalizeTreePath(value: string): string {
  return `/${normalizeWorkspacePath(value)}`;
}

function withoutLeadingSlash(value: string): string {
  return value.replace(/^\/+/, '');
}

function isWithin(candidate: string, root: string): boolean {
  return candidate === root || candidate.startsWith(`${root}/`);
}
