import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  FAVICON_ATTRIBUTES,
  INDEX_HTML_ATTRIBUTES,
  NAV_GROUP_ATTRIBUTES,
  NAVIGATION_ATTRIBUTES,
  PRESENTATION_ATTRIBUTES,
  TOOL_ACTION_ATTRIBUTES,
  TOOL_BAR_ATTRIBUTES,
} from 'angular-django2/schematics/application/ast';
import { SURFACE_CONTAINER_ATTRIBUTES } from 'angular-django2/schematics/component/ast';
import { OVERLAY_CONTAINER_ATTRIBUTES } from 'angular-django2/schematics/complex-component/index';
import { DATA_ATTRIBUTE } from 'angular-django2/schematics/data-service/ast';
import { AST_SLOT_ATTRIBUTE } from 'angular-django2/schematics/embed-component/compose';
import { CONTROL_ATTRIBUTES } from 'angular-django2/schematics/form-field/ast';
import { PAGE_ATTRIBUTES } from 'angular-django2/schematics/page/ast';
import {
  FORM_ATTRIBUTES,
  SUBMIT_ACTION_ATTRIBUTES,
} from 'angular-django2/schematics/reactive-form/ast';
import {
  NAV_ITEM_ATTRIBUTES,
  ROUTE_ATTRIBUTES,
  ROUTING_ATTRIBUTES,
} from 'angular-django2/schematics/utility/routing';

import { getRepoRoot } from '../../e2e/utils/temp_areas';
import { collectionPath } from '../schematics/schematics.helpers';

const repoRoot = getRepoRoot();
const reference = readFileSync(path.join(repoRoot, 'docs/OPENUI_DOCUMENTS.md'), 'utf8');

/** Every attribute key the schematics read, keyed by the constant that names it. */
const READ_ATTRIBUTES: Record<string, readonly string[]> = {
  ROUTING_ATTRIBUTES: Object.values(ROUTING_ATTRIBUTES),
  ROUTE_ATTRIBUTES: Object.values(ROUTE_ATTRIBUTES),
  NAV_ITEM_ATTRIBUTES: Object.values(NAV_ITEM_ATTRIBUTES),
  NAVIGATION_ATTRIBUTES: Object.values(NAVIGATION_ATTRIBUTES),
  NAV_GROUP_ATTRIBUTES: Object.values(NAV_GROUP_ATTRIBUTES),
  TOOL_BAR_ATTRIBUTES: Object.values(TOOL_BAR_ATTRIBUTES),
  TOOL_ACTION_ATTRIBUTES: Object.values(TOOL_ACTION_ATTRIBUTES),
  PRESENTATION_ATTRIBUTES: Object.values(PRESENTATION_ATTRIBUTES),
  INDEX_HTML_ATTRIBUTES: Object.values(INDEX_HTML_ATTRIBUTES),
  FAVICON_ATTRIBUTES: Object.values(FAVICON_ATTRIBUTES),
  PAGE_ATTRIBUTES: Object.values(PAGE_ATTRIBUTES),
  SURFACE_CONTAINER_ATTRIBUTES: Object.values(SURFACE_CONTAINER_ATTRIBUTES),
  OVERLAY_CONTAINER_ATTRIBUTES: Object.values(OVERLAY_CONTAINER_ATTRIBUTES),
  CONTROL_ATTRIBUTES: Object.values(CONTROL_ATTRIBUTES),
  FORM_ATTRIBUTES: Object.values(FORM_ATTRIBUTES),
  SUBMIT_ACTION_ATTRIBUTES: Object.values(SUBMIT_ACTION_ATTRIBUTES),
  DATA_ATTRIBUTE: [DATA_ATTRIBUTE],
  AST_SLOT_ATTRIBUTE: [AST_SLOT_ATTRIBUTE],
};

/** Keys the reference names although no schematic reads them: a page attribute that moved to its `Route`, and the placeholders of the upgrade steps. */
const NAMED_BUT_NOT_READ = new Set(['uses.authGuard', 'behaves.name', 'produces.name']);

