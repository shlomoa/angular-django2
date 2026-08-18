import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { chain, externalSchematic, SchematicsException } from '@angular-devkit/schematics';
import * as path from 'node:path';
import { MATERIAL_LAYOUT_TEMPLATE } from '../utility/material-constants';
import { resolveApplicationTargetDirectory } from '../utility/project-relative-path';
import {
  readWorkspace,
  requireWorkspaceProject,
  type WorkspaceProject,
} from '../utility/workspace';
import { page } from '../page/index';
import { parseReactiveFormDefinition } from '../reactive-form/definition';
import { reactiveForm } from '../reactive-form/index';
import type { SiteDefinition, SiteFormDefinition, SiteOperation, SiteSchema } from './schema';

const DEFAULT_DEFINITION: SiteDefinition = {
  pages: [
    {
      name: 'home',
      navigation: { id: 'home', label: 'Home', icon: 'home' },
    },
  ],
};
const ALLOWED_OPTIONS = new Set([
  'source',
  'defaults',
  'project',
  'operation',
  'confirmDelete',
  'authGuard',
  'csrfCookieName',
  'csrfHeaderName',
]);
const MANIFEST_DIRECTORY = '/.angular-django2/site';

interface ResolvedSite {
  definition: SiteDefinition;
  source?: string;
  projectName: string;
  project: WorkspaceProject;
  operation: SiteOperation;
  authGuard: string;
  csrfCookieName: string;
  csrfHeaderName: string;
  appRoutesPath: string;
  appConfigPath: string;
  shellPath: string;
  shellContent: string;
  previousShellContent: string;
  manifestPath: string;
  manifest?: SiteManifest;
}

interface SiteManifest {
  version: 1;
  source?: string;
  definition: SiteDefinition;
  shell: {
    path: string;
    content: string;
    previousContent: string;
  };
}

/**
 * Assemble a site from a single inspected OpenUI definition. The schematic
 * delegates page, reactive-form, and optional OpenAPI setup generation to their
 * public schematic contracts after validating the entire plan on a branch.
 */
export function site(options: SiteSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const resolved = resolveSite(tree, options);

    if (resolved.operation === 'delete') {
      deleteSite(tree, resolved, options);
      return tree;
    }

    assertOwnership(tree, resolved);
    previewGeneration(tree, context, resolved);

    const rules: Rule[] = [configureCsrf(resolved)];
    if (resolved.definition.openapi) {
      rules.push(
        externalSchematic('angular-django2', 'openapi-setup', {
          openapi_spec_file: resolved.definition.openapi.spec,
          outputPath: resolved.definition.openapi.outputPath,
          helpersPath: resolved.definition.openapi.helpersPath,
        }),
      );
    }
    for (const definition of resolved.definition.pages) {
      rules.push(
        externalSchematic('angular-django2', 'page', {
          name: definition.name,
          path: definition.path ?? `src/app/features/${definition.name}`,
          project: resolved.projectName,
          routePath: definition.routePath ?? definition.name,
          access: definition.access ?? 'public',
          authGuard: resolved.authGuard,
          navigationLabel: definition.navigation.label,
          navigationIcon: definition.navigation.icon,
        }),
      );
    }
    for (const definition of resolved.definition.forms ?? []) {
      rules.push(
        externalSchematic('angular-django2', 'reactive-form', {
          name: definition.name,
          definition: formDefinitionPath(resolved.project, definition.definition),
          path: definition.path ?? 'src/app/features',
          project: resolved.projectName,
        }),
      );
    }
    rules.push(writeSiteShell(resolved), writeManifest(resolved));

    return chain(rules)(tree, context);
  };
}

