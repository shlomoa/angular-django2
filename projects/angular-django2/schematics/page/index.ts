import { strings } from '@angular-devkit/core';
import type { Rule, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import * as path from 'node:path';
import * as ts from 'typescript';
import type { PageAccessMode, PageSchema } from './schema';
import { resolveApplicationTargetDirectory } from '../utility/project-relative-path';
import {
  readWorkspace,
  requireWorkspaceProject,
  type WorkspaceProject,
} from '../utility/workspace';

const ACCESS_MODES: readonly PageAccessMode[] = ['public', 'protected'];

interface ResolvedPageOptions {
  name: string;
  className: string;
  routePath: string;
  access: PageAccessMode;
  authGuard: string;
  navigationLabel: string;
  navigationIcon?: string;
  componentPath: string;
  templatePath: string;
  stylePath: string;
  routePathFile: string;
  appRoutesPath: string;
  appConfigPath: string;
  routeModuleImport: string;
}

interface GuardImport {
  name: string;
  moduleSpecifier: string;
}

/**
 * Generate a standalone Material page and register its own lazy-route definition.
 *
 * The only existing source edited is app.routes.ts. Its import and spread entry
 * are located with the TypeScript AST and inserted as isolated text changes; all
 * route configuration remains in the generated, feature-owned route module.
 */
export function page(options: PageSchema): Rule {
  return (tree: Tree) => {
    const resolved = resolveOptions(tree, options);
    assertMaterialPrerequisites(tree);
    const appRoutesSource = readRoutingPrerequisites(tree, resolved);
    const guard =
      resolved.access === 'protected' ? findConfiguredGuard(appRoutesSource, resolved) : undefined;

    assertRoutePathAvailable(tree, resolved);
    assertOwnedFilesAreSafe(tree, resolved, guard);
    updateAppRouteRegistration(tree, resolved);
    createOwnedFiles(tree, resolved, guard);

    return tree;
  };
}

function resolveOptions(tree: Tree, options: PageSchema): ResolvedPageOptions {
  if (!options.name || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(options.name)) {
    throw new SchematicsException('The page name must be non-empty kebab-case.');
  }

  const access = options.access ?? 'public';
  if (!ACCESS_MODES.includes(access)) {
    throw new SchematicsException(
      `Unsupported page access mode "${access}". Supported modes: ${ACCESS_MODES.join(', ')}.`,
    );
  }

  const routePath = options.routePath ?? options.name;
  if (!/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(routePath)) {
    throw new SchematicsException(
      'The route path must contain lowercase URL segments separated by hyphens or slashes.',
    );
  }

  const authGuard = options.authGuard ?? 'authGuard';
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(authGuard)) {
    throw new SchematicsException('The auth guard must be a valid TypeScript identifier.');
  }
  if (!options.navigationLabel?.trim() && options.navigationLabel !== undefined) {
    throw new SchematicsException('The navigation label must not be empty.');
  }
  if (options.navigationIcon && !/^[a-z0-9_]+$/.test(options.navigationIcon)) {
    throw new SchematicsException(
      'The navigation icon must be a lowercase Angular Material icon identifier.',
    );
  }

  const workspace = readWorkspace(tree);
  const projectName = resolveProjectName(workspace.projects ?? {}, options.project);
  const project = requireWorkspaceProject(workspace, projectName);
  if (project.projectType !== 'application') {
    throw new SchematicsException(
      `Project "${projectName}" must be an Angular application project.`,
    );
  }

  const sourceRoot = normalizeWorkspacePath(project.sourceRoot ?? '');
  if (!sourceRoot) {
    throw new SchematicsException(`Project "${projectName}" has no application sourceRoot.`);
  }

  const targetDirectory = resolveApplicationTargetDirectory(project, options.path, 'app/features');
  const appDirectory = path.posix.join(sourceRoot, 'app');
  const pageFileName = `${options.name}-page`;
  const routeFileName = `${options.name}.page.routes`;
  const routePathFile = `/${path.posix.join(targetDirectory, `${routeFileName}.ts`)}`;

  return {
    name: options.name,
    className: `${strings.classify(options.name)}Page`,
    routePath,
    access,
    authGuard,
    navigationLabel: options.navigationLabel ?? strings.classify(options.name),
    navigationIcon: options.navigationIcon,
    componentPath: `/${path.posix.join(targetDirectory, `${pageFileName}.ts`)}`,
    templatePath: `/${path.posix.join(targetDirectory, `${pageFileName}.html`)}`,
    stylePath: `/${path.posix.join(targetDirectory, `${pageFileName}.scss`)}`,
    routePathFile,
    appRoutesPath: `/${path.posix.join(appDirectory, 'app.routes.ts')}`,
    appConfigPath: `/${path.posix.join(appDirectory, 'app.config.ts')}`,
    routeModuleImport: moduleSpecifier(appDirectory, routePathFile.slice(1, -3)),
  };
}

