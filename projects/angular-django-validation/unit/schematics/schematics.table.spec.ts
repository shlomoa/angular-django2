import { readFileSync } from 'node:fs';
import { Tree } from '@angular-devkit/schematics';
import type { UnitTestTree } from '@angular-devkit/schematics/testing';
import { describe, expect, it } from 'vitest';
import type { TableSchema } from 'angular-django2/schematics/table/schema';

import { table } from 'angular-django2/schematics/table/index';
import {
  collectionPath,
  createSchematicContext,
  openUiDocumentString,
  schematicSchemaPath,
} from './schematics.helpers';

const DOCUMENT_PATH = 'documents/orders.openui.json';
const TABLES = '/src/app/shared/tables';

const ORDERS_TABLE = {
  id: 'orders',
  type: 'table',
  attrs: {
    'behaves.sort': 'sortOrders($event)',
    'behaves.filter': 'filterOrders($event)',
    'behaves.paginate': 'paginateOrders($event)',
  },
  children: [
    { id: 'ordersCaption', type: 'caption' },
    { id: 'ordersHeader', type: 'thead' },
    { id: 'ordersRow', type: 'tr' },
  ],
};

function createApplicationTree(
  children: unknown[] = [ORDERS_TABLE],
  projects: Record<string, { root: string; sourceRoot: string }> = {
    demo: { root: '', sourceRoot: 'src' },
  },
): UnitTestTree {
  const tree = Tree.empty() as UnitTestTree;
  tree.create('/angular.json', JSON.stringify({ version: 1, projects }));
  tree.create(
    '/package.json',
    JSON.stringify({
      dependencies: { '@angular/cdk': '^22.0.0', '@angular/material': '^22.0.0' },
    }),
  );
  tree.create(`/${DOCUMENT_PATH}`, openUiDocumentString(...(children as never[])));
  return tree;
}

function compile(tree: Tree, options: Partial<TableSchema> = {}): UnitTestTree {
  return table({ document: DOCUMENT_PATH, ...options })(
    tree,
    createSchematicContext(),
  ) as UnitTestTree;
}

function compileNode(node: unknown, options: Partial<TableSchema> = {}): UnitTestTree {
  return compile(createApplicationTree([node]), options);
}

function read(tree: Tree, path: string): string {
  return tree.read(path)!.toString();
}

function output(tree: Tree, name = 'orders'): { ts: string; html: string; scss: string } {
  const base = `${TABLES}/${name}-table/${name}-table`;
  return {
    ts: read(tree, `${base}.ts`),
    html: read(tree, `${base}.html`),
    scss: read(tree, `${base}.scss`),
  };
}

function tableWith(
  attrs: Record<string, string | null> | undefined,
  children: unknown[] = [],
): unknown {
  return { id: 'orders', type: 'table', ...(attrs ? { attrs } : {}), children };
}

