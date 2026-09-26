import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, type UnitTestTree } from '@angular-devkit/schematics/testing';
import type { OpenUiElement } from '@shlomoa/openui-spec';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  escapeTemplateText,
  surfaceContainerTemplate,
} from 'angular-django2/schematics/component/ast';
import {
  astInputBindings,
  readAstSlot,
  withoutCompositionAttributes,
} from 'angular-django2/schematics/embed-component/compose';
import { embedInTemplate } from 'angular-django2/schematics/embed-component/index';
import {
  angularCollectionPath,
  collectionPath,
  openUiDocumentString as openUiDocument,
} from './schematics.helpers';

const DOCUMENT_PATH = 'ui.openui.json';
const FEATURES = '/projects/demo-app/src/app/features';

/** Card → header summary, Form → Controls, actions field, content notes, overlay details. */
const profileCard: OpenUiElement = {
  id: 'profileCard',
  type: 'SurfaceContainers',
  attrs: { '[title]': 'Profile' },
  children: [
    {
      id: 'signup',
      type: 'Form',
      attrs: { '[title]': 'Sign up', '[action]': '/api/signup/' },
      children: [
        {
          id: 'email',
          type: 'TextInputs',
          attrs: { '[type]': 'email', '[label]': 'Email', '[required]': 'true' },
        },
        { id: 'age', type: 'RangeControl', attrs: { '[label]': 'Age', '[min]': '18' } },
      ],
    },
    { id: 'summary', type: 'SurfaceContainers', attrs: { '[slot]': 'header' } },
    { id: 'nickname', type: 'TextInputs', attrs: { '[label]': 'Nickname', '[slot]': 'actions' } },
    { id: 'notes', type: 'SurfaceContainers', attrs: { '[slot]': 'content' } },
    {
      id: 'more',
      type: 'OverlayContainers',
      attrs: { '[label]': 'More' },
      children: [{ id: 'details', type: 'SurfaceContainers', attrs: { '[title]': 'Details' } }],
    },
  ],
};

/** Plain container → nested container → field, with header, content, and actions children. */
const settingsPanel: OpenUiElement = {
  id: 'settingsPanel',
  type: 'SurfaceContainers',
  attrs: { '[title]': 'Settings' },
  children: [
    { id: 'first', type: 'SurfaceContainers' },
    { id: 'toolbar', type: 'SurfaceContainers', attrs: { '[slot]': 'header' } },
    {
      id: 'second',
      type: 'SurfaceContainers',
      children: [{ id: 'displayName', type: 'TextInputs', attrs: { '[label]': 'Display name' } }],
    },
    { id: 'save', type: 'SurfaceContainers', attrs: { '[slot]': 'actions' } },
  ],
};