function resolveSite(tree: Tree, options: SiteSchema): ResolvedSite {
  assertSupportedOptions(options);
  const operation = options.operation ?? 'create';
  if (!['create', 'modify', 'delete'].includes(operation)) {
    throw new SchematicsException(`Unsupported site operation "${operation}".`);
  }
  const workspace = readWorkspace(tree);
  const projectName = resolveProjectName(workspace.projects ?? {}, options.project);
  const project = requireWorkspaceProject(workspace, projectName);
  if (project.projectType !== 'application') {
    throw new SchematicsException(
      `Project "${projectName}" must be an Angular application project.`,
    );
  }

  const appDirectory = resolveApplicationTargetDirectory(project, 'src/app', 'src/app');
  const appRoutesPath = `/${path.posix.join(appDirectory, 'app.routes.ts')}`;
  const appConfigPath = `/${path.posix.join(appDirectory, 'app.config.ts')}`;
  const shellPath = findShellPath(tree, appDirectory);
  const manifestPath = `${MANIFEST_DIRECTORY}/${projectName}.json`;
  const manifest = readManifest(tree, manifestPath);
  if (operation === 'delete') {
    return {
      definition: manifest?.definition ?? DEFAULT_DEFINITION,
      projectName,
      project,
      operation,
      authGuard: options.authGuard ?? 'authGuard',
      csrfCookieName: options.csrfCookieName ?? 'csrftoken',
      csrfHeaderName: options.csrfHeaderName ?? 'X-CSRFToken',
      appRoutesPath,
      appConfigPath,
      shellPath,
      shellContent: manifest?.shell.content ?? MATERIAL_LAYOUT_TEMPLATE,
      previousShellContent: manifest?.shell.previousContent ?? tree.read(shellPath)!.toString(),
      manifestPath,
      ...(manifest ? { manifest } : {}),
    };
  }
  const source = options.source
    ? resolveInputPath(project, options.source, 'OpenUI source')
    : undefined;
  const definition = source
    ? readDefinition(tree, source)
    : options.defaults
      ? DEFAULT_DEFINITION
      : fail<SiteDefinition>(
          'Pass --source with a validated OpenUI definition, or pass --defaults for the documented Home-only site.',
        );

  assertApplicationPrerequisites(tree, appRoutesPath, appConfigPath, definition);
  assertDefinitionPaths(tree, project, definition);
  assertProtectedPagePrerequisites(
    tree.read(appRoutesPath)!.toString(),
    definition,
    options.authGuard ?? 'authGuard',
  );

  return {
    definition,
    ...(source ? { source } : {}),
    projectName,
    project,
    operation,
    authGuard: options.authGuard ?? 'authGuard',
    csrfCookieName: options.csrfCookieName ?? 'csrftoken',
    csrfHeaderName: options.csrfHeaderName ?? 'X-CSRFToken',
    appRoutesPath,
    appConfigPath,
    shellPath,
    shellContent: renderShell(definition),
    previousShellContent: manifest?.shell.previousContent ?? tree.read(shellPath)!.toString(),
    manifestPath,
    ...(manifest ? { manifest } : {}),
  };
}

function assertSupportedOptions(options: SiteSchema): void {
  const unknown = Object.keys(options).filter((option) => !ALLOWED_OPTIONS.has(option));
  if (unknown.length > 0) {
    throw new SchematicsException(`Unsupported site option(s): ${unknown.join(', ')}.`);
  }
}

function resolveProjectName(
  projects: Record<string, WorkspaceProject>,
  requestedProject: string | undefined,
): string {
  if (requestedProject) {
    return requestedProject;
  }
  const applications = Object.entries(projects)
    .filter(([, project]) => project.projectType === 'application' && !!project.sourceRoot)
    .map(([name]) => name);
  if (applications.length !== 1) {
    throw new SchematicsException(
      'Specify --project when the workspace does not have exactly one Angular application.',
    );
  }
  return applications[0];
}

function findShellPath(tree: Tree, appDirectory: string): string {
  const paths = [
    `/${path.posix.join(appDirectory, 'app.html')}`,
    `/${path.posix.join(appDirectory, 'app.component.html')}`,
  ];
  const shellPath = paths.find((candidate) => tree.exists(candidate));
  if (!shellPath) {
    throw new SchematicsException(
      'site requires a Material application shell at src/app/app.html or src/app/app.component.html.',
    );
  }
  return shellPath;
}

function resolveInputPath(project: WorkspaceProject, value: string, label: string): string {
  if (!value.endsWith('.json') || value.split(/[\\/]+/).includes('..')) {
    throw new SchematicsException(`${label} must be a source-root-relative .json path.`);
  }
  const directory = resolveApplicationTargetDirectory(
    project,
    path.posix.dirname(value.replace(/\\/g, '/')),
    'src/app',
  );
  return `/${path.posix.join(directory, path.posix.basename(value))}`;
}

