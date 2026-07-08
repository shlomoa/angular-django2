import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import type { SchematicContext } from '@angular-devkit/schematics';
import { vi } from 'vitest';

export const workspaceReadmePath = path.resolve(
  __dirname,
  '../../projects/angular-django2/README.md',
);
export const workspaceReadme = readFileSync(workspaceReadmePath, 'utf8');

export const schematicsDir = path.resolve(__dirname, '../../projects/angular-django2/schematics');

export function schematicSchemaPath(schematicName: string): string {
  return path.join(schematicsDir, schematicName, 'schema.json');
}

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
