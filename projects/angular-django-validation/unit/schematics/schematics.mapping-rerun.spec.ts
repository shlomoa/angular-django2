import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, type UnitTestTree } from '@angular-devkit/schematics/testing';
import type { OpenUiElement } from '@shlomoa/openui-spec';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  angularCollectionPath,
  collectionPath,
  openUiDocumentString as openUiDocument,
  schematicsDir,
} from './schematics.helpers';

/**
 * What a command does on a second run, for the commands whose behavior no other spec pins. The
 * mapping (command-mapping.json) states each outcome in `onExisting`; these tests assert it, so the
 * file cannot claim behavior the code does not have.
 */
interface MappingCommand {
  onExisting: { outcome: string };
  operations: Record<string, { status: string }>;
}
interface Mapping {
  ui: { commands: Record<string, MappingCommand>; nodes: Record<string, MappingCommand> };
}

const mapping = JSON.parse(
  readFileSync(join(schematicsDir, 'command-mapping.json'), 'utf8'),
) as Mapping;
const command = (name: string): MappingCommand => mapping.ui.commands[name];

const DOCUMENT_PATH = 'mapping.openui.json';
const OPTIONS = { document: DOCUMENT_PATH, project: 'demo-app', path: 'src/app/features' };

const container = (id: string, attrs?: Record<string, string>): OpenUiElement => ({
  id,
  type: 'SurfaceContainers',
  ...(attrs ? { attrs } : {}),
});

