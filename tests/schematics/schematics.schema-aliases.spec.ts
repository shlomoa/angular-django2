import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { schematicSchemaPath } from './schematics.helpers';

const CAMEL_CASE_OPTIONS = {
  component: [['changeDetection', 'change-detection']],
  'data-service': [
    ['apiService', 'api-service'],
    ['apiPath', 'api-path'],
    ['skipTests', 'skip-tests'],
  ],
  'form-field': [
    ['controlType', 'control-type'],
    ['subscriptSizing', 'subscript-sizing'],
  ],
  'openapi-setup': [
    ['outputPath', 'output-path'],
    ['helpersPath', 'helpers-path'],
    ['skipHelpers', 'skip-helpers'],
    ['skipTests', 'skip-tests'],
  ],
  page: [
    ['routePath', 'route-path'],
    ['authGuard', 'auth-guard'],
    ['navigationLabel', 'navigation-label'],
    ['navigationIcon', 'navigation-icon'],
  ],
  'reactive-form': [['primitivesPath', 'primitives-path']],
  site: [
    ['confirmDelete', 'confirm-delete'],
    ['authGuard', 'auth-guard'],
    ['csrfCookieName', 'csrf-cookie-name'],
    ['csrfHeaderName', 'csrf-header-name'],
  ],
} as const;

interface SchemaProperty {
  aliases?: string[];
}

function readSchema(schematic: string): { properties: Record<string, SchemaProperty> } {
  return JSON.parse(readFileSync(schematicSchemaPath(schematic), 'utf8')) as {
    properties: Record<string, SchemaProperty>;
  };
}

describe('schematic option schemas', () => {
  it('TC-SCHEMA-ALIASES-01: exposes kebab-case and camelCase aliases for every multiword option', () => {
    for (const [schematic, options] of Object.entries(CAMEL_CASE_OPTIONS)) {
      const schema = readSchema(schematic);
      for (const [property, kebabCase] of options) {
        expect(schema.properties[property].aliases).toEqual([kebabCase, property]);
      }
    }
  });

  it('TC-SCHEMA-ALIASES-02: standardizes the OpenAPI option while retaining its snake_case alias', () => {
    const schema = readSchema('openapi-setup');

    expect(schema.properties).not.toHaveProperty('openapi_spec_file');
    expect(schema.properties.openapiSpecFile.aliases).toEqual([
      'openapi-spec-file',
      'openapiSpecFile',
      'openapi_spec_file',
    ]);
  });
});
