import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, type UnitTestTree } from '@angular-devkit/schematics/testing';
import type { OpenUiElement } from '@shlomoa/openui-spec';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  angularCollectionPath,
  collectionPath,
  openUiDocumentString as openUiDocument,
} from './schematics.helpers';

/**
 * Re-running `material-app` on an existing project applies a changed Application document (shlomoa/angular-django2#198):
 * the result equals a clean regeneration, and edits made around the generated regions survive.
 */
const DOCUMENT_PATH = 'update.openui.json';
const OPTIONS = { document: DOCUMENT_PATH, name: 'shop', defaults: true };
const APP = '/projects/shop/src/app';

interface State {
  /** Route keys: each is a Route, a NavItem labelled with the key, and a page. */
  routes: string[];
  title: string;
  /** Toolbar actions with a handler, by id; `undefined` leaves the toolbar out. */
  actions?: string[];
  theme?: string;
  typography?: boolean;
  animations?: boolean;
}

const BASE: State = { routes: ['a', 'b'], title: 'Shop', actions: ['refresh'] };

function application(state: State): OpenUiElement[] {
  const nodes: OpenUiElement[] = [
    {
      id: 'shop',
      type: 'Application',
      children: [
        {
          id: 'routing',
          type: 'Routing',
          children: state.routes.map((key) => ({
            id: `${key}Route`,
            type: 'Route',
            attrs: { 'uses.path': `"${key}"`, 'uses.target': `"page${key}"` },
          })),
        },
        {
          id: 'navigation',
          type: 'Navigation',
          children: state.routes.map((key) => ({
            id: `${key}Nav`,
            type: 'NavItem',
            attrs: { 'uses.label': `"Nav ${key}"`, 'uses.route': `"${key}Route"` },
          })),
        },
        { id: 'host', type: 'html', attrs: { 'uses.title': `"${state.title}"` } },
        ...(state.actions
          ? [
              {
                id: 'bar',
                type: 'ToolBar',
                children: [
                  {
                    id: 'row',
                    type: 'ToolBarRow',
                    children: state.actions.map((id) => ({
                      id,
                      type: 'ToolAction',
                      attrs: { 'uses.label': `"${id}"`, 'produces.activate': null },
                    })),
                  },
                ],
              } satisfies OpenUiElement,
            ]
          : []),
        ...(state.theme !== undefined ||
        state.typography !== undefined ||
        state.animations !== undefined
          ? [
              {
                id: 'look',
                type: 'Presentation',
                attrs: {
                  ...(state.theme !== undefined ? { 'uses.theme': `"${state.theme}"` } : {}),
                  ...(state.typography !== undefined
                    ? { 'uses.typography': String(state.typography) }
                    : {}),
                  ...(state.animations !== undefined
                    ? { 'uses.animations': String(state.animations) }
                    : {}),
                },
              } satisfies OpenUiElement,
            ]
          : []),
      ],
    },
  ];
  const pages = [...new Set([...state.routes, ...BASE.routes])].map((key): OpenUiElement => ({
    id: `page${key}`,
    type: 'DashboardPage',
    attrs: { 'uses.route': `"${key}"` },
  }));
  return [...nodes, ...pages];
}