describe('command mapping: behavior on existing output (TC-MAPPING-RERUN)', () => {
  let runner: SchematicTestRunner;
  let angularRunner: SchematicTestRunner;

  beforeEach(() => {
    runner = new SchematicTestRunner('angular-django2', collectionPath);
    angularRunner = new SchematicTestRunner('@schematics/angular', angularCollectionPath);
  });

  async function workspace(document: string, withApplication: boolean): Promise<UnitTestTree> {
    let tree = (await angularRunner.runSchematic(
      'workspace',
      { name: 'demo', version: '22.0.0', newProjectRoot: 'projects' },
      Tree.empty(),
    )) as UnitTestTree;
    if (withApplication) {
      tree = (await angularRunner.runSchematic(
        'application',
        { name: 'demo-app', standalone: true, routing: false, style: 'scss', zoneless: true },
        tree,
      )) as UnitTestTree;
    }
    const packageJson = JSON.parse(tree.readContent('/package.json'));
    Object.assign(packageJson.dependencies, {
      '@angular/cdk': '^22.0.0',
      '@angular/forms': '^22.0.0',
      '@angular/material': '^22.0.0',
    });
    tree.overwrite('/package.json', JSON.stringify(packageJson, null, 2));
    tree.create(`/${DOCUMENT_PATH}`, document);
    return tree;
  }

  function snapshot(tree: UnitTestTree): Map<string, string> {
    const files = new Map<string, string>();
    tree.visit((path) =>
      files.set(
        path,
        createHash('sha1')
          .update(tree.read(path) ?? '')
          .digest('hex'),
      ),
    );
    return files;
  }

  /** Runs the command twice on the same tree and asserts the second run fails with a merge conflict. */
  async function expectMergeConflictOnRerun(
    schematic: string,
    node: OpenUiElement,
    options: Record<string, unknown> = OPTIONS,
  ): Promise<void> {
    const first = await runner.runSchematic(
      schematic,
      options,
      await workspace(openUiDocument(node), true),
    );
    await expect(runner.runSchematic(schematic, options, first)).rejects.toThrow(/merge conflict/i);
  }

  it('TC-MAPPING-RERUN-01: tabs rejects a second run', async () => {
    expect(command('tabs').onExisting.outcome).toBe('reject');
    expect(command('tabs').operations['update'].status).toBe('unsupported');
    await expectMergeConflictOnRerun('tabs', {
      id: 'viewTabs',
      type: 'Tabs',
      children: [
        { id: 'one', type: 'tab', attrs: { 'uses.label': '"One"' }, children: [container('body')] },
      ],
    });
  });

  it('TC-MAPPING-RERUN-02: dialog rejects a second run', async () => {
    expect(command('dialog').onExisting.outcome).toBe('reject');
    expect(command('dialog').operations['update'].status).toBe('unsupported');
    await expectMergeConflictOnRerun('dialog', {
      id: 'confirm',
      type: 'dialog',
      children: [
        { id: 'confirmTitle', type: 'header', attrs: { 'uses.title': '"Confirm"' } },
        { id: 'confirmContent', type: 'section' },
        { id: 'confirmActions', type: 'footer' },
      ],
    });
  });

  it('TC-MAPPING-RERUN-03: stepper rejects a second run', async () => {
    expect(command('stepper').onExisting.outcome).toBe('reject');
    expect(command('stepper').operations['update'].status).toBe('unsupported');
    await expectMergeConflictOnRerun('stepper', {
      id: 'flow',
      type: 'Stepper',
      children: [
        {
          id: 'first',
          type: 'step',
          attrs: { 'uses.label': '"First"' },
          children: [container('c')],
        },
      ],
    });
  });

  it('TC-MAPPING-RERUN-04: component rejects a second run', async () => {
    expect(command('component').onExisting.outcome).toBe('reject');
    expect(command('component').operations['update'].status).toBe('unsupported');
    await expectMergeConflictOnRerun('component', container('card', { 'uses.title': '"Card"' }));
  });

  it('TC-MAPPING-RERUN-05: complex-component rejects a second run with --document', async () => {
    expect(command('complex-component').onExisting.outcome).toBe('reject');
    await expectMergeConflictOnRerun(
      'complex-component',
      container('panel', { 'uses.title': '"Panel"' }),
    );
  });

  it('TC-MAPPING-RERUN-06: application rejects a second run because the project exists', async () => {
    expect(command('application').onExisting.outcome).toBe('delegated');
    expect(command('application').operations['update'].status).toBe('unsupported');
    const document = openUiDocument({ id: 'shop', type: 'Application', children: [] });
    const options = { document: DOCUMENT_PATH, name: 'plain' };
    const first = await runner.runSchematic(
      'application',
      options,
      await workspace(document, false),
    );
    await expect(runner.runSchematic('application', options, first)).rejects.toThrow(
      'Project name already exists',
    );
  });

  describe('Application documents', () => {
    const application = (
      label: string,
      extra: OpenUiElement[] = [],
      routes: OpenUiElement[] = [],
    ) =>
      ({
        id: 'shop',
        type: 'Application',
        children: [
          {
            id: 'routing',
            type: 'Routing',
            children: [
              {
                id: 'aRoute',
                type: 'Route',
                attrs: { 'uses.path': '"a"', 'uses.target': '"pageA"' },
              },
              {
                id: 'bRoute',
                type: 'Route',
                attrs: { 'uses.path': '"b"', 'uses.target': '"pageB"' },
              },
              ...routes,
            ],
          },
          {
            id: 'navigation',
            type: 'Navigation',
            attrs: { 'uses.ariaLabel': '"Primary"' },
            children: [
              {
                id: 'aNav',
                type: 'NavItem',
                attrs: { 'uses.label': '"Alpha"', 'uses.route': '"aRoute"' },
              },
              {
                id: 'bNav',
                type: 'NavItem',
                attrs: { 'uses.label': `"${label}"`, 'uses.route': '"bRoute"' },
              },
              ...extra,
            ],
          },
          {
            id: 'host',
            type: 'html',
            attrs: { 'uses.lang': '"he"', 'uses.dir': '"rtl"', 'uses.title': `"Title ${label}"` },
          },
          {
            id: 'icon',
            type: 'link',
            attrs: { 'uses.rel': '"icon"', 'uses.href': '"branding/shop.ico"' },
          },
        ],
      }) satisfies OpenUiElement;
    const pages: OpenUiElement[] = ['A', 'B', 'C'].map((letter) => ({
      id: `page${letter}`,
      type: 'DashboardPage',
      attrs: { 'uses.route': `"${letter.toLowerCase()}"` },
    }));
    const documentFor = (label: string, withGamma: boolean): string =>
      openUiDocument(
        application(
          label,
          withGamma
            ? [
                {
                  id: 'cNav',
                  type: 'NavItem',
                  attrs: { 'uses.label': '"Gamma"', 'uses.route': '"cRoute"' },
                },
              ]
            : [],
          withGamma
            ? [
                {
                  id: 'cRoute',
                  type: 'Route',
                  attrs: { 'uses.path': '"c"', 'uses.target': '"pageC"' },
                },
              ]
            : [],
        ),
        ...pages,
      );
    const contains = (tree: UnitTestTree, path: string, text: string): boolean =>
      tree.readContent(path).includes(text);

    it('TC-MAPPING-RERUN-07: material-app applies a changed document when re-run', async () => {
      expect(command('material-app').onExisting.outcome).toBe('rewrite');
      expect(command('material-app').operations['update'].status).toBe('partial');
      expect(mapping.ui.nodes['Application'].operations['update'].status).toBe('partial');

      const options = { document: DOCUMENT_PATH, name: 'shop', defaults: true };
      const first = await runner.runSchematic(
        'material-app',
        options,
        await workspace(documentFor('Beta', false), false),
      );
      const layout = '/projects/shop/src/app/app.html';
      expect(contains(first, layout, 'Beta')).toBe(true);
      expect(contains(first, layout, 'Gamma')).toBe(false);

      first.overwrite(`/${DOCUMENT_PATH}`, documentFor('Beta2', true));
      const second = await runner.runSchematic('material-app', options, first);
      expect(contains(second, layout, 'Beta2')).toBe(true);
      expect(contains(second, layout, 'Gamma')).toBe(true);
      expect(contains(second, '/projects/shop/src/app/app.ts', 'Title Beta2')).toBe(true);
    });

    it('TC-MAPPING-RERUN-08: workspace-setup applies a changed html and link when re-run', async () => {
      expect(command('workspace-setup').onExisting.outcome).toBe('rewrite');
      expect(command('workspace-setup').operations['update'].status).toBe('supported');
      expect(mapping.ui.nodes['html'].operations['update'].status).toBe('supported');
      expect(mapping.ui.nodes['link'].operations['update'].status).toBe('supported');

      const tree = await runner.runSchematic(
        'application',
        { document: DOCUMENT_PATH, name: 'shop' },
        await workspace(documentFor('Beta', false), false),
      );
      tree.create('/branding/shop.ico', Buffer.from([0, 0, 1, 0, 42]));
      const options = { name: 'shop', project: 'shop', document: DOCUMENT_PATH };
      const first = await runner.runSchematic('workspace-setup', options, tree);
      expect(contains(first, '/projects/shop/src/index.html', '<title>Title Beta</title>')).toBe(
        true,
      );
      expect([...first.read('/projects/shop/public/favicon.ico')!]).toEqual([0, 0, 1, 0, 42]);

      first.overwrite(`/${DOCUMENT_PATH}`, documentFor('Beta2', false));
      first.overwrite('/branding/shop.ico', Buffer.from([0, 0, 1, 0, 43]));
      const second = await runner.runSchematic('workspace-setup', options, first);
      expect(contains(second, '/projects/shop/src/index.html', '<title>Title Beta2</title>')).toBe(
        true,
      );
      expect([...second.read('/projects/shop/public/favicon.ico')!]).toEqual([0, 0, 1, 0, 43]);

      const third = await runner.runSchematic('workspace-setup', options, second);
      expect(snapshot(third)).toEqual(snapshot(second));
    });
  });

  /**
   * Known defect (shlomoa/angular-django2#205): with a prebuilt theme material-setup prepends the
   * same comment to styles.scss on every run. `it.fails` passes while the defect exists and fails
   * once it is fixed, which is the signal to change the mapping's material-setup and material-app
   * entries and turn this into a plain test.
   */
  it.fails(
    'TC-MAPPING-RERUN-10: material-setup leaves styles.scss unchanged on a second run',
    async () => {
      expect(command('material-setup').onExisting.outcome).toBe('rewrite');
      const tree = Tree.empty();
      tree.create(
        '/angular.json',
        JSON.stringify({
          version: 1,
          projects: {
            'test-app': {
              root: 'projects/test-app',
              sourceRoot: 'projects/test-app/src',
              architect: { build: { options: { styles: ['projects/test-app/src/styles.scss'] } } },
            },
          },
        }),
      );
      tree.create('projects/test-app/src/styles.scss', '/* existing styles */\n');
      const options = {
        project: 'test-app',
        theme: 'indigo-pink',
        typography: true,
        animations: true,
      };
      const first = await runner.runSchematic('material-setup', options, tree);
      const afterFirst = first.readContent('/projects/test-app/src/styles.scss');
      const second = await runner.runSchematic('material-setup', options, first);
      expect(second.readContent('/projects/test-app/src/styles.scss')).toBe(afterFirst);
    },
  );

  it('TC-MAPPING-RERUN-09: complex-component accepts only --mode=create with --document', async () => {
    expect(command('complex-component').operations['update'].status).toBe('partial');
    expect(command('complex-component').operations['delete'].status).toBe('partial');
    const created = await runner.runSchematic(
      'complex-component',
      OPTIONS,
      await workspace(openUiDocument(container('panel')), true),
    );
    for (const mode of ['modify', 'delete']) {
      await expect(
        runner.runSchematic('complex-component', { ...OPTIONS, mode, confirm: true }, created),
      ).rejects.toThrow('--document supports only --mode=create.');
    }
  });
});
