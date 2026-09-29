import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { Tree, type SchematicContext } from '@angular-devkit/schematics';
import { SchematicTestRunner, type UnitTestTree } from '@angular-devkit/schematics/testing';
import { vi } from 'vitest';

const req = createRequire(import.meta.url);

export const workspaceReadmePath = req.resolve('angular-django2/README.md');
export const workspaceReadme = readFileSync(workspaceReadmePath, 'utf8');

export const collectionPath = req.resolve('angular-django2/schematics/collection.json');
export const schematicsDir = path.dirname(collectionPath);

export function schematicSchemaPath(schematicName: string): string {
  return path.join(schematicsDir, schematicName, 'schema.json');
}

export const angularCollectionPath = path.join(
  path.dirname(req.resolve('@schematics/angular/package.json')),
  'collection.json',
);

export function createSchematicContext(): SchematicContext {
  return {
    addTask: vi.fn(),
    logger: {
      debug: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
  } as unknown as SchematicContext;
}

export const createMockContext = () =>
  ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    addTask: vi.fn(),
  }) as never;

import type { OpenUiDocument, OpenUiElement } from '@shlomoa/openui-spec';
import {
  SYNTHETIC_OPENUI_ROOT_TYPE,
  SYNTHETIC_OPENUI_VERSION,
} from 'angular-django2/schematics/utility/ast-compiler';

export function createOpenUiDocument(...children: OpenUiElement[]): OpenUiDocument {
  return {
    version: SYNTHETIC_OPENUI_VERSION,
    id: 'root',
    type: SYNTHETIC_OPENUI_ROOT_TYPE,
    children: [...children],
  };
}

export function openUiDocumentString(...children: OpenUiElement[]): string {
  return JSON.stringify(createOpenUiDocument(...children));
}

/** Dependencies the generated Material components import; added to the workspace `package.json`. */
const MATERIAL_DEPENDENCIES = {
  '@angular/cdk': '^22.0.0',
  '@angular/forms': '^22.0.0',
  '@angular/material': '^22.0.0',
} as const;

/** An empty Angular workspace named `demo`, with `documents` (path -> content) created in it. */
export async function createEmptyWorkspace(
  documents: Readonly<Record<string, string>> = {},
): Promise<UnitTestTree> {
  const angularRunner = new SchematicTestRunner('@schematics/angular', angularCollectionPath);
  const tree = (await angularRunner.runSchematic(
    'workspace',
    { name: 'demo', version: '22.0.0', newProjectRoot: 'projects' },
    Tree.empty(),
  )) as UnitTestTree;
  for (const [documentPath, content] of Object.entries(documents)) {
    tree.create(`/${documentPath}`, content);
  }

  return tree;
}

/** Add the Angular Material dependencies to the workspace `package.json` (idempotent). */
export function addMaterialDependencies(tree: UnitTestTree): void {
  const packageJson = JSON.parse(tree.readContent('/package.json'));
  packageJson.dependencies = { ...packageJson.dependencies, ...MATERIAL_DEPENDENCIES };
  tree.overwrite('/package.json', JSON.stringify(packageJson, null, 2));
}

/**
 * A workspace with one routed standalone Angular application (`demo-app`) and the Material
 * dependencies, with `documents` (path -> content) created in it.
 */
export async function createApplicationWorkspace(
  documents: Readonly<Record<string, string>> = {},
): Promise<UnitTestTree> {
  const angularRunner = new SchematicTestRunner('@schematics/angular', angularCollectionPath);
  const tree = (await angularRunner.runSchematic(
    'application',
    { name: 'demo-app', standalone: true, routing: true, style: 'scss', zoneless: true },
    await createEmptyWorkspace(documents),
  )) as UnitTestTree;
  addMaterialDependencies(tree);

  return tree;
}