function readDefinition(tree: Tree, source: string): SiteDefinition {
  const content = tree.read(source);
  if (!content) {
    throw new SchematicsException(`The OpenUI source "${source.slice(1)}" was not found.`);
  }
  let value: unknown;
  try {
    value = JSON.parse(content.toString());
  } catch {
    throw new SchematicsException(`The OpenUI source "${source.slice(1)}" is not valid JSON.`);
  }
  if (!isRecord(value)) {
    throw new SchematicsException('The OpenUI source must be one JSON object.');
  }
  const keys = Object.keys(value);
  const unknown = keys.filter((key) => !['pages', 'forms', 'openapi'].includes(key));
  if (unknown.length > 0) {
    throw new SchematicsException(`Unsupported OpenUI source key(s): ${unknown.join(', ')}.`);
  }
  if (!Array.isArray(value.pages) || value.pages.length === 0) {
    throw new SchematicsException('The OpenUI source must define a non-empty pages array.');
  }

  const pages = value.pages.map((page, index) => parsePage(page, index));
  const forms = value.forms === undefined ? undefined : parseForms(value.forms);
  const openapi = value.openapi === undefined ? undefined : parseOpenapi(value.openapi);
  assertUnique(
    pages.map((page) => page.name),
    'page names',
  );
  assertUnique(
    pages.map((page) => page.routePath ?? page.name),
    'route paths',
  );
  assertUnique(
    pages.map((page) => page.navigation.id),
    'navigation identifiers',
  );

  return {
    pages,
    ...(forms ? { forms } : {}),
    ...(openapi ? { openapi } : {}),
  };
}

function parsePage(value: unknown, index: number): SiteDefinition['pages'][number] {
  if (!isRecord(value)) {
    throw new SchematicsException(`OpenUI page ${index + 1} must be an object.`);
  }
  const unknown = Object.keys(value).filter(
    (key) => !['name', 'path', 'routePath', 'access', 'navigation'].includes(key),
  );
  if (unknown.length > 0) {
    throw new SchematicsException(
      `OpenUI page ${index + 1} has unsupported key(s): ${unknown.join(', ')}.`,
    );
  }
  if (!isKebabCase(value.name)) {
    throw new SchematicsException(`OpenUI page ${index + 1} name must be non-empty kebab-case.`);
  }
  if (value.path !== undefined && !isString(value.path)) {
    throw new SchematicsException(`OpenUI page "${value.name}" path must be a string.`);
  }
  if (
    value.routePath !== undefined &&
    (!isString(value.routePath) || !isRoutePath(value.routePath))
  ) {
    throw new SchematicsException(`OpenUI page "${value.name}" routePath is invalid.`);
  }
  const access = value.access;
  if (access !== undefined && access !== 'public' && access !== 'protected') {
    throw new SchematicsException(
      `OpenUI page "${value.name}" access must be public or protected.`,
    );
  }
  if (
    !isRecord(value.navigation) ||
    !isString(value.navigation.id) ||
    !isString(value.navigation.label)
  ) {
    throw new SchematicsException(
      `OpenUI page "${value.name}" requires navigation.id and navigation.label.`,
    );
  }
  if (
    value.navigation.icon !== undefined &&
    (!isString(value.navigation.icon) || !/^[a-z0-9_]+$/.test(value.navigation.icon))
  ) {
    throw new SchematicsException(`OpenUI page "${value.name}" navigation.icon is invalid.`);
  }
  return {
    name: value.name,
    ...(value.path ? { path: value.path } : {}),
    ...(value.routePath ? { routePath: value.routePath } : {}),
    ...(access ? { access } : {}),
    navigation: {
      id: value.navigation.id,
      label: value.navigation.label,
      ...(value.navigation.icon ? { icon: value.navigation.icon } : {}),
    },
  };
}

function parseForms(value: unknown): SiteFormDefinition[] {
  if (!Array.isArray(value)) {
    throw new SchematicsException('OpenUI forms must be an array.');
  }
  const forms = value.map((form, index) => {
    if (!isRecord(form) || !isKebabCase(form.name) || !isString(form.definition)) {
      throw new SchematicsException(
        `OpenUI form ${index + 1} requires kebab-case name and a definition path.`,
      );
    }
    const unknown = Object.keys(form).filter(
      (key) => !['name', 'definition', 'path'].includes(key),
    );
    if (unknown.length > 0 || (form.path !== undefined && !isString(form.path))) {
      throw new SchematicsException(`OpenUI form "${form.name}" is invalid.`);
    }
    return {
      name: form.name,
      definition: form.definition,
      ...(form.path ? { path: form.path } : {}),
    };
  });
  assertUnique(
    forms.map((form) => form.name),
    'form names',
  );
  return forms;
}