describe('OpenUI composition (plan phase 3)', () => {
  let runner: SchematicTestRunner;
  let angularRunner: SchematicTestRunner;

  beforeEach(() => {
    runner = new SchematicTestRunner('angular-django2', collectionPath);
    angularRunner = new SchematicTestRunner('@schematics/angular', angularCollectionPath);
  });

  async function createApplicationTree(document: string): Promise<UnitTestTree> {
    let tree = (await angularRunner.runSchematic(
      'workspace',
      { name: 'demo', version: '22.0.0', newProjectRoot: 'projects' },
      Tree.empty(),
    )) as UnitTestTree;
    tree = (await angularRunner.runSchematic(
      'application',
      { name: 'demo-app', standalone: true, routing: false, style: 'scss', zoneless: true },
      tree,
    )) as UnitTestTree;

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

  describe('component --document (surface container compiler)', () => {
    it('TC-COMPOSE-01: compiles a SurfaceContainers node into an HTML5 section with slot sections', async () => {
      const tree = await createApplicationTree(openUiDocument(settingsPanel));
      const generated = await runner.runSchematic(
        'component',
        { document: DOCUMENT_PATH, project: 'demo-app', path: 'src/app/features' },
        tree,
      );

      const root = `${FEATURES}/settings-panel`;
      const template = generated.readContent(`${root}/settings-panel.html`);
      const source = generated.readContent(`${root}/settings-panel.ts`);

      expect(source).toContain("selector: 'app-settings-panel'");
      expect(source).toContain('// Begin input signals section');
      expect(template).toContain('<section>');
      expect(template).toContain('<h2>Settings</h2>');
      expect(template).toMatch(
        /<header>[\s\S]*<!-- Begin header section -->\n {4}<app-toolbar><\/app-toolbar>\n {4}<!-- End header section -->[\s\S]*<\/header>/,
      );
      expect(template).toMatch(
        /<!-- Begin children section -->\n {2}<app-first><\/app-first>\n {2}<app-second><\/app-second>\n {2}<!-- End children section -->/,
      );
      expect(template).toMatch(
        /<footer>\n {4}<!-- Begin actions section -->\n {4}<app-save><\/app-save>/,
      );
      expect(source).toContain("import { First } from './first/first';");
      expect(source).toContain("import { Toolbar } from './toolbar/toolbar';");
    });

    it('TC-COMPOSE-02: compiles and embeds nested children recursively', async () => {
      const tree = await createApplicationTree(openUiDocument(settingsPanel));
      const generated = await runner.runSchematic(
        'component',
        {
          document: DOCUMENT_PATH,
          nodeId: 'settingsPanel',
          project: 'demo-app',
          path: 'src/app/features',
        },
        tree,
      );

      const second = `${FEATURES}/settings-panel/second`;
      expect(generated.files).toContain(`${second}/display-name-field/display-name-field.ts`);
      expect(generated.readContent(`${second}/second.html`)).toContain(
        `<app-display-name-field [label]="'Display name'"></app-display-name-field>`,
      );
      expect(generated.readContent(`${second}/second.ts`)).toContain(
        "import { DisplayNameFieldComponent } from './display-name-field/display-name-field';",
      );
    });

    it('TC-COMPOSE-03: defaults the path and name, and honours an explicit --name', async () => {
      const tree = await createApplicationTree(
        openUiDocument({ id: 'emptyPanel', type: 'SurfaceContainers' }),
      );
      const defaulted = await runner.runSchematic('component', { document: DOCUMENT_PATH }, tree);
      expect(defaulted.files).toContain('/projects/demo-app/src/app/empty-panel/empty-panel.ts');
      expect(defaulted.readContent('/projects/demo-app/src/app/empty-panel/empty-panel.html')).toBe(
        surfaceContainerTemplate(undefined),
      );

      const named = await runner.runSchematic(
        'component',
        { document: DOCUMENT_PATH, name: 'side-panel', project: 'demo-app' },
        await createApplicationTree(
          openUiDocument({ id: 'emptyPanel', type: 'SurfaceContainers' }),
        ),
      );
      expect(named.files).toContain('/projects/demo-app/src/app/side-panel/side-panel.ts');
    });

    it('TC-COMPOSE-04: rejects wrong node types, attributes, slots, and child types', async () => {
      const cases: [OpenUiElement, string][] = [
        [{ id: 'form', type: 'Form' }, 'contains no "SurfaceContainers" element'],
        [
          { id: 'panel', type: 'SurfaceContainers', attrs: { '[color]': 'red' } },
          'unsupported attribute(s): [color]',
        ],
        [
          {
            id: 'panel',
            type: 'SurfaceContainers',
            children: [{ id: 'child', type: 'SurfaceContainers', attrs: { '[slot]': 'footer' } }],
          },
          '[slot]="footer" is not a supported slot',
        ],
        [
          { id: 'panel', type: 'SurfaceContainers', children: [{ id: 'grid', type: 'Grid' }] },
          'has type "Grid", which cannot be composed into a container',
        ],
      ];

      for (const [node, message] of cases) {
        const tree = await createApplicationTree(openUiDocument(node));
        await expect(
          runner.runSchematic('component', { document: DOCUMENT_PATH, project: 'demo-app' }, tree),
        ).rejects.toThrow(message);
      }

      const tree = await createApplicationTree(openUiDocument(settingsPanel));
      await expect(
        runner.runSchematic('component', { name: 'panel', nodeId: 'settingsPanel' }, tree),
      ).rejects.toThrow('--nodeId requires --document.');
    });
  });

  describe('complex-component --document (composite compiler)', () => {
    it('TC-COMPOSE-05: compiles Card → Form → Controls into a Material card with slots', async () => {
      const tree = await createApplicationTree(openUiDocument(profileCard));
      const generated = await runner.runSchematic(
        'complex-component',
        { document: DOCUMENT_PATH, project: 'demo-app', path: 'src/app/features' },
        tree,
      );

      const root = `${FEATURES}/profile-card`;
      const template = generated.readContent(`${root}/profile-card.html`);
      const source = generated.readContent(`${root}/profile-card.ts`);
      const form = generated.readContent(`${root}/signup-form/signup-form.html`);

      expect(template).toContain('<mat-card-title>Profile</mat-card-title>');
      expect(template).toMatch(
        /<mat-card-header>[\s\S]*<ng-content select="\[profile-card-header\]"><\/ng-content>[\s\S]*<app-summary><\/app-summary>[\s\S]*<\/mat-card-header>/,
      );
      expect(template).toMatch(
        /<mat-card-content>[\s\S]*<!-- Begin children section -->\n {4}<app-signup-form \(submitted\)="onSubmitted\(\$event\)"><\/app-signup-form>\n {4}<app-notes><\/app-notes>/,
      );
      expect(template).toMatch(
        /<mat-card-actions>[\s\S]*<app-nickname-field \[label\]="'Nickname'"><\/app-nickname-field>[\s\S]*<\/mat-card-actions>/,
      );
      expect(form).toContain('formControlName="email"');
      expect(form).toContain('formControlName="age"');
      expect(source).toContain("import { SignupFormComponent } from './signup-form/signup-form';");
      expect(source).toContain('MatCardModule');
      expect(source).toContain('onSubmitted($event: unknown): void');
      expect(generated.files).toContain(`${root}/nickname-field/nickname-field.ts`);
      expect(generated.files).not.toContain(`${root}/profile-card-header/profile-card-header.ts`);
    });

    it('TC-COMPOSE-06: maps an OverlayContainers child to the CDK overlay with its children inside', async () => {
      const tree = await createApplicationTree(openUiDocument(profileCard));
      const generated = await runner.runSchematic(
        'complex-component',
        {
          document: DOCUMENT_PATH,
          nodeId: 'profileCard',
          project: 'demo-app',
          path: 'src/app/features',
        },
        tree,
      );

      const root = `${FEATURES}/profile-card`;
      const template = generated.readContent(`${root}/profile-card.html`);
      const source = generated.readContent(`${root}/profile-card.ts`);

      expect(template).toMatch(/cdkOverlayOrigin[^>]*>\n {4}More\n {2}<\/button>/);
      expect(template).toMatch(
        /<ng-template cdkConnectedOverlay[\s\S]*<!-- Begin overlay section -->\n {6}<app-details><\/app-details>[\s\S]*<\/ng-template>/,
      );
      expect(source).toContain('CdkConnectedOverlay, CdkOverlayOrigin');
      expect(source).toContain('overlayOpen = signal(false)');
      expect(generated.readContent(`${root}/details/details.html`)).toContain('<h2>Details</h2>');
    });

    it('TC-COMPOSE-07: omits the overlay without an OverlayContainers child', async () => {
      const tree = await createApplicationTree(openUiDocument(settingsPanel));
      const generated = await runner.runSchematic(
        'complex-component',
        {
          document: DOCUMENT_PATH,
          name: 'settings-card',
          project: 'demo-app',
          path: 'src/app/features',
        },
        tree,
      );

      const template = generated.readContent(`${FEATURES}/settings-card/settings-card.html`);
      expect(template).not.toContain('cdkConnectedOverlay');
      expect(template).toContain('<app-save></app-save>');
    });

    it('TC-COMPOSE-08: rejects conflicting options and invalid overlay configurations', async () => {
      const tree = await createApplicationTree(openUiDocument(profileCard));
      const base = { document: DOCUMENT_PATH, project: 'demo-app', path: 'src/app/features' };

      await expect(
        runner.runSchematic('complex-component', { ...base, features: 'nested' }, tree),
      ).rejects.toThrow('--document cannot be combined with --features');
      await expect(
        runner.runSchematic('complex-component', { ...base, mode: 'modify' }, tree),
      ).rejects.toThrow('--document supports only --mode=create.');
      await expect(
        runner.runSchematic(
          'complex-component',
          { name: 'card', project: 'demo-app', path: 'src/app', features: 'mixins', nodeId: 'x' },
          tree,
        ),
      ).rejects.toThrow('--nodeId requires --document.');
      await expect(
        runner.runSchematic(
          'complex-component',
          { name: 'card', project: 'demo-app', path: 'src/app' },
          tree,
        ),
      ).rejects.toThrow('at least one supported feature');

      const cases: [OpenUiElement, string][] = [
        [
          {
            id: 'card',
            type: 'SurfaceContainers',
            children: [
              { id: 'one', type: 'OverlayContainers' },
              { id: 'two', type: 'OverlayContainers' },
            ],
          },
          'at most one is supported',
        ],
        [
          {
            id: 'card',
            type: 'SurfaceContainers',
            children: [
              {
                id: 'pop',
                type: 'OverlayContainers',
                children: [
                  { id: 'inner', type: 'SurfaceContainers', attrs: { '[slot]': 'header' } },
                ],
              },
            ],
          },
          'cannot choose a [slot]',
        ],
        [
          {
            id: 'card',
            type: 'SurfaceContainers',
            children: [{ id: 'pop', type: 'OverlayContainers', attrs: { '[modal]': 'true' } }],
          },
          'unsupported attribute(s): [modal]',
        ],
      ];
      for (const [node, message] of cases) {
        await expect(
          runner.runSchematic(
            'complex-component',
            base,
            await createApplicationTree(openUiDocument(node)),
          ),
        ).rejects.toThrow(message);
      }
    });
  });

  describe('embed-component --slot', () => {
    it('TC-COMPOSE-09: embeds a child into a named slot of a compiled parent', async () => {
      const tree = await createApplicationTree(openUiDocument(settingsPanel));
      let generated = await runner.runSchematic(
        'component',
        { document: DOCUMENT_PATH, project: 'demo-app', path: 'src/app/features' },
        tree,
      );
      generated = await runner.runSchematic(
        'component',
        { name: 'help-link', project: 'demo-app', path: 'src/app/features' },
        generated,
      );
      generated = await runner.runSchematic(
        'embed-component',
        {
          component: 'projects/demo-app/src/app/features/help-link/help-link.ts',
          parent: 'projects/demo-app/src/app/features/settings-panel/settings-panel.ts',
          slot: 'actions',
        },
        generated,
      );

      expect(generated.readContent(`${FEATURES}/settings-panel/settings-panel.html`)).toMatch(
        /<!-- Begin actions section -->\n {4}<app-help-link><\/app-help-link>\n {4}<app-save><\/app-save>/,
      );

      await expect(
        runner.runSchematic(
          'embed-component',
          {
            component: 'projects/demo-app/src/app/features/settings-panel/first/first.ts',
            parent: 'projects/demo-app/src/app/features/help-link/help-link.ts',
            slot: 'header',
          },
          generated,
        ),
      ).rejects.toThrow('The parent template has no "header" section markers');
    });
  });

  describe('composition helpers', () => {
    it('TC-COMPOSE-10: reads slots, strips composition attributes, and collects input bindings', () => {
      const node: OpenUiElement = {
        id: 'field',
        type: 'TextInputs',
        attrs: {
          '[slot]': 'actions',
          '[label]': 'Name',
          '[hint]': null,
          '(change)': 'x',
          title: 'meta',
        },
      };

      expect(readAstSlot(node, 'doc#field')).toBe('actions');
      expect(readAstSlot({ id: 'plain', type: 'SurfaceContainers' }, 'doc#plain')).toBe('content');
      expect(withoutCompositionAttributes(node).attrs).toEqual({
        '[label]': 'Name',
        '[hint]': null,
        '(change)': 'x',
        title: 'meta',
      });
      expect(
        withoutCompositionAttributes({ id: 'a', type: 'X', attrs: { '[slot]': 'header' } }),
      ).toEqual({
        id: 'a',
        type: 'X',
      });
      expect(astInputBindings(node)).toEqual({ label: 'Name' });
    });

    it('TC-COMPOSE-11: escapes text and bound string literals in generated templates', () => {
      expect(escapeTemplateText('A & <b> {x} @if')).toBe('A &amp; &lt;b&gt; &#123;x&#125; &#64;if');

      const child = { selector: 'app-x', className: 'X', inputs: ['label', 'hint'], outputs: [] };
      expect(
        embedInTemplate('<!-- Begin children section -->\n', child, {
          bindings: { label: `It's "a\\b" <c>` },
        }),
      ).toContain(`<app-x [label]="'It\\'s &quot;a\\\\b&quot; &lt;c>'"></app-x>`);
      expect(embedInTemplate('<!-- Begin children section -->\n', child)).toContain(
        '<app-x [label]="undefined" [hint]="undefined"></app-x>',
      );
    });
  });
});