function resolveProjectName(
  projects: Record<string, WorkspaceProject>,
  requestedProject: string | undefined,
): string {
  if (requestedProject) {
    return requestedProject;
  }

  const applicationProjects = Object.entries(projects)
    .filter(([, project]) => project.projectType === 'application' && !!project.sourceRoot)
    .map(([name]) => name);
  if (applicationProjects.length !== 1) {
    throw new SchematicsException(
      'Specify --project when the workspace does not have exactly one application sourceRoot.',
    );
  }

  return applicationProjects[0];
}

function assertMaterialPrerequisites(tree: Tree): void {
  const packageJson = tree.read('/package.json');
  if (!packageJson) {
    throw new SchematicsException(
      'page requires package.json with @angular/material and @angular/cdk dependencies. Run ng add @angular/material first.',
    );
  }

  let parsed: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    parsed = JSON.parse(packageJson.toString()) as typeof parsed;
  } catch {
    throw new SchematicsException(
      'page requires a valid package.json with @angular/material and @angular/cdk dependencies.',
    );
  }

  const dependencies = { ...parsed.devDependencies, ...parsed.dependencies };
  const missing = ['@angular/material', '@angular/cdk', '@angular/router'].filter(
    (dependency) => !dependencies[dependency],
  );
  if (missing.length > 0) {
    throw new SchematicsException(
      `page requires Angular Material and routing prerequisites: ${missing.join(', ')}.`,
    );
  }
}

function readRoutingPrerequisites(tree: Tree, resolved: ResolvedPageOptions): string {
  if (!tree.exists(resolved.appRoutesPath)) {
    throw new SchematicsException(
      `page requires configured routing at "${resolved.appRoutesPath}". Generate the application with routing enabled first.`,
    );
  }

  const content = tree.read(resolved.appRoutesPath)!.toString();
  if (!findRoutesArray(content)) {
    throw new SchematicsException(
      `The route configuration at "${resolved.appRoutesPath}" must export a Routes array named "routes".`,
    );
  }
  if (
    !tree.exists(resolved.appConfigPath) ||
    !providesRoutes(tree.read(resolved.appConfigPath)!.toString())
  ) {
    throw new SchematicsException(
      `page requires "${resolved.appConfigPath}" to configure provideRouter(routes). Generate the application with routing enabled first.`,
    );
  }

  return content;
}

function findConfiguredGuard(appRoutesSource: string, resolved: ResolvedPageOptions): GuardImport {
  const sourceFile = sourceFileFor(appRoutesSource);
  let guardImport: GuardImport | undefined;
  let isApplied = false;

  const visit = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.importClause?.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings)
    ) {
      for (const element of node.importClause.namedBindings.elements) {
        if (element.name.text === resolved.authGuard) {
          guardImport = {
            name: resolved.authGuard,
            moduleSpecifier: node.moduleSpecifier.text,
          };
        }
      }
    }

    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(sourceFile) === 'canActivate' &&
      ts.isArrayLiteralExpression(node.initializer) &&
      node.initializer.elements.some(
        (element) => ts.isIdentifier(element) && element.text === resolved.authGuard,
      )
    ) {
      isApplied = true;
    }
    node.forEachChild(visit);
  };
  visit(sourceFile);

  if (!guardImport || !isApplied) {
    throw new SchematicsException(
      `Protected pages require the configured reusable "${resolved.authGuard}" guard to be imported and applied in app.routes.ts. Client-side guards are not an authorization boundary; enforce authorization on the backend too.`,
    );
  }

  return guardImport;
}