function parseOpenapi(value: unknown): NonNullable<SiteDefinition['openapi']> {
  if (!isRecord(value) || !isString(value.spec)) {
    throw new SchematicsException('OpenUI openapi requires a spec path.');
  }
  const unknown = Object.keys(value).filter(
    (key) => !['spec', 'outputPath', 'helpersPath'].includes(key),
  );
  if (
    unknown.length > 0 ||
    (value.outputPath !== undefined && !isString(value.outputPath)) ||
    (value.helpersPath !== undefined && !isString(value.helpersPath))
  ) {
    throw new SchematicsException('OpenUI openapi is invalid.');
  }
  return {
    spec: value.spec,
    ...(value.outputPath ? { outputPath: value.outputPath } : {}),
    ...(value.helpersPath ? { helpersPath: value.helpersPath } : {}),
  };
}

function assertApplicationPrerequisites(
  tree: Tree,
  appRoutesPath: string,
  appConfigPath: string,
  definition: SiteDefinition,
): void {
  const packageJson = tree.read('/package.json');
  if (!packageJson) {
    throw new SchematicsException(
      'site requires package.json from an existing Material application.',
    );
  }
  let parsed: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    parsed = JSON.parse(packageJson.toString()) as typeof parsed;
  } catch {
    throw new SchematicsException('site requires a valid package.json.');
  }
  const dependencies = { ...parsed.devDependencies, ...parsed.dependencies };
  const required = ['@angular/material', '@angular/cdk', '@angular/router', '@angular/common'];
  if (definition.forms?.length) {
    required.push('@angular/forms');
  }
  const missing = required.filter((dependency) => !dependencies[dependency]);
  if (missing.length > 0) {
    throw new SchematicsException(
      `site requires Material, routing, and HTTP prerequisites: ${missing.join(', ')}.`,
    );
  }
  const workspaceSource = tree.read('/angular.json')!.toString();
  if (!workspaceSource.includes('@angular/material/prebuilt-themes/')) {
    throw new SchematicsException(
      'site requires a configured Angular Material theme. Run angular-django2:material-app or material-setup first.',
    );
  }
  if (!tree.exists(appRoutesPath) || !tree.exists(appConfigPath)) {
    throw new SchematicsException(
      'site requires app.routes.ts and app.config.ts from a routed standalone Material application.',
    );
  }
  const routes = tree.read(appRoutesPath)!.toString();
  const config = tree.read(appConfigPath)!.toString();
  if (
    !/export\s+const\s+routes\s*:\s*Routes\s*=\s*\[/.test(routes) ||
    !config.includes('provideRouter(routes)')
  ) {
    throw new SchematicsException(
      'site requires app.routes.ts exporting routes: Routes and app.config.ts configuring provideRouter(routes).',
    );
  }
}

function assertDefinitionPaths(
  tree: Tree,
  project: WorkspaceProject,
  definition: SiteDefinition,
): void {
  for (const form of definition.forms ?? []) {
    const formPath = `/${formDefinitionPath(project, form.definition)}`;
    const content = tree.read(formPath);
    if (!content) {
      throw new SchematicsException(
        `Form "${form.name}" definition "${form.definition}" was not found.`,
      );
    }

    parseReactiveFormDefinition(content.toString(), formPath.slice(1));
  }
  if (
    definition.openapi &&
    (definition.openapi.spec.split(/[\\/]+/).includes('..') ||
      !tree.exists(`/${definition.openapi.spec.replace(/^\/+/, '')}`))
  ) {
    throw new SchematicsException(
      `OpenAPI spec "${definition.openapi.spec}" was not found in the workspace.`,
    );
  }
}

function formDefinitionPath(project: WorkspaceProject, definition: string): string {
  return resolveInputPath(project, definition, 'Form definition').slice(1);
}