describe('material-app re-run applies a changed Application document (TC-APP-UPDATE)', () => {
  let runner: SchematicTestRunner;
  let angularRunner: SchematicTestRunner;

  beforeEach(() => {
    runner = new SchematicTestRunner('angular-django2', collectionPath);
    angularRunner = new SchematicTestRunner('@schematics/angular', angularCollectionPath);
  });

  async function workspace(state: State): Promise<UnitTestTree> {
    const tree = (await angularRunner.runSchematic(
      'workspace',
      { name: 'demo', version: '22.0.0', newProjectRoot: 'projects' },
      Tree.empty(),
    )) as UnitTestTree;
    const packageJson = JSON.parse(tree.readContent('/package.json'));
    Object.assign(packageJson.dependencies, {
      '@angular/cdk': '^22.0.0',
      '@angular/forms': '^22.0.0',
      '@angular/material': '^22.0.0',
    });
    tree.overwrite('/package.json', JSON.stringify(packageJson, null, 2));
    tree.create(`/${DOCUMENT_PATH}`, openUiDocument(...application(state)));
    return tree;
  }

  const generate = async (state: State): Promise<UnitTestTree> =>
    runner.runSchematic('material-app', OPTIONS, await workspace(state));

  const rerun = (tree: UnitTestTree, state: State): Promise<UnitTestTree> => {
    tree.overwrite(`/${DOCUMENT_PATH}`, openUiDocument(...application(state)));
    return runner.runSchematic('material-app', OPTIONS, tree);
  };

  const files = (tree: UnitTestTree): Record<string, string> => {
    const content: Record<string, string> = {};
    tree.visit((path) => {
      content[path] = tree.readContent(path);
    });
    return content;
  };

  const CHANGES: [string, State, State][] = [
    ['adds a route and nav item', BASE, { ...BASE, routes: ['a', 'b', 'c'] }],
    ['removes a route and nav item', BASE, { ...BASE, routes: ['a'] }],
    ['changes the title', BASE, { ...BASE, title: 'Store' }],
    ['adds a toolbar action', BASE, { ...BASE, actions: ['refresh', 'export'] }],
    [
      'changes a prebuilt theme',
      { ...BASE, theme: 'indigo-pink' },
      { ...BASE, theme: 'purple-green' },
    ],
    [
      'changes a prebuilt theme to the custom theme',
      { ...BASE, theme: 'indigo-pink' },
      { ...BASE, theme: 'custom' },
    ],
    [
      'changes the custom theme to a prebuilt theme',
      { ...BASE, theme: 'custom' },
      { ...BASE, theme: 'deeppurple-amber' },
    ],
    [
      'changes the typography of the custom theme',
      { ...BASE, theme: 'custom', typography: true },
      { ...BASE, theme: 'custom', typography: false },
    ],
    ['turns animations off', { ...BASE, animations: true }, { ...BASE, animations: false }],
  ];

  it.each(CHANGES)(
    'TC-APP-UPDATE-01: re-run equals a clean regeneration when the document %s',
    async (_name, before, after) => {
      const updated = await rerun(await generate(before), after);
      const clean = await generate(after);
      expect(files(updated)).toEqual(files(clean));
    },
  );

  it('TC-APP-UPDATE-02: a re-run keeps edits made outside the generated regions', async () => {
    const first = await generate(BASE);
    const html = `${APP}/app.html`;
    const scss = `${APP}/app.scss`;
    const component = `${APP}/app.ts`;
    const spec = `${APP}/app.spec.ts`;
    first.overwrite(html, `${first.readContent(html)}\n<footer>mine</footer>\n`);
    first.overwrite(scss, `${first.readContent(scss)}\n.mine { color: red; }\n`);
    first.overwrite(
      component,
      first
        .readContent(component)
        .replace(
          "throw new Error('onRefreshActivate is not implemented');",
          'this.refreshed = true;',
        )
        .replace('  // openui:begin title', '  refreshed = false;\n\n  // openui:begin title'),
    );
    first.overwrite(
      spec,
      first.readContent(spec).replace(/\}\);\s*$/, "  it('mine', () => expect(1).toBe(1));\n});\n"),
    );

    const second = await rerun(first, {
      ...BASE,
      title: 'Store',
      routes: ['a', 'b', 'c'],
      actions: ['refresh', 'export'],
    });

    // The changes were applied ...
    expect(second.readContent(html)).toContain('Nav c');
    expect(second.readContent(html)).toContain('export');
    expect(second.readContent(component)).toContain("title = 'Store';");
    expect(second.readContent(component)).toContain('onExportActivate');
    expect(second.readContent(spec)).toContain("toContain('Store')");
    // ... and the edits around the generated regions remain.
    expect(second.readContent(html)).toContain('<footer>mine</footer>');
    expect(second.readContent(scss)).toContain('.mine { color: red; }');
    expect(second.readContent(component)).toContain('this.refreshed = true;');
    expect(second.readContent(component)).not.toContain('onRefreshActivate is not implemented');
    expect(second.readContent(component)).toContain('refreshed = false;');
    expect(second.readContent(spec)).toContain("it('mine'");
  });

  it('TC-APP-UPDATE-06: removing a toolbar action removes it from the template and keeps its handler', async () => {
    const first = await generate(BASE);
    first.overwrite(
      `${APP}/app.ts`,
      first
        .readContent(`${APP}/app.ts`)
        .replace("throw new Error('onRefreshActivate is not implemented');", 'this.done = true;'),
    );
    const second = await rerun(first, { ...BASE, actions: undefined });
    expect(second.readContent(`${APP}/app.html`)).not.toContain('refresh');
    expect(second.readContent(`${APP}/app.ts`)).toContain('this.done = true;');
  });

  it('TC-APP-UPDATE-03: a re-run with an unchanged document leaves hand-edited files unchanged', async () => {
    const first = await generate(BASE);
    first.overwrite(
      `${APP}/app.html`,
      `${first.readContent(`${APP}/app.html`)}\n<footer>mine</footer>\n`,
    );
    const before = files(first);
    expect(files(await rerun(first, BASE))).toEqual(before);
  });

  it('TC-APP-UPDATE-04: a file without generated regions is replaced whole, then keeps edits', async () => {
    const first = await generate(BASE);
    // Output of an earlier version, or a file written by hand, has no markers.
    first.overwrite(`${APP}/app.html`, '<p>old</p>\n');
    const second = await rerun(first, BASE);
    expect(second.readContent(`${APP}/app.html`)).toContain('openui:begin toolbar');
    expect(second.readContent(`${APP}/app.html`)).not.toContain('<p>old</p>');
  });

  it('TC-APP-UPDATE-05: a region whose markers were removed is left as it is', async () => {
    const first = await generate(BASE);
    const html = `${APP}/app.html`;
    first.overwrite(
      html,
      first
        .readContent(html)
        .replace('<!-- openui:begin nav -->', '')
        .replace('<!-- openui:end nav -->', ''),
    );
    const second = await rerun(first, { ...BASE, routes: ['a', 'b', 'c'] });
    expect(second.readContent(html)).not.toContain('Nav c');
    expect(second.readContent(html)).toContain('openui:begin toolbar');
  });
});