function assertRoutePathAvailable(tree: Tree, resolved: ResolvedPageOptions): void {
  const matchingFiles: string[] = [];
  tree.visit((filePath) => {
    if (filePath.endsWith('.routes.ts') && filePath !== resolved.routePathFile) {
      matchingFiles.push(filePath);
    }
  });

  for (const filePath of matchingFiles) {
    const content = tree.read(filePath)?.toString();
    if (content && routePaths(content).includes(resolved.routePath)) {
      throw new SchematicsException(
        `The route path "${resolved.routePath}" is already declared in "${filePath}". Choose a unique --route-path.`,
      );
    }
  }
}

function assertOwnedFilesAreSafe(
  tree: Tree,
  resolved: ResolvedPageOptions,
  guard: GuardImport | undefined,
): void {
  const expectedFiles = generatedFiles(resolved, guard);
  const existing = expectedFiles.filter(({ filePath }) => tree.exists(filePath));
  if (existing.length === 0) {
    return;
  }

  const changed = existing.find(
    ({ filePath, content }) => tree.read(filePath)!.toString() !== content,
  );
  if (changed || existing.length !== expectedFiles.length) {
    throw new SchematicsException(
      `Page "${resolved.name}" already has generated files at "${resolved.componentPath}". Refusing to overwrite modified or partial page artifacts.`,
    );
  }
}

function createOwnedFiles(
  tree: Tree,
  resolved: ResolvedPageOptions,
  guard: GuardImport | undefined,
): void {
  for (const { filePath, content } of generatedFiles(resolved, guard)) {
    if (!tree.exists(filePath)) {
      tree.create(filePath, content);
    }
  }
}

function generatedFiles(
  resolved: ResolvedPageOptions,
  guard: GuardImport | undefined,
): Array<{ filePath: string; content: string }> {
  return [
    { filePath: resolved.componentPath, content: componentSource(resolved) },
    { filePath: resolved.templatePath, content: templateSource(resolved) },
    { filePath: resolved.stylePath, content: '' },
    { filePath: resolved.routePathFile, content: routeSource(resolved, guard) },
  ];
}

function componentSource(resolved: ResolvedPageOptions): string {
  return `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-${resolved.name}-page',
  standalone: true,
  imports: [MatCardModule],
  templateUrl: './${resolved.name}-page.html',
  styleUrl: './${resolved.name}-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${resolved.className} {}
`;
}

function templateSource(resolved: ResolvedPageOptions): string {
  return `<mat-card>
  <mat-card-header>
    <mat-card-title>${htmlText(resolved.navigationLabel)}</mat-card-title>
  </mat-card-header>
  <mat-card-content>
    <p>Build this feature with reusable components, reactive forms, and contract-derived services.</p>
  </mat-card-content>
</mat-card>
`;
}

function routeSource(resolved: ResolvedPageOptions, guard: GuardImport | undefined): string {
  const guardImport = guard
    ? `import { ${guard.name} } from '${guardModuleSpecifier(resolved, guard.moduleSpecifier)}';\n`
    : '';
  const guardRouteProperty = guard ? `\n    canActivate: [${guard.name}],` : '';
  const navigationIcon = resolved.navigationIcon ? `, icon: '${resolved.navigationIcon}'` : '';

  return `import type { Routes } from '@angular/router';
${guardImport}export const ${routeArrayName(resolved)}: Routes = [
  {
    path: ${stringLiteral(resolved.routePath)},
    loadComponent: () =>
      import('./${resolved.name}-page').then((module) => module.${resolved.className}),${guardRouteProperty}
    data: {
      access: ${stringLiteral(resolved.access)},
      navigation: { label: ${stringLiteral(resolved.navigationLabel)}${navigationIcon} },
    },
  },
];
`;
}

function updateAppRouteRegistration(tree: Tree, resolved: ResolvedPageOptions): void {
  const source = tree.read(resolved.appRoutesPath)!.toString();
  const updated = updateRouteRegistration(source, resolved);
  if (updated !== source) {
    tree.overwrite(resolved.appRoutesPath, updated);
  }
}