function assertProtectedPagePrerequisites(
  appRoutes: string,
  definition: SiteDefinition,
  authGuard: string,
): void {
  if (!definition.pages.some((page) => page.access === 'protected')) {
    return;
  }
  const imported = new RegExp(`import\\s*{[^}]*\\b${authGuard}\\b[^}]*}\\s*from`).test(appRoutes);
  const applied = new RegExp(`canActivate\\s*:\\s*\\[[^\\]]*\\b${authGuard}\\b`).test(appRoutes);
  if (!imported || !applied) {
    throw new SchematicsException(
      `Protected OpenUI pages require existing "${authGuard}" import and canActivate configuration in app.routes.ts. Client guards guide navigation only; Django/DRF remains authoritative.`,
    );
  }
}

function assertOwnership(tree: Tree, resolved: ResolvedSite): void {
  if (resolved.operation === 'modify' && !resolved.manifest) {
    throw new SchematicsException(
      'site modify requires a site ownership manifest created by this schematic.',
    );
  }
  if (resolved.operation === 'create' && resolved.manifest) {
    if (JSON.stringify(resolved.manifest.definition) !== JSON.stringify(resolved.definition)) {
      throw new SchematicsException(
        'A different site is already recorded. Use --operation=modify explicitly.',
      );
    }
  }
  const current = tree.read(resolved.shellPath)!.toString();
  if (resolved.manifest) {
    if (current !== resolved.manifest.shell.content) {
      throw new SchematicsException(
        `The site-owned shell "${resolved.shellPath.slice(1)}" was modified. Refusing to overwrite user-owned navigation.`,
      );
    }
    return;
  }
  if (!equivalentShellContent(current, MATERIAL_LAYOUT_TEMPLATE)) {
    throw new SchematicsException(
      'site requires the unmodified shell generated by angular-django2:material-app. It will not overwrite a custom Material navigation shell.',
    );
  }
}

function previewGeneration(tree: Tree, context: SchematicContext, resolved: ResolvedSite): void {
  const preview = tree.branch();
  for (const definition of resolved.definition.pages) {
    page({
      name: definition.name,
      path: definition.path ?? `src/app/features/${definition.name}`,
      project: resolved.projectName,
      routePath: definition.routePath ?? definition.name,
      access: definition.access ?? 'public',
      authGuard: resolved.authGuard,
      navigationLabel: definition.navigation.label,
      navigationIcon: definition.navigation.icon,
    })(preview, context);
  }
  for (const definition of resolved.definition.forms ?? []) {
    reactiveForm({
      name: definition.name,
      definition: formDefinitionPath(resolved.project, definition.definition),
      path: definition.path ?? 'src/app/features',
      project: resolved.projectName,
    })(preview, context);
  }
}

function configureCsrf(resolved: ResolvedSite): Rule {
  return (tree: Tree) => {
    const source = tree.read(resolved.appConfigPath)!.toString();
    if (source.includes('withXsrfConfiguration(')) {
      if (
        source.includes(`cookieName: '${resolved.csrfCookieName}'`) &&
        source.includes(`headerName: '${resolved.csrfHeaderName}'`)
      ) {
        return tree;
      }
      throw new SchematicsException(
        'app.config.ts already has a different CSRF configuration; site will not replace it.',
      );
    }
    const sourceWithHttpImport = addHttpProvidersImport(source);
    const providersStart = sourceWithHttpImport.indexOf('providers: [');
    if (providersStart < 0) {
      throw new SchematicsException(
        'site requires an explicit providers array in app.config.ts for CSRF wiring.',
      );
    }
    const openingBracket = sourceWithHttpImport.indexOf('[', providersStart);
    const closingBracket = matchingBracket(sourceWithHttpImport, openingBracket);
    if (closingBracket < 0) {
      throw new SchematicsException(
        'Could not safely locate the providers array in app.config.ts.',
      );
    }
    const csrfProvider =
      `,\n    provideHttpClient(\n` +
      `      withXsrfConfiguration({\n` +
      `        cookieName: '${resolved.csrfCookieName}',\n` +
      `        headerName: '${resolved.csrfHeaderName}',\n` +
      `      }),\n` +
      `    ),`;
    tree.overwrite(
      resolved.appConfigPath,
      `${sourceWithHttpImport.slice(0, closingBracket)}${csrfProvider}${sourceWithHttpImport.slice(closingBracket)}`,
    );
    return tree;
  };
}