describe('OpenUI documents reference', () => {
  it('TC-REFERENCE-01: documents every attribute key the schematics read', () => {
    for (const [constant, keys] of Object.entries(READ_ATTRIBUTES)) {
      for (const key of keys) {
        expect(reference, `${constant} key ${key}`).toContain(`\`${key}\``);
      }
    }
  });

  it('TC-REFERENCE-02: names no attribute key that no schematic reads', () => {
    const read = new Set(Object.values(READ_ATTRIBUTES).flat());
    const named = [...reference.matchAll(/`((?:uses|behaves|produces)\.\w+)`/g)].map(
      ([, key]) => key,
    );

    for (const key of named) {
      expect(read.has(key) || NAMED_BUT_NOT_READ.has(key), `unknown key ${key}`).toBe(true);
    }
  });

  it('TC-REFERENCE-03: lists every diagnostic code of the validator', () => {
    const validator = readFileSync(
      path.join(
        path.dirname(createRequire(import.meta.url).resolve('@shlomoa/openui-spec')),
        'document.js',
      ),
      'utf8',
    );
    const codes = new Set(
      [...validator.matchAll(/"((?:grammar|document|catalog|contract)\/[a-z-]+)"/g)].map(
        ([, code]) => code,
      ),
    );

    expect(codes.size).toBeGreaterThan(10);
    for (const code of codes) {
      const [stage, name] = code.split('/');
      const row = reference.split('\n').find((line) => line.startsWith(`| \`${stage}\``));
      expect(row, `no ${stage} row`).toBeDefined();
      expect(row, code).toContain(`\`${name}\``);
    }
  });

  it('TC-REFERENCE-04: is published in the documentation navigation, with the examples page', () => {
    const mkdocs = readFileSync(path.join(repoRoot, 'mkdocs.yml'), 'utf8');
    const nav = mkdocs.split('\nnav:\n')[1].split('\ntheme:')[0];

    expect(nav).toContain('OPENUI_DOCUMENTS.md');
    expect(nav).toContain('OPENUI_EXAMPLES.md');
  });
});

interface CatalogNode {
  id: string;
  attrs?: { scopeDocument?: string };
  children?: CatalogNode[];
}

/** `<category>/<id>` of every scope in the catalog, for example `widgets/table`. */
function scopePaths(node: CatalogNode, parents: string[] = []): string[] {
  const own = node.attrs?.scopeDocument ? [...parents, node.id] : parents;
  const scopes = (node.children ?? []).filter((child) => child.attrs?.scopeDocument);

  return [
    ...(own.length > 3 ? [own.slice(2).join('/')] : []),
    ...scopes.flatMap((child) => scopePaths(child, own)),
  ];
}

describe('OpenUI mapping document', () => {
  const mapping = readFileSync(path.join(repoRoot, 'docs/ngdj-openui-spec-mapping.md'), 'utf8');

  it('TC-MAPPING-01: classifies every scope of the installed catalog', () => {
    const catalogPath = path.join(
      path.dirname(createRequire(import.meta.url).resolve('@shlomoa/openui-spec')),
      '../../spec/openui.json',
    );
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as CatalogNode;
    const leaves = scopePaths(catalog);

    expect(leaves.length).toBeGreaterThan(40);
    for (const leaf of leaves) {
      expect(mapping, `scope ${leaf}`).toContain(`\`${leaf}`);
    }
  });

  it('TC-MAPPING-02: names every schematic of the collection', () => {
    const collection = JSON.parse(readFileSync(collectionPath, 'utf8')) as {
      schematics: Record<string, unknown>;
    };

    for (const schematic of Object.keys(collection.schematics)) {
      expect(mapping, `schematic ${schematic}`).toContain(`\`${schematic}\``);
    }
  });

  it('TC-MAPPING-03: states the OpenUI version the dependency implements', () => {
    const catalogVersion = JSON.parse(
      readFileSync(
        path.join(
          path.dirname(createRequire(import.meta.url).resolve('@shlomoa/openui-spec')),
          '../../spec/openui.json',
        ),
        'utf8',
      ),
    ) as { version: string };

    expect(mapping).toContain(`OpenUI ${catalogVersion.version}`);
    expect(mapping).not.toMatch(/OpenUI 0\.[0-7]\.\d/);
  });
});