export function updateRouteRegistration(source: string, resolved: ResolvedPageOptions): string {
  const sourceFile = sourceFileFor(source);
  const routesArray = findRoutesArray(source);
  if (!routesArray) {
    throw new SchematicsException(
      'The route configuration must export a Routes array named "routes".',
    );
  }

  const registrationName = routeArrayName(resolved);
  let hasImport = false;
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause?.namedBindings) {
      continue;
    }

    const bindings = statement.importClause.namedBindings;
    if (
      ts.isNamedImports(bindings) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === resolved.routeModuleImport &&
      bindings.elements.some((element) => element.name.text === registrationName)
    ) {
      hasImport = true;
    }
  }

  const hasSpread = routesArray.elements.some(
    (element) =>
      ts.isSpreadElement(element) && element.expression.getText(sourceFile) === registrationName,
  );
  if (hasImport !== hasSpread) {
    throw new SchematicsException(
      `The owned "${registrationName}" route registration in "${resolved.appRoutesPath}" is incomplete. Restore its import and spread entry before rerunning.`,
    );
  }
  if (hasImport) {
    return source;
  }

  const imports = sourceFile.statements.filter(ts.isImportDeclaration);
  if (imports.length === 0) {
    throw new SchematicsException(
      `Cannot safely register the page route in "${resolved.appRoutesPath}" because it has no import declarations.`,
    );
  }

  const importInsertion = imports.at(-1)!.end;
  const routeInsertion = routesArray.elements.pos;
  const changes = [
    {
      position: importInsertion,
      text: `\nimport { ${registrationName} } from '${resolved.routeModuleImport}';`,
    },
    { position: routeInsertion, text: `\n  ...${registrationName},` },
  ].sort((left, right) => right.position - left.position);

  let updated = source;
  for (const change of changes) {
    updated = `${updated.slice(0, change.position)}${change.text}${updated.slice(change.position)}`;
  }
  return updated;
}

function findRoutesArray(source: string): ts.ArrayLiteralExpression | undefined {
  const sourceFile = sourceFileFor(source);
  let routesArray: ts.ArrayLiteralExpression | undefined;
  sourceFile.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) {
      return;
    }
    for (const declaration of node.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === 'routes' &&
        declaration.initializer &&
        ts.isArrayLiteralExpression(declaration.initializer)
      ) {
        routesArray = declaration.initializer;
      }
    }
  });
  return routesArray;
}

function routePaths(source: string): string[] {
  const routesArray = findRoutesArray(source);
  if (!routesArray) {
    return [];
  }

  return routesArray.elements.flatMap((element) => {
    if (!ts.isObjectLiteralExpression(element)) {
      return [];
    }
    const pathProperty = element.properties.find(
      (property): property is ts.PropertyAssignment =>
        ts.isPropertyAssignment(property) && property.name.getText() === 'path',
    );
    return pathProperty && ts.isStringLiteral(pathProperty.initializer)
      ? [pathProperty.initializer.text]
      : [];
  });
}

function routeArrayName(resolved: ResolvedPageOptions): string {
  return `${strings.camelize(resolved.name)}PageRoutes`;
}

function guardModuleSpecifier(resolved: ResolvedPageOptions, guardSpecifier: string): string {
  if (!guardSpecifier.startsWith('.')) {
    return guardSpecifier;
  }

  const appRoutesDirectory = path.posix.dirname(resolved.appRoutesPath);
  const guardPath = path.posix.normalize(path.posix.join(appRoutesDirectory, guardSpecifier));
  return moduleSpecifier(path.posix.dirname(resolved.routePathFile), guardPath);
}

function moduleSpecifier(fromDirectory: string, targetPath: string): string {
  const relative = path.posix.relative(fromDirectory, targetPath);
  return relative.startsWith('.') ? relative : `./${relative}`;
}

function stringLiteral(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n')}'`;
}

function htmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sourceFileFor(source: string): ts.SourceFile {
  return ts.createSourceFile('app.routes.ts', source, ts.ScriptTarget.Latest, true);
}

function providesRoutes(source: string): boolean {
  const sourceFile = sourceFileFor(source);
  let isConfigured = false;
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'provideRouter' &&
      node.arguments.some((argument) => ts.isIdentifier(argument) && argument.text === 'routes')
    ) {
      isConfigured = true;
    }
    node.forEachChild(visit);
  };
  visit(sourceFile);
  return isConfigured;
}

function normalizeWorkspacePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}