function addHttpProvidersImport(source: string): string {
  const importPattern = /import\s*{\s*([^}]*)}\s*from\s*(['"])@angular\/common\/http\2\s*;/;
  const existing = source.match(importPattern);
  if (!existing) {
    if (source.includes('@angular/common/http')) {
      throw new SchematicsException(
        'site requires a named @angular/common/http import to configure CSRF safely.',
      );
    }
    return `import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';\n${source}`;
  }
  const imports = new Set(
    existing[1]
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  imports.add('provideHttpClient');
  imports.add('withXsrfConfiguration');
  return source.replace(
    importPattern,
    `import { ${[...imports].join(', ')} } from ${existing[2]}@angular/common/http${existing[2]};`,
  );
}

function matchingBracket(source: string, openingBracket: number): number {
  let depth = 0;
  for (let index = openingBracket; index < source.length; index += 1) {
    if (source[index] === '[') depth += 1;
    if (source[index] === ']') depth -= 1;
    if (depth === 0) return index;
  }
  return -1;
}

function writeSiteShell(resolved: ResolvedSite): Rule {
  return (tree: Tree) => {
    tree.overwrite(resolved.shellPath, resolved.shellContent);
    return tree;
  };
}

function writeManifest(resolved: ResolvedSite): Rule {
  return (tree: Tree) => {
    const manifest: SiteManifest = {
      version: 1,
      ...(resolved.source ? { source: resolved.source.slice(1) } : {}),
      definition: resolved.definition,
      shell: {
        path: resolved.shellPath,
        content: resolved.shellContent,
        previousContent: resolved.previousShellContent,
      },
    };
    if (tree.exists(resolved.manifestPath)) {
      tree.overwrite(resolved.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    } else {
      tree.create(resolved.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }
    return tree;
  };
}

function deleteSite(tree: Tree, resolved: ResolvedSite, options: SiteSchema): void {
  if (!options.confirmDelete) {
    throw new SchematicsException('site delete requires --confirmDelete=true.');
  }
  if (!resolved.manifest) {
    throw new SchematicsException(
      'site delete requires a site ownership manifest created by this schematic.',
    );
  }
  const current = tree.read(resolved.shellPath)!.toString();
  if (current !== resolved.manifest.shell.content) {
    throw new SchematicsException(
      `The site-owned shell "${resolved.shellPath.slice(1)}" was modified. Refusing to delete it.`,
    );
  }
  tree.overwrite(resolved.shellPath, resolved.manifest.shell.previousContent);
  tree.delete(resolved.manifestPath);
}

function readManifest(tree: Tree, manifestPath: string): SiteManifest | undefined {
  const content = tree.read(manifestPath);
  if (!content) {
    return undefined;
  }
  try {
    const manifest = JSON.parse(content.toString()) as SiteManifest;
    if (
      manifest.version !== 1 ||
      !manifest.definition ||
      !manifest.shell ||
      typeof manifest.shell.path !== 'string' ||
      typeof manifest.shell.content !== 'string' ||
      typeof manifest.shell.previousContent !== 'string'
    ) {
      throw new Error();
    }
    return manifest;
  } catch {
    throw new SchematicsException(`Invalid site ownership manifest at "${manifestPath.slice(1)}".`);
  }
}

function renderShell(definition: SiteDefinition): string {
  const navigation = definition.pages
    .map((page) => {
      const icon = page.navigation.icon
        ? `\n        <mat-icon matListItemIcon>${htmlText(page.navigation.icon)}</mat-icon>`
        : '';
      return `      <a mat-list-item routerLink="/${htmlText(page.routePath ?? page.name)}">${icon}\n        <span matListItemTitle>${htmlText(page.navigation.label)}</span>\n      </a>`;
    })
    .join('\n');
  return MATERIAL_LAYOUT_TEMPLATE.replace(/ {6}<a mat-list-item[\s\S]*? {6}<\/a>/, navigation);
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new SchematicsException(`OpenUI source contains conflicting ${label}.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isKebabCase(value: unknown): value is string {
  return isString(value) && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value);
}

function isRoutePath(value: string): boolean {
  return /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(value);
}

function htmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function equivalentShellContent(left: string, right: string): boolean {
  return left.replace(/\s+/g, '') === right.replace(/\s+/g, '');
}

function fail<T>(message: string): T {
  throw new SchematicsException(message);
}
