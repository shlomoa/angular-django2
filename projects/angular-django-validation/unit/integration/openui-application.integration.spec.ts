/**
 * Validation of the OpenUI `--document` schematics as a whole (migration plan,
 * phase 5): the validation-only application compiler generates a complete
 * application from a single app.openui.json without any other input.
 */
import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import type { OpenUiDocument, OpenUiElement } from '@shlomoa/openui-spec';
import { beforeEach, describe, expect, it } from 'vitest';
import * as path from 'node:path';
import { lastValueFrom } from 'rxjs';

import { compileOpenUiApplication, planCompilation } from './openui-application-compiler';

const collectionPath = path.join(
  __dirname,
  '../../../../projects/angular-django2/dist/schematics/collection.json',
);
const angularCollectionPath = path.join(
  __dirname,
  '../../../../node_modules/@schematics/angular/collection.json',
);

const DOCUMENT_PATH = 'app.openui.json';
const APP = '/projects/shop/src/app';

const application: OpenUiElement = {
  id: 'shop',
  type: 'Application',
  children: [
    {
      id: 'routing',
      type: 'Routing',
      children: [
        {
          id: 'profileRoute',
          type: 'Route',
          attrs: { '[path]': 'profile', '[target]': '"profile"', '[title]': 'My profile' },
        },
      ],
    },
    {
      id: 'navigation',
      type: 'Navigation',
      attrs: { '[ariaLabel]': 'Primary' },
      children: [
        {
          id: 'profileNavigation',
          type: 'NavItem',
          attrs: { '[label]': 'My profile', '[route]': '"profileRoute"', '[icon]': 'person' },
        },
      ],
    },
    { id: 'look', type: 'Presentation', attrs: { '[theme]': 'purple-green' } },
    { id: 'host', type: 'html', attrs: { '[lang]': 'en', '[title]': 'Shop admin' } },
  ],
};

const appDocument: OpenUiDocument = {
  version: '0.3.0',
  id: 'root',
  type: 'html',
  children: [
    application,
    {
      id: 'profile',
      type: 'DashboardPage',
      attrs: { '[title]': 'My profile', '[icon]': 'person' },
      children: [
        { id: 'summary', type: 'SurfaceContainers', attrs: { '[slot]': 'header' } },
        {
          id: 'contact',
          type: 'Form',
          attrs: { '[title]': 'Contact', '[action]': '/api/contact/' },
          children: [
            { id: 'email', type: 'TextInputs', attrs: { '[type]': 'email', '[label]': 'Email' } },
          ],
        },
      ],
    },
    { id: 'blank', type: 'EmptyPage' },
    { id: 'helpPanel', type: 'SurfaceContainers', attrs: { '[title]': 'Help' } },
    {
      id: 'feedback',
      type: 'Form',
      attrs: { '[title]': 'Feedback', '[action]': '/api/feedback/' },
      children: [
        {
          id: 'message',
          type: 'TextInputs',
          attrs: { '[type]': 'textarea', '[label]': 'Message' },
        },
      ],
    },
    {
      id: 'orderRows',
      type: 'Table',
      attrs: { '[data]': 'src/app/api/services#OrdersApiService' },
    },
  ],
};

