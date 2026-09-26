import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import type { SchematicContext } from '@angular-devkit/schematics';
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