describe('table schematic', () => {
  it('TC-TABLE-01: compiles a table node into a standalone OnPush Material component', () => {
    const { ts, html, scss } = output(compile(createApplicationTree()));

    expect(ts).toContain("selector: 'app-orders-table'");
    expect(ts).toContain('standalone: true');
    expect(ts).toContain('changeDetection: ChangeDetectionStrategy.OnPush');
    expect(ts).toContain('export class OrdersTableComponent<TRow extends object');
    expect(ts).toContain("templateUrl: './orders-table.html'");
    expect(ts).toContain("styleUrl: './orders-table.scss'");
    expect(ts).toContain(
      'imports: [MatFormFieldModule, MatInputModule, MatPaginatorModule, MatSortModule, MatTableModule]',
    );
    expect(ts).toContain("from '@angular/material/table'");
    expect(html).toContain('<table mat-table [dataSource]="rows()"');
    expect(html).toContain('<tr mat-row *matRowDef="let row; columns: columnKeys()"></tr>');
    expect(scss).toContain('.orders-table__scroll');
  });

  it('TC-TABLE-02: takes its columns from the host and reads none from the document', () => {
    const { ts, html } = output(compile(createApplicationTree()));

    expect(ts).toContain('readonly columns = input.required<readonly OrdersTableColumn<TRow>[]>()');
    expect(ts).toContain('readonly rows = input<readonly TRow[]>([])');
    expect(ts).toContain('export interface OrdersTableColumn<TRow>');
    expect(html).toContain('@for (column of columns(); track column.key)');
    expect(html).toContain('[matColumnDef]="column.key"');
    expect(html).toContain('{{ row[column.key] }}');
    // The document names no column: nothing but the node id appears in the output.
    expect(ts).not.toContain('uses.columns');
  });

  it('TC-TABLE-03: wires the three behaviours to generated handlers and outputs', () => {
    const { ts, html } = output(compile(createApplicationTree()));

    expect(ts).toContain('readonly sorted = output<Sort>()');
    expect(ts).toContain('readonly filtered = output<string>()');
    expect(ts).toContain('readonly paginated = output<OrdersTablePage>()');
    expect(ts).toContain('protected onSort(sort: Sort): void');
    expect(ts).toContain('this.sorted.emit(sort)');
    expect(ts).toContain('this.filtered.emit(text)');
    expect(ts).toContain('this.paginated.emit({');
    expect(ts).toContain('offset: event.pageIndex * event.pageSize');
    // The host handler expressions of the document are the host bindings of the outputs.
    expect(ts).toContain('(sorted)="sortOrders($event)"');
    expect(ts).toContain('(filtered)="filterOrders($event)"');
    expect(ts).toContain('(paginated)="paginateOrders($event)"');
    expect(html).toContain('(matSortChange)="onSort($event)"');
    expect(html).toContain('(input)="onFilter($event)"');
    expect(html).toContain('(page)="onPage($event)"');
    expect(html).toContain('[mat-sort-header]="column.key"');
    expect(html).toContain('<mat-paginator');
    expect(html).toContain('<mat-form-field');
  });

  it('TC-TABLE-04: generates only the features whose behaviours the document declares', () => {
    const { ts, html } = output(
      compileNode(
        tableWith({ 'behaves.paginate': 'paginateOrders($event)' }, [{ id: 'r', type: 'tr' }]),
      ),
    );

    expect(ts).toContain('MatPaginatorModule');
    expect(ts).not.toContain('MatSortModule');
    expect(ts).not.toContain('MatInputModule');
    expect(ts).not.toContain('onSort');
    expect(ts).not.toContain('onFilter');
    expect(ts).not.toContain('DestroyRef');
    expect(html).toContain('<mat-paginator');
    expect(html).not.toContain('matSort');
    expect(html).not.toContain('mat-form-field');

    const plain = output(compileNode(tableWith(undefined)));
    expect(plain.html).not.toContain('mat-paginator');
    expect(plain.ts).not.toContain('output');
    expect(plain.ts).not.toContain('MatPaginatorModule');
  });

  it('TC-TABLE-05: a declared behaviour without an expression still generates its output', () => {
    const { ts } = output(compileNode(tableWith({ 'behaves.filter': null })));

    expect(ts).toContain('readonly filtered = output<string>()');
    expect(ts).toContain('(filtered)="filter($event)"');
  });

  it('TC-TABLE-06: renders the caption and the header row only when the document has them', () => {
    const full = output(compile(createApplicationTree()));
    expect(full.html).toContain('@if (caption())');
    expect(full.html).toContain('<caption [textContent]="caption()"></caption>');
    expect(full.html).toContain(
      '<tr mat-header-row *matHeaderRowDef="columnKeys(); sticky: true"></tr>',
    );
    expect(full.html).toContain('scope="col"');
    expect(full.ts).toContain("readonly caption = input('')");

    const bare = output(compileNode(tableWith(undefined, [{ id: 'r', type: 'tr' }])));
    expect(bare.html).not.toContain('<caption');
    expect(bare.html).not.toContain('mat-header-row');
    expect(bare.html).not.toContain('mat-header-cell');
    expect(bare.ts).not.toContain('caption');
  });

  it('TC-TABLE-07: wraps the table in an accessible, keyboard-reachable scroll region', () => {
    const { ts, html } = output(compile(createApplicationTree()));

    expect(html).toContain('role="region" tabindex="0" [attr.aria-label]="ariaLabel()"');
    expect(html).toContain('aria-label="Select page of orders"');
    expect(ts).toContain("readonly ariaLabel = input('Orders table')");
  });

  it('TC-TABLE-08: emits Django REST framework pagination and ordering helpers', () => {
    const { ts } = output(compile(createApplicationTree()));

    expect(ts).toContain('export interface OrdersTableDrfPage<TRow>');
    expect(ts).toContain('readonly results: readonly TRow[]');
    expect(ts).toContain('export function ordersTablePageQuery(page: OrdersTablePage)');
    expect(ts).toContain('export function ordersTableOrdering(sort: Sort)');
    expect(ts).toContain('`-${sort.active}`');
    expect(ts).toContain('readonly totalRows = input<number | null>(null)');
  });

  it('TC-TABLE-09: returns to the first page after a sort or a filter and cleans up the filter timer', () => {
    const { ts } = output(compile(createApplicationTree()));

    expect(ts).toMatch(/onSort\(sort: Sort\): void \{\n\s+this\.pageIndex\.set\(0\);/);
    expect(ts).toMatch(/setTimeout\(\(\) => \{\n\s+this\.pageIndex\.set\(0\);/);
    expect(ts).toContain('inject(DestroyRef).onDestroy(() => clearTimeout(this.filterTimer))');
  });

  it('TC-TABLE-10: resolves --nodeId, defaults to the first table, and honours --name, --path and --project', () => {
    const second = { id: 'invoices', type: 'table' };
    const tree = createApplicationTree([ORDERS_TABLE, second], {
      admin: { root: 'projects/admin', sourceRoot: 'projects/admin/src' },
      shop: { root: 'projects/shop', sourceRoot: 'projects/shop/src' },
    });

    const byId = compile(tree, { nodeId: 'invoices', project: 'shop', path: 'src/app/lists' });
    expect(byId.exists('/projects/shop/src/app/lists/invoices-table/invoices-table.ts')).toBe(true);

    const first = compile(tree, { project: 'admin', name: 'sales-orders' });
    expect(
      first.exists(
        '/projects/admin/src/app/shared/tables/sales-orders-table/sales-orders-table.ts',
      ),
    ).toBe(true);
    expect(
      read(first, '/projects/admin/src/app/shared/tables/sales-orders-table/sales-orders-table.ts'),
    ).toContain('export class SalesOrdersTableComponent');
  });

  it('TC-TABLE-11: rejects attributes the table does not support', () => {
    const cases: [Record<string, string | null>, string][] = [
      [{ 'uses.columns': '"id,total"' }, 'unsupported attribute(s): uses.columns'],
      [{ 'uses.label': '"Orders"' }, 'unsupported attribute(s): uses.label'],
      [{ sort: 'sortOrders($event)' }, 'unsupported attribute(s): sort'],
      [{ 'produces.sorted': null }, 'unsupported attribute(s): produces.sorted'],
    ];
    for (const [attrs, message] of cases) {
      expect(() => compileNode(tableWith(attrs))).toThrow(message);
    }
  });

  it('TC-TABLE-12: rejects child types the table does not support and cell types the catalog lacks', () => {
    expect(() => compileNode(tableWith(undefined, [{ id: 'note', type: 'section' }]))).toThrow(
      'has a child "note" of type "section", which a table does not support',
    );
    expect(() =>
      compileNode(
        tableWith(undefined, [{ id: 'head', type: 'thead', children: [{ id: 'c', type: 'th' }] }]),
      ),
    ).toThrow(
      '/children/0/children/0/children/0/type: catalog/unknown-type: unknown OpenUI object type: th',
    );
    expect(() =>
      compileNode(
        tableWith(undefined, [{ id: 'row', type: 'tr', children: [{ id: 'c', type: 'td' }] }]),
      ),
    ).toThrow('catalog/unknown-type: unknown OpenUI object type: td');
  });

  it('TC-TABLE-13: rejects children and attributes on caption, thead and tr', () => {
    expect(() =>
      compileNode(
        tableWith(undefined, [
          { id: 'head', type: 'thead', children: [{ id: 'x', type: 'section' }] },
        ]),
      ),
    ).toThrow('of type "thead" has child node(s) of type "section"');
    expect(() =>
      compileNode(
        tableWith(undefined, [{ id: 'row', type: 'tr', attrs: { 'uses.label': '"A"' } }]),
      ),
    ).toThrow('"documents/orders.openui.json#orders/row" has unsupported attribute(s): uses.label');
    expect(() =>
      compileNode(
        tableWith(undefined, [{ id: 'cap', type: 'caption', attrs: { 'uses.label': '"A"' } }]),
      ),
    ).toThrow('unsupported attribute(s): uses.label');
  });

  it('TC-TABLE-14: enforces the child cardinalities and the header that sorting needs', () => {
    expect(() =>
      compileNode(
        tableWith(undefined, [
          { id: 'a', type: 'caption' },
          { id: 'b', type: 'caption' },
        ]),
      ),
    ).toThrow('more than 1 "caption" child');
    expect(() =>
      compileNode(
        tableWith(undefined, [
          { id: 'a', type: 'thead' },
          { id: 'b', type: 'thead' },
        ]),
      ),
    ).toThrow('more than 1 "thead" child');
    expect(() => compileNode(tableWith({ 'behaves.sort': 'sortOrders($event)' }))).toThrow(
      'declares behaves.sort but has no "thead" child',
    );
    expect(
      compileNode(
        tableWith(undefined, [
          { id: 'a', type: 'tr' },
          { id: 'b', type: 'tr' },
          { id: 'c', type: 'tr' },
        ]),
      ).exists(`${TABLES}/orders-table/orders-table.ts`),
    ).toBe(true);
  });

  it('TC-TABLE-15: rejects a behaviour that is not a host handler call', () => {
    for (const handler of ['sortOrders', 'sortOrders()', 'a; b($event)', 'sort($event) */ x']) {
      expect(() => compileNode(tableWith({ 'behaves.filter': handler }))).toThrow(
        'must be a host handler call with the event',
      );
    }
    // A quoted literal is text, not an expression; the canonical validator rejects it.
    expect(() => compileNode(tableWith({ 'behaves.filter': '"x"' }))).toThrow(
      'contract/wrong-value-type',
    );
    expect(
      compileNode(tableWith({ 'behaves.filter': 'orders.filter($event)' })).exists(
        `${TABLES}/orders-table/orders-table.ts`,
      ),
    ).toBe(true);
  });

  it('TC-TABLE-16: rejects an invalid selection, options and prerequisites before creating output', () => {
    const tree = createApplicationTree([ORDERS_TABLE, { id: 'other', type: 'section' }]);
    const missingDependencies = createApplicationTree();
    missingDependencies.overwrite('/package.json', JSON.stringify({ dependencies: {} }));

    expect(() => compile(tree, { nodeId: 'other' })).toThrow(
      'OpenUI node "other" has type "section" but this schematic expects "table".',
    );
    expect(() => compile(tree, { nodeId: 'missing' })).toThrow('object not found: missing');
    expect(() => compile(createApplicationTree([{ id: 'x', type: 'section' }]))).toThrow(
      'contains no "table" element',
    );
    expect(() => compile(tree, { name: 'Orders' })).toThrow('kebab-case');
    expect(() => compile(tree, { path: '../outside' })).toThrow(
      'within the application source tree',
    );
    expect(() => compile(missingDependencies)).toThrow('requires installed prerequisites');
    expect(() => table({} as never)).toThrow('--document is required');
    expect(() => table({ document: DOCUMENT_PATH, extra: 1 } as never)).toThrow(
      'Unsupported table option(s): extra.',
    );
    expect(() =>
      table({ document: 'missing.openui.json' })(tree, createSchematicContext()),
    ).toThrow('was not found in the workspace');
    expect(tree.exists(`${TABLES}/orders-table/orders-table.ts`)).toBe(false);
  });

  it('TC-TABLE-17: rejects a rerun before modifying existing output', () => {
    const tree = createApplicationTree();
    const first = compile(tree);
    const componentPath = `${TABLES}/orders-table/orders-table.ts`;
    first.overwrite(componentPath, '// maintained table');

    expect(() => compile(first)).toThrow('already exists');
    expect(read(first, componentPath)).toBe('// maintained table');
  });

  it('TC-TABLE-18: registers the schematic with its schema, and exposes the node-id aliases', () => {
    const collection = JSON.parse(readFileSync(collectionPath, 'utf8')) as {
      schematics: Record<string, { factory: string; schema: string; description: string }>;
    };
    const schema = JSON.parse(readFileSync(schematicSchemaPath('table'), 'utf8')) as {
      required: string[];
      additionalProperties: boolean;
      properties: Record<string, { aliases?: string[] }>;
    };

    expect(collection.schematics['table']).toMatchObject({
      factory: './table/index#table',
      schema: './table/schema.json',
    });
    expect(schema.required).toEqual(['document']);
    expect(schema.additionalProperties).toBe(false);
    expect(Object.keys(schema.properties).sort()).toEqual([
      'document',
      'name',
      'nodeId',
      'path',
      'project',
    ]);
    expect(schema.properties['nodeId'].aliases).toEqual([
      'element-id',
      'elementId',
      'node-id',
      'nodeId',
    ]);
  });
});
