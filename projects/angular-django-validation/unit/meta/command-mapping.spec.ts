import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import Ajv2020Module from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

import { getRepoRoot } from '../../e2e/utils/temp_areas';
import {
  collectionPath,
  schematicSchemaPath,
  schematicsDir,
} from '../schematics/schematics.helpers';

/**
 * Contract test for command-mapping.json, the machine-readable mapping between OpenUI/OpenAPI
 * changes and ngdj commands that django-angular3 consumes. The file is checked against its JSON
 * Schema, against the collection, the option schema of every command, the specs it cites and the
 * pinned OpenUI catalog, so it cannot drift from the code.
 */
interface TestRef {
  file: string;
  ids?: string[];
  match?: string[];
}
interface Operation {
  status: string;
  reason?: string;
  gap?: string;
  via?: string[];
}
interface Parameter {
  name: string;
  flag: string;
  type: string;
  positional?: number;
  default?: unknown;
  enum?: string[];
  required?: boolean;
  requiredUnlessDocument?: boolean;
  requiresDocument?: boolean;
  notWithDocument?: boolean;
  deprecated?: boolean;
}
interface Command {
  classification: string;
  invocation: string;
  inputs: string[];
  parameters: Parameter[];
  onExisting: { outcome: string };
  operations: Record<string, Operation>;
  modes?: Record<string, { required?: string[]; optional?: string[]; conflicts?: string[] }>;
  before?: string[];
  after?: string[];
  tests: Record<string, TestRef[]>;
}
interface NodeEntry {
  scope: string;
  role: string;
  commands?: { command: string; lane?: string }[];
  compiles?: string[];
  compiledBy?: string[];
  operations: Record<string, Operation>;
}
interface ScopeEntry {
  scope: string;
  class: string;
  nodeTypes?: string[];
}
interface Mapping {
  mappingVersion: number;
  openuiSpecVersion: string;
  ui: { commands: Record<string, Command>; nodes: Record<string, NodeEntry> };
  api: { commands: Record<string, Command> };
  tooling: { commands: Record<string, Command> };
  scopes: ScopeEntry[];
  limitations: { summary: string; issue: string }[];
}
interface OptionSchema {
  required?: string[];
  properties: Record<
    string,
    {
      type?: string;
      default?: unknown;
      enum?: string[];
      aliases?: string[];
      description?: string;
      $default?: { $source?: string; index?: number };
      'x-deprecated'?: string;
    }
  >;
}
interface CatalogNode {
  id: string;
  attrs?: Record<string, string>;
  children?: CatalogNode[];
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

const repoRoot = getRepoRoot();
const mapping = readJson<Mapping>(join(schematicsDir, 'command-mapping.json'));
const mappingSchema = readJson<object>(join(schematicsDir, 'command-mapping.schema.json'));
const packageManifest = readJson<{ dependencies: Record<string, string> }>(
  join(repoRoot, 'projects/angular-django2/package.json'),
);

const lanes: [string, Record<string, Command>][] = [
  ['ui', mapping.ui.commands],
  ['api', mapping.api.commands],
  ['tooling', mapping.tooling.commands],
];
const allCommands = new Map<string, Command>(
  lanes.flatMap(([, commands]) => Object.entries(commands)),
);
const EXTERNAL_TOOLS = new Set(['ng-openapi-gen']);

function expandIds(id: string): string[] {
  const range = /^(.*?)(\d+)\.\.(\d+)$/.exec(id);
  if (!range) {
    return [id];
  }
  const [, prefix = '', from = '', to = ''] = range;
  const ids: string[] = [];
  for (let n = Number(from); n <= Number(to); n += 1) {
    ids.push(`${prefix}${String(n).padStart(from.length, '0')}`);
  }
  return ids;
}

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const kebab = (name: string): string => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function catalogScopes(): {
  leaves: Set<string>;
  leaflessCategories: Set<string>;
  categories: Set<string>;
} {
  const require = createRequire(import.meta.url);
  let directory = dirname(require.resolve('@shlomoa/openui-spec'));
  while (!existsSync(join(directory, 'spec/openui.json'))) {
    const parent = dirname(directory);
    expect(parent, 'the @shlomoa/openui-spec package must contain spec/openui.json').not.toBe(
      directory,
    );
    directory = parent;
  }
  const catalog = readJson<CatalogNode>(join(directory, 'spec/openui.json'));
  const leaves = new Set<string>();
  const categories = new Set<string>();
  const walk = (node: CatalogNode, path: string[]): void => {
    const ids = [...path, node.id];
    const document = node.attrs?.['scopeDocument'] ?? '';
    if (document.endsWith('.scope.md') && !document.endsWith('/scope.md')) {
      leaves.add(ids.slice(2).join('/'));
    } else if (document.endsWith('/scope.md') && ids.length === 3) {
      categories.add(ids[2] ?? '');
    }
    node.children?.forEach((child) => walk(child, ids));
  };
  walk(catalog, []);
  const withLeaves = new Set([...leaves].map((leaf) => leaf.split('/')[0]));
  const leaflessCategories = new Set(
    [...categories].filter((category) => !withLeaves.has(category)),
  );
  return { leaves, leaflessCategories, categories };
}

describe('command mapping', () => {
  it('TC-MAPPING-01: validates against its JSON Schema', () => {
    const Ajv2020 =
      (Ajv2020Module as unknown as { default?: typeof Ajv2020Module }).default ?? Ajv2020Module;
    const validate = new Ajv2020({ allErrors: true }).compile(mappingSchema);
    const valid = validate(mapping);
    expect(valid ? [] : validate.errors, 'schema errors').toEqual([]);
  });

  it('TC-MAPPING-02: states the format version and the pinned OpenUI package version', () => {
    expect(mapping.mappingVersion).toBe(1);
    expect(mapping.openuiSpecVersion).toBe(packageManifest.dependencies['@shlomoa/openui-spec']);
  });

  it('TC-MAPPING-03: describes every collection command exactly once, in the right lane', () => {
    const collection = readJson<{ schematics: Record<string, unknown> }>(collectionPath);
    const listed = lanes.flatMap(([, commands]) => Object.keys(commands));
    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual(Object.keys(collection.schematics).sort());
    expect(Object.keys(mapping.api.commands).sort()).toEqual(['data-service', 'openapi-setup']);
    for (const [name, command] of allCommands) {
      expect(command.invocation).toBe(`ng generate angular-django2:${name}`);
    }
  });

  it('TC-MAPPING-04: parameters equal the option schema of each command', () => {
    for (const [name, command] of allCommands) {
      const schema = readJson<OptionSchema>(schematicSchemaPath(name));
      const required = new Set(schema.required ?? []);
      expect(
        command.parameters.map((parameter) => parameter.name),
        `${name}: parameter names`,
      ).toEqual(Object.keys(schema.properties));
      for (const parameter of command.parameters) {
        const option = schema.properties[parameter.name];
        const where = `${name} --${parameter.name}`;
        expect(option, where).toBeDefined();
        const description = option?.description ?? '';
        expect(parameter.flag, `${where}: flag`).toBe(`--${kebab(parameter.name)}`);
        if (option?.aliases) {
          expect(option.aliases, `${where}: the flag is an alias`).toContain(
            parameter.flag.slice(2),
          );
        }
        expect(parameter.type, `${where}: type`).toBe(option?.type ?? 'string');
        expect(parameter.default, `${where}: default`).toEqual(option?.default);
        expect(parameter.enum, `${where}: enum`).toEqual(option?.enum);
        const positional =
          option?.$default?.$source === 'argv' ? (option.$default.index ?? 0) : undefined;
        expect(parameter.positional, `${where}: positional`).toBe(positional);
        expect(parameter.required === true, `${where}: required`).toBe(
          required.has(parameter.name),
        );
        expect(parameter.deprecated === true, `${where}: deprecated`).toBe(
          Boolean(option?.['x-deprecated']),
        );
        expect(parameter.notWithDocument === true, `${where}: notWithDocument`).toBe(
          /Not allowed with --document/.test(description),
        );
        expect(parameter.requiredUnlessDocument === true, `${where}: requiredUnlessDocument`).toBe(
          /Required unless --document/.test(description),
        );
        expect(parameter.requiresDocument === true, `${where}: requiresDocument`).toBe(
          /Requires --document/.test(description),
        );
      }
      const names = new Set(command.parameters.map((parameter) => parameter.name));
      for (const mode of Object.values(command.modes ?? {})) {
        for (const reference of [
          ...(mode.required ?? []),
          ...(mode.optional ?? []),
          ...(mode.conflicts ?? []),
        ]) {
          expect(names.has(reference), `${name}: mode parameter ${reference}`).toBe(true);
        }
      }
    }
  });

  it('TC-MAPPING-05: every cited test exists in the file it names', () => {
    for (const [name, command] of allCommands) {
      expect(Object.keys(command.tests).length, `${name}: tests`).toBeGreaterThan(0);
      for (const [kind, refs] of Object.entries(command.tests)) {
        for (const ref of refs) {
          const path = join(repoRoot, ref.file);
          expect(existsSync(path), `${name} ${kind}: ${ref.file}`).toBe(true);
          const content = readFileSync(path, 'utf8');
          for (const id of (ref.ids ?? []).flatMap(expandIds)) {
            const pattern = new RegExp(`(?<![A-Za-z0-9-])${escapeRegExp(id)}(?![A-Za-z0-9-])`);
            expect(pattern.test(content), `${name} ${kind}: ${id} in ${ref.file}`).toBe(true);
          }
          for (const text of ref.match ?? []) {
            expect(content.includes(text), `${name} ${kind}: "${text}" in ${ref.file}`).toBe(true);
          }
        }
      }
    }
  });

  it('TC-MAPPING-06: statements about re-runs and operations are consistent', () => {
    for (const [name, command] of allCommands) {
      const outcome = command.onExisting.outcome;
      if (
        command.classification === 'direct' &&
        ['reject', 'skip', 'refuse-modified'].includes(outcome)
      ) {
        expect(
          ['unsupported', 'partial'],
          `${name}: a command that does not rewrite cannot update`,
        ).toContain(command.operations['update']?.status);
      }
      if (['reject', 'skip', 'no-op', 'refuse-modified', 'rewrite'].includes(outcome)) {
        expect(command.tests['rerun']?.length ?? 0, `${name}: re-run evidence`).toBeGreaterThan(0);
      }
      if (command.classification === 'direct') {
        expect(
          (command.tests['document'] ?? command.tests['cli'] ?? []).length,
          `${name}: tests`,
        ).toBeGreaterThan(0);
      }
      for (const dependency of [...(command.before ?? []), ...(command.after ?? [])]) {
        expect(
          allCommands.has(dependency) || EXTERNAL_TOOLS.has(dependency),
          `${name}: ${dependency}`,
        ).toBe(true);
      }
    }
  });

  it('TC-MAPPING-07: node types refer to real commands, roots and one another', () => {
    const nodes = mapping.ui.nodes;
    const roots = new Set(
      Object.entries(nodes)
        .filter(([, node]) => node.role === 'root')
        .map(([type]) => type),
    );
    for (const [type, node] of Object.entries(nodes)) {
      for (const { command, lane } of node.commands ?? []) {
        const commands = lane === 'api' ? mapping.api.commands : mapping.ui.commands;
        expect(commands[command], `${type}: command ${command}`).toBeDefined();
      }
      for (const child of node.compiles ?? []) {
        expect(nodes[child], `${type}: compiles ${child}`).toBeDefined();
      }
      for (const parent of node.compiledBy ?? []) {
        expect(roots.has(parent), `${type}: compiledBy ${parent}`).toBe(true);
      }
      for (const operation of Object.values(node.operations)) {
        for (const via of operation.via ?? []) {
          expect(roots.has(via), `${type}: via ${via}`).toBe(true);
        }
      }
      if (node.role === 'root') {
        const outcomes = (node.commands ?? []).map(
          ({ command }) => allCommands.get(command)?.onExisting.outcome ?? '',
        );
        if (outcomes.every((outcome) => ['reject', 'skip', 'refuse-modified'].includes(outcome))) {
          expect(node.operations['update']?.status, `${type}: update`).not.toBe('supported');
        }
      }
    }
  });

  it('TC-MAPPING-08: accounts for every scope of the pinned catalog exactly once', () => {
    const { leaves, leaflessCategories, categories } = catalogScopes();
    const listed = mapping.scopes.map((entry) => entry.scope);
    expect(new Set(listed).size, 'a scope is listed twice').toBe(listed.length);
    expect([...listed].sort()).toEqual([...leaves, ...leaflessCategories].sort());

    const byScope = new Map(mapping.scopes.map((entry) => [entry.scope, entry]));
    for (const [type, node] of Object.entries(mapping.ui.nodes)) {
      expect(
        leaves.has(node.scope) || categories.has(node.scope),
        `${type}: scope ${node.scope}`,
      ).toBe(true);
      if (type !== 'Application') {
        expect(
          byScope.get(node.scope)?.nodeTypes,
          `${type} is listed under ${node.scope}`,
        ).toContain(type);
      }
    }
    for (const entry of mapping.scopes) {
      for (const type of entry.nodeTypes ?? []) {
        expect(mapping.ui.nodes[type], `${entry.scope}: node type ${type}`).toBeDefined();
      }
    }
  });
});