describe('OpenUI application compilation (plan phase 5)', () => {
  let runner: SchematicTestRunner;
  let angularRunner: SchematicTestRunner;

  beforeEach(() => {
    runner = new SchematicTestRunner('angular-django2', collectionPath);
    angularRunner = new SchematicTestRunner('@schematics/angular', angularCollectionPath);
  });

  async function createWorkspace(document: OpenUiDocument): Promise<UnitTestTree> {
    const tree = (await angularRunner.runSchematic(
      'workspace',
      { name: 'demo', version: '22.0.0', newProjectRoot: 'projects' },
      Tree.empty(),
    )) as UnitTestTree;
    tree.create(`/${DOCUMENT_PATH}`, JSON.stringify(document, null, 2));
    return tree;
  }

  async function compileApplication(documentPath: string, tree: Tree): Promise<UnitTestTree> {
    return new UnitTestTree(
      await lastValueFrom(runner.callRule(compileOpenUiApplication(documentPath), tree)),
    );
  }

  it('INT-OPENUI-01: generates a complete application from a single app.openui.json', async () => {
    const generated = await compileApplication(DOCUMENT_PATH, await createWorkspace(appDocument));

    // 1. Application shell, theme, navigation, and host files.
    const angularJson = JSON.parse(generated.readContent('/angular.json'));
    expect(angularJson.projects.shop.architect.build.options.styles).toContain(
      '@angular/material/prebuilt-themes/purple-green.css',
    );
    expect(generated.readContent(`${APP}/app.ts`)).toContain("title = 'Shop admin';");
    expect(generated.readContent(`${APP}/app.html`)).toContain('routerLink="/profile"');
    expect(generated.readContent('/projects/shop/src/index.html')).toContain('<title>Shop admin</title>');

    // 2. Routed pages registered in app.routes.ts, with composed children.
    const routes = generated.readContent(`${APP}/app.routes.ts`);
    expect(routes).toContain('...profilePageRoutes');
    expect(routes).toContain('...blankPageRoutes');
    const profileTemplate = generated.readContent(`${APP}/features/profile/profile-page.html`);
    expect(profileTemplate).toContain('<app-summary></app-summary>');
    expect(profileTemplate).toContain('<app-contact-form');
    expect(generated.files).toContain(`${APP}/features/profile/contact-form/contact-form.ts`);

    // 3. Standalone views and containers.
    expect(generated.readContent(`${APP}/features/help-panel/help-panel.html`)).toContain(
      '<h2>Help</h2>',
    );
    expect(generated.readContent(`${APP}/features/feedback-form/feedback-form.html`)).toContain(
      'formControlName="message"',
    );

    // 5. Data services for every [data] binding.
    expect(
      generated.readContent(
        `${APP}/features/order-rows/services/order-rows/order-rows.data.service.ts`,
      ),
    ).toContain("import { OrdersApiService } from '../../../../api/services';");
  });

  it('INT-OPENUI-02: is deterministic for the same document', async () => {
    const first = await compileApplication(DOCUMENT_PATH, await createWorkspace(appDocument));
    const second = await compileApplication(DOCUMENT_PATH, await createWorkspace(appDocument));

    expect([...second.files].sort()).toEqual([...first.files].sort());
    for (const file of first.files.filter((name) => name.startsWith(`${APP}/`))) {
      expect(second.readContent(file)).toBe(first.readContent(file));
    }
  });

  it('INT-OPENUI-03: rejects invalid documents', async () => {
    const cases: [OpenUiElement[], string][] = [
      [[], 'must have exactly one root Application element; found 0'],
      [[application, { id: 'other', type: 'Application' }], 'found 2'],
      [
        [application, { id: 'profile', type: 'DashboardPage' }, { id: 'grid', type: 'Grid' }],
        'which the OpenUI application compiler cannot compile at the document root',
      ],
      [
        [
          application,
          { id: 'profile', type: 'DashboardPage' },
          { id: 'panel', type: 'SurfaceContainers', attrs: { '[color]': 'red' } },
        ],
        'unsupported attribute(s): [color]',
      ],
    ];

    for (const [children, message] of cases) {
      await expect(
        compileApplication(
          DOCUMENT_PATH,
          await createWorkspace({ version: '0.3.0', id: 'root', type: 'html', children }),
        ),
      ).rejects.toThrow(message);
    }
    await expect(
      compileApplication('missing.json', await createWorkspace(appDocument)),
    ).rejects.toThrow('OpenUI document "missing.json" was not found');
  });

  it('INT-OPENUI-04: plans the dispatch of every root element', () => {
    const plan = planCompilation(appDocument, DOCUMENT_PATH);

    expect(plan.project).toBe('shop');
    expect(plan.pages.map((node) => node.id)).toEqual(['profile', 'blank']);
    expect(plan.containers.map((node) => node.id)).toEqual(['helpPanel']);
    expect(plan.forms.map((node) => node.id)).toEqual(['feedback']);
    expect(plan.dataBindings.map((node) => node.id)).toEqual(['orderRows']);
    expect(plan.dataOnly.map((node) => node.id)).toEqual(['orderRows']);
  });
});
