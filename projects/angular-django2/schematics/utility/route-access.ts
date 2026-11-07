import { SchematicsException, type Tree } from '@angular-devkit/schematics';
import * as path from 'node:path';
import * as ts from 'typescript';

/**
 * Applies an existing route guard to routes of an Angular application. The guard is site-owned:
 * this module never creates it, only finds its import and adds it to `canActivate`.
 * @internal
 */

/** A guard found as a named import of the application route configuration. */
export interface ImportedGuard {
  name: string;
  /** The module specifier as written in the route configuration file. */
  moduleSpecifier: string;
}

function parse(source: string, fileName: string): ts.SourceFile {
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
}

/** The named import of `guardName` in the source, or `undefined` when there is none. */
export function findImportedGuard(source: string, guardName: string): ImportedGuard | undefined {
  for (const statement of parse(source, 'app.routes.ts').statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.importClause?.namedBindings &&
      ts.isNamedImports(statement.importClause.namedBindings) &&
      statement.importClause.namedBindings.elements.some(
        (element) => element.name.text === guardName,
      )
    ) {
      return { name: guardName, moduleSpecifier: statement.moduleSpecifier.text };
    }
  }
  return undefined;
}

/** Route files of the application: `app.routes.ts` and the feature-owned `*.routes.ts` files. */
function routeFiles(tree: Tree, appRoutesPath: string): string[] {
  const appDirectory = path.posix.dirname(appRoutesPath);
  const files: string[] = [];
  tree.getDir(appDirectory).visit((filePath) => {
    if (filePath.endsWith('.routes.ts')) {
      files.push(filePath);
    }
  });
  return files.sort();
}

function pathProperty(route: ts.ObjectLiteralExpression): ts.PropertyAssignment | undefined {
  return route.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === 'path',
  );
}

function importSpecifierFor(
  fileDirectory: string,
  appRoutesDirectory: string,
  guard: ImportedGuard,
): string {
  if (!guard.moduleSpecifier.startsWith('.')) {
    return guard.moduleSpecifier;
  }
  const target = path.posix.normalize(path.posix.join(appRoutesDirectory, guard.moduleSpecifier));
  const relative = path.posix.relative(fileDirectory, target);
  return relative.startsWith('.') ? relative : `./${relative}`;
}

/**
 * Adds `guard` to `canActivate` of the route whose `path` is `routePath` in the source, and
 * imports it when the file does not. Returns the source unchanged when the route is not declared
 * here or already has the guard.
 */
export function addGuardToRoute(
  source: string,
  routePath: string,
  guard: ImportedGuard,
  importSpecifier: string,
): string {
  const sourceFile = parse(source, 'routes.ts');
  const changes: { position: number; text: string }[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const pathAssignment = pathProperty(node);
      if (
        pathAssignment &&
        ts.isStringLiteralLike(pathAssignment.initializer) &&
        pathAssignment.initializer.text === routePath
      ) {
        const canActivate = node.properties.find(
          (property): property is ts.PropertyAssignment =>
            ts.isPropertyAssignment(property) &&
            ts.isIdentifier(property.name) &&
            property.name.text === 'canActivate',
        );
        if (!canActivate) {
          const indent = /^[ \t]*/.exec(
            source.slice(source.lastIndexOf('\n', pathAssignment.getStart()) + 1),
          )![0];
          changes.push({
            position: pathAssignment.end,
            text: `,\n${indent}canActivate: [${guard.name}]`,
          });
        } else if (ts.isArrayLiteralExpression(canActivate.initializer)) {
          const array = canActivate.initializer;
          const present = array.elements.some(
            (element) => ts.isIdentifier(element) && element.text === guard.name,
          );
          if (!present) {
            changes.push({
              position: array.elements.length > 0 ? array.elements.end : array.end - 1,
              text: array.elements.length > 0 ? `, ${guard.name}` : guard.name,
            });
          }
        } else {
          throw new SchematicsException(
            `The canActivate of route "${routePath}" is not an array literal; add "${guard.name}" by hand.`,
          );
        }
      }
    }
    node.forEachChild(visit);
  };
  visit(sourceFile);
  if (changes.length === 0) {
    return source;
  }

  if (!findImportedGuard(source, guard.name)) {
    const imports = sourceFile.statements.filter(ts.isImportDeclaration);
    changes.push({
      position: imports.length > 0 ? imports.at(-1)!.end : 0,
      text: `${imports.length > 0 ? '\n' : ''}import { ${guard.name} } from '${importSpecifier}';${imports.length > 0 ? '' : '\n'}`,
    });
  }
  let updated = source;
  for (const change of changes.sort((left, right) => right.position - left.position)) {
    updated = `${updated.slice(0, change.position)}${change.text}${updated.slice(change.position)}`;
  }
  return updated;
}

/**
 * Applies the application's guard to the generated routes of `protectedPaths`.
 *
 * @throws SchematicsException naming the guard when `appRoutesPath` does not import it, or when
 * the file is missing.
 * @returns the protected paths for which no route declaration was found; those routes are
 * guarded when they are generated.
 */
export function applyGuardToRoutes(
  tree: Tree,
  appRoutesPath: string,
  guardName: string,
  protectedPaths: readonly string[],
): string[] {
  const appRoutes = tree.read(appRoutesPath)?.toString();
  const guard = appRoutes === undefined ? undefined : findImportedGuard(appRoutes, guardName);
  if (!guard) {
    throw new SchematicsException(
      `Protected routes (${protectedPaths.join(', ')}) need the existing "${guardName}" guard, but ` +
        `"${appRoutesPath}" does not import it. Add the site's guard first; material-app applies ` +
        'an existing guard and does not create one.',
    );
  }

  const appRoutesDirectory = path.posix.dirname(appRoutesPath);
  const unmatched: string[] = [];
  for (const routePath of protectedPaths) {
    let matched = false;
    for (const filePath of routeFiles(tree, appRoutesPath)) {
      const source = tree.read(filePath)!.toString();
      const specifier = importSpecifierFor(path.posix.dirname(filePath), appRoutesDirectory, guard);
      const updated = addGuardToRoute(source, routePath, guard, specifier);
      matched ||= updated !== source || declaresPath(source, routePath);
      if (updated !== source) {
        tree.overwrite(filePath, updated);
      }
    }
    if (!matched) {
      unmatched.push(routePath);
    }
  }
  return unmatched;
}

function declaresPath(source: string, routePath: string): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const assignment = pathProperty(node);
      if (
        assignment &&
        ts.isStringLiteralLike(assignment.initializer) &&
        assignment.initializer.text === routePath
      ) {
        found = true;
      }
    }
    node.forEachChild(visit);
  };
  visit(parse(source, 'routes.ts'));
  return found;
}
