import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, type UnitTestTree } from '@angular-devkit/schematics/testing';
import type { OpenUiElement } from '@shlomoa/openui-spec';
import { beforeEach, describe, expect, it } from 'vitest';

import { materialLayoutTemplate } from '../../../../projects/angular-django2/schematics/material-app/index';
import {
  applicationFromAst,
  navigationLinksFromAst,
} from '../../../../projects/angular-django2/schematics/application/ast';
import { updateIndexHtml } from '../../../../projects/angular-django2/schematics/workspace-setup/index';
import { angularCollectionPath, collectionPath } from './schematics.helpers';

const DOCUMENT_PATH = 'app.openui.json';
const APP = '/projects/shop/src/app';

const profilePage: OpenUiElement = {
  id: 'profile',
  type: 'DashboardPage',
  attrs: { '[title]': 'My profile', '[route]': 'me/profile', '[icon]': 'person' },
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
};

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
          attrs: { '[path]': 'me/profile', '[target]': '"profile"', '[title]': 'My profile' },
        },
        {
          id: 'ordersRoute',
          type: 'Route',
          attrs: { '[path]': 'orders', '[target]': '"orders"', '[title]': 'Orders' },
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
        {
          id: 'ordersNavigation',
          type: 'NavItem',
          attrs: { '[label]': 'Orders', '[route]': '"ordersRoute"' },
        },
      ],
    },
    {
      id: 'look',
      type: 'Presentation',
      attrs: { '[theme]': 'purple-green', '[typography]': 'false', '[animations]': 'true' },
    },
    {
      id: 'host',
      type: 'html',
      attrs: { '[lang]': 'he', '[dir]': 'rtl', '[title]': 'Shop & Co' },
    },
    { id: 'icon', type: 'link', attrs: { '[rel]': 'icon', '[href]': 'branding/shop.ico' } },
  ],
};

const pages: OpenUiElement[] = [
  profilePage,
  { id: 'orders', type: 'DashboardPage', attrs: { '[access]': 'public' } },
  { id: 'blank', type: 'EmptyPage', attrs: { '[route]': 'blank' } },
];

const ordersTable: OpenUiElement = {
  id: 'orderRows',
  type: 'Table',
  attrs: { '[data]': 'src/app/api/services#OrdersApiService', '(paginate)': null },
};

const toolBar: OpenUiElement = {
  id: 'mainToolBar',
  type: 'ToolBar',
  attrs: { '[ariaLabel]': 'Shop actions' },
  children: [
    {
      id: 'primaryToolBarRow',
      type: 'ToolBarRow',
      children: [
        {
          id: 'refresh',
          type: 'ToolAction',
          attrs: {
            '[label]': 'Refresh',
            '[icon]': 'refresh',
            '[disabled]': 'true',
            '(activate)': null,
          },
        },
        { id: 'help', type: 'ToolAction', attrs: { '[label]': 'Help' } },
      ],
    },
    {
      id: 'secondaryToolBarRow',
      type: 'ToolBarRow',
      children: [{ id: 'about', type: 'ToolAction', attrs: { '[label]': 'About' } }],
    },
  ],
};

function openUiDocument(...children: OpenUiElement[]): string {
  return JSON.stringify({ version: '0.3.0', id: 'root', type: 'html', children });
}

describe('OpenUI page and application compilers (plan phase 4)', () => {
  let runner: SchematicTestRunner;
  let angularRunner: SchematicTestRunner;

  beforeEach(() => {
    runner = new SchematicTestRunner('angular-django2', collectionPath);
    angularRunner = new SchematicTestRunner('@schematics/angular', angularCollectionPath);
  });

  async function createWorkspace(document: string): Promise<UnitTestTree> {
    const tree = (await angularRunner.runSchematic(
      'workspace',
      { name: 'demo', version: '22.0.0', newProjectRoot: 'projects' },
      Tree.empty(),
    )) as UnitTestTree;
    tree.create(`/${DOCUMENT_PATH}`, document);
    return tree;
  }

  async function createApplication(document: string): Promise<UnitTestTree> {
    const generated = await runner.runSchematic(
      'application',
      { document: DOCUMENT_PATH },
      await createWorkspace(document),
    );
    const packageJson = JSON.parse(generated.readContent('/package.json'));
    Object.assign(packageJson.dependencies, {
      '@angular/cdk': '^22.0.0',
      '@angular/forms': '^22.0.0',
      '@angular/material': '^22.0.0',
    });
    generated.overwrite('/package.json', JSON.stringify(packageJson, null, 2));
    return generated;
  }

  describe('application --document', () => {
    it('TC-APP-01: names the application after the Application node and enables routing from its Routing child', async () => {
      const generated = await createApplication(openUiDocument(application, ...pages));

      expect(generated.files).toContain(`${APP}/app.ts`);
      expect(generated.files).toContain(`${APP}/app.routes.ts`);
    });

    it('TC-APP-02: disables routing without a Routing child and rejects conflicting options', async () => {
      const noRouting = { ...application, children: [] };
      const generated = await runner.runSchematic(
        'application',
        { document: DOCUMENT_PATH, name: 'plain' },
        await createWorkspace(openUiDocument(noRouting)),
      );
      expect(generated.files).toContain('/projects/plain/src/app/app.ts');
      expect(generated.files).not.toContain('/projects/plain/src/app/app.routes.ts');

      const tree = await createWorkspace(openUiDocument(application));
      await expect(
        runner.runSchematic('application', { document: DOCUMENT_PATH, routing: false }, tree),
      ).rejects.toThrow('--document cannot be combined with --routing');
      await expect(
        runner.runSchematic('application', { name: 'x', nodeId: 'shop' }, tree),
      ).rejects.toThrow('--nodeId requires --document.');
      await expect(
        runner.runSchematic(
          'application',
          { document: DOCUMENT_PATH },
          await createWorkspace(
            openUiDocument({ ...application, children: [{ id: 'grid', type: 'Grid' }] }),
          ),
        ),
      ).rejects.toThrow('which is not a supported Application child');
    });
  });

  describe('page --document', () => {
    it('TC-APP-03: compiles a DashboardPage into a routed page with navigation metadata and composed children', async () => {
      const tree = await createApplication(openUiDocument(application, ...pages));
      const generated = await runner.runSchematic(
        'page',
        { document: DOCUMENT_PATH, nodeId: 'profile', path: 'src/app/features/profile' },
        tree,
      );

      const root = `${APP}/features/profile`;
      const routes = generated.readContent(`${root}/profile.page.routes.ts`);
      const template = generated.readContent(`${root}/profile-page.html`);
      const component = generated.readContent(`${root}/profile-page.ts`);

      expect(routes).toContain("path: 'me/profile'");
      expect(routes).toContain("navigation: { label: 'My profile', icon: 'person' }");
      expect(routes).toContain("access: 'public'");
      expect(generated.readContent(`${APP}/app.routes.ts`)).toContain('...profilePageRoutes');
      expect(template).toContain('<mat-card-title>My profile</mat-card-title>');
      expect(template).toMatch(/<!-- Begin header section -->\n {4}<app-summary><\/app-summary>/);
      expect(template).toMatch(
        /<!-- Begin children section -->\n {4}<app-contact-form \(submitted\)="onSubmitted\(\$event\)"><\/app-contact-form>/,
      );
      expect(component).toContain(
        "import { ContactFormComponent } from './contact-form/contact-form';",
      );
      expect(generated.files).toContain(`${root}/summary/summary.ts`);
    });

    it('TC-APP-04: applies page defaults, protected access, and EmptyPage rules', async () => {
      const tree = await createApplication(openUiDocument(application, ...pages));
      const orders = await runner.runSchematic(
        'page',
        { document: DOCUMENT_PATH, nodeId: 'orders', path: 'src/app/features/orders' },
        tree,
      );
      const routes = orders.readContent(`${APP}/features/orders/orders.page.routes.ts`);
      expect(routes).toContain("path: 'orders'");
      expect(routes).toContain("navigation: { label: 'Orders' }");

      const blank = await runner.runSchematic(
        'page',
        { document: DOCUMENT_PATH, nodeId: 'blank', name: 'empty', path: 'src/app/features/empty' },
        tree,
      );
      expect(blank.readContent(`${APP}/features/empty/empty.page.routes.ts`)).toContain(
        "path: 'blank'",
      );

      const guarded = openUiDocument(application, {
        id: 'admin',
        type: 'DashboardPage',
        attrs: { '[access]': 'protected', '[authGuard]': 'adminGuard' },
      });
      await expect(
        runner.runSchematic(
          'page',
          { document: DOCUMENT_PATH, path: 'src/app/features/admin' },
          await createApplication(guarded),
        ),
      ).rejects.toThrow('Protected pages require the configured reusable "adminGuard" guard');
    });

    it('TC-APP-05: rejects invalid page nodes and conflicting options', async () => {
      const tree = await createApplication(openUiDocument(application, ...pages));
      const base = { document: DOCUMENT_PATH, path: 'src/app/features/x' };

      await expect(
        runner.runSchematic('page', { ...base, nodeId: 'profile', routePath: 'x' }, tree),
      ).rejects.toThrow('--document cannot be combined with --routePath');
      await expect(runner.runSchematic('page', { ...base, nodeId: 'shop' }, tree)).rejects.toThrow(
        'has type "Application" but this schematic expects "DashboardPage" or "EmptyPage"',
      );

      const cases: [OpenUiElement, string][] = [
        [
          { id: 'bad', type: 'DashboardPage', attrs: { '[color]': 'red' } },
          'unsupported attribute(s): [color]',
        ],
        [
          { id: 'bad', type: 'EmptyPage', children: [{ id: 'c', type: 'SurfaceContainers' }] },
          'which has no content',
        ],
        [
          { id: 'bad', type: 'DashboardPage', attrs: { '[route]': 'Bad Route' } },
          'lowercase URL segments',
        ],
      ];
      for (const [node, message] of cases) {
        await expect(
          runner.runSchematic(
            'page',
            base,
            await createApplication(openUiDocument(application, node)),
          ),
        ).rejects.toThrow(message);
      }
    });
  });

  describe('material-app --document', () => {
    it('TC-APP-06: compiles name, title, routing, presentation, and navigation links from the document', async () => {
      const generated = await runner.runSchematic(
        'material-app',
        { document: DOCUMENT_PATH },
        await createWorkspace(openUiDocument(application, ...pages)),
      );

      const angularJson = JSON.parse(generated.readContent('/angular.json'));
      const template = generated.readContent(`${APP}/app.html`);

      expect(angularJson.projects.shop.architect.build.options.styles).toContain(
        '@angular/material/prebuilt-themes/purple-green.css',
      );
      expect(generated.readContent(`${APP}/app.ts`)).toContain("title = 'Shop & Co';");
      expect(template).toContain(
        '<a mat-list-item routerLink="/me/profile" routerLinkActive="active">\n        <mat-icon matListItemIcon>person</mat-icon>\n        <span matListItemTitle>My profile</span>',
      );
      expect(template).toContain('routerLink="/orders"');
      expect(template).not.toContain('routerLink="/blank"');
      expect(generated.files).toContain(`${APP}/app.routes.ts`);
    });

    it('TC-APP-07: rejects conflicting options and navigation without routing', async () => {
      const tree = await createWorkspace(openUiDocument(application, ...pages));
      await expect(
        runner.runSchematic(
          'material-app',
          { document: DOCUMENT_PATH, theme: 'indigo-pink' },
          tree,
        ),
      ).rejects.toThrow('--document cannot be combined with --theme');
      await expect(runner.runSchematic('material-app', {}, tree)).rejects.toThrow(
        'Option "name" is required unless --document is given.',
      );

      const withoutRouting = {
        ...application,
        children: application.children?.filter((child) => child.type !== 'Routing'),
      };
      await expect(
        runner.runSchematic(
          'material-app',
          { document: DOCUMENT_PATH },
          await createWorkspace(openUiDocument(withoutRouting, ...pages)),
        ),
      ).rejects.toThrow('requires an Application Routing child');
      await expect(
        runner.runSchematic(
          'material-app',
          { document: DOCUMENT_PATH },
          await createWorkspace(
            openUiDocument({
              ...application,
              children: [{ id: 'look', type: 'Presentation', attrs: { '[typography]': 'yes' } }],
            }),
          ),
        ),
      ).rejects.toThrow('attribute "[typography]" must be "true" or "false"');
    });
  });

  describe('workspace-setup --document', () => {
    it('TC-APP-08: updates index.html and replaces the favicon from html and link nodes', async () => {
      const tree = await createApplication(openUiDocument(application));
      tree.create('/branding/shop.ico', Buffer.from([0, 0, 1, 0, 42]));
      const generated = await runner.runSchematic(
        'workspace-setup',
        { name: 'shop', project: 'shop', document: DOCUMENT_PATH },
        tree,
      );

      const indexHtml = generated.readContent('/projects/shop/src/index.html');
      expect(indexHtml).toMatch(/<html lang="he" dir="rtl">/);
      expect(indexHtml).toContain('<title>Shop &amp; Co</title>');
      expect([...generated.read('/projects/shop/public/favicon.ico')!]).toEqual([0, 0, 1, 0, 42]);
    });

    it('TC-APP-09: rejects conflicting file hooks and missing favicon files', async () => {
      const tree = await createApplication(openUiDocument(application));
      await expect(
        runner.runSchematic(
          'workspace-setup',
          {
            name: 'shop',
            project: 'shop',
            document: DOCUMENT_PATH,
            files: { indexHtml: { content: '<html></html>' } },
          },
          tree,
        ),
      ).rejects.toThrow('--document cannot be combined with files.indexHtml');
      await expect(
        runner.runSchematic(
          'workspace-setup',
          { name: 'shop', project: 'shop', document: DOCUMENT_PATH },
          tree,
        ),
      ).rejects.toThrow('The favicon file "branding/shop.ico"');
    });

    it('TC-APP-10: sets lang, dir, and title on existing or missing attributes', () => {
      expect(
        updateIndexHtml('<html lang="en">\n<head>\n<title>Old</title>\n</head>', {
          lang: 'fr',
          dir: 'ltr',
          title: '<Nouveau>',
        }),
      ).toBe('<html lang="fr" dir="ltr">\n<head>\n<title>&lt;Nouveau&gt;</title>\n</head>');
      expect(
        updateIndexHtml('<html>\n  <head>\n  </head>', {
          lang: undefined,
          dir: undefined,
          title: 'T',
        }),
      ).toBe('<html>\n  <head>\n    <title>T</title>\n  </head>');
    });
  });

  describe('data-service --document', () => {
    it('TC-APP-11: generates a data service from a [data] binding with a relative API import', async () => {
      const tree = await createApplication(openUiDocument(application, ordersTable));
      const generated = await runner.runSchematic(
        'data-service',
        { document: DOCUMENT_PATH, project: 'shop' },
        tree,
      );

      const servicePath = `${APP}/features/order-rows/services/order-rows/order-rows.data.service.ts`;
      const service = generated.readContent(servicePath);
      expect(service).toContain("import { OrdersApiService } from '../../../../api/services';");
      expect(service).toContain("from '../../../../api/strict-http-response';");
      expect(service).toContain('export class OrderRowsDataService');
    });

    it('TC-APP-12: honours --name and --path, and rejects invalid bindings and conflicts', async () => {
      const tree = await createApplication(openUiDocument(application, ordersTable));
      const generated = await runner.runSchematic(
        'data-service',
        {
          document: DOCUMENT_PATH,
          nodeId: 'orderRows',
          name: 'orders',
          path: 'src/app/core',
          flat: true,
        },
        tree,
      );
      expect(generated.readContent(`${APP}/core/orders.data.service.ts`)).toContain(
        "import { OrdersApiService } from '../api/services';",
      );

      await expect(
        runner.runSchematic('data-service', { document: DOCUMENT_PATH, apiService: 'X' }, tree),
      ).rejects.toThrow('--document cannot be combined with --apiService');
      await expect(
        runner.runSchematic('data-service', { document: DOCUMENT_PATH, nodeId: 'shop' }, tree),
      ).rejects.toThrow('has no [data] binding');
      await expect(
        runner.runSchematic(
          'data-service',
          { document: DOCUMENT_PATH },
          await createApplication(
            openUiDocument(application, {
              id: 'rows',
              type: 'Table',
              attrs: { '[data]': 'OrdersApiService' },
            }),
          ),
        ),
      ).rejects.toThrow('must be "<apiPath>#<ApiService>"');
    });
  });

  describe('helpers', () => {
    it('TC-APP-13: derives navigation links from NavItem Route references', () => {
      expect(
        navigationLinksFromAst(
          application,
          JSON.parse(openUiDocument(application, ...pages)),
          DOCUMENT_PATH,
        ),
      ).toEqual([
        { route: 'me/profile', label: 'My profile', icon: 'person', disabled: false },
        { route: 'orders', label: 'Orders', icon: undefined, disabled: false },
      ]);
      expect(materialLayoutTemplate([{ route: 'a', label: '{a}', icon: undefined }])).toContain(
        '<a mat-list-item routerLink="/a" routerLinkActive="active">\n        <span matListItemTitle>&#123;a&#125;</span>\n      </a>\n    </mat-nav-list>',
      );
    });
  });

  it('TC-APP-14: rejects unresolved and unquoted application references', () => {
    const unknownRoute = {
      ...application,
      children: application.children?.map((child) =>
        child.type === 'Navigation'
          ? {
              ...child,
              children: [
                {
                  id: 'brokenNavigation',
                  type: 'NavItem',
                  attrs: { '[label]': 'Broken', '[route]': '"missing"' },
                },
              ],
            }
          : child,
      ),
    };
    const unquotedTarget = {
      ...application,
      children: application.children?.map((child) =>
        child.type === 'Routing'
          ? {
              ...child,
              children: [
                {
                  id: 'profileRoute',
                  type: 'Route',
                  attrs: { '[path]': 'profile', '[target]': 'profile' },
                },
              ],
            }
          : child,
      ),
    };

    expect(() =>
      navigationLinksFromAst(
        unknownRoute,
        JSON.parse(openUiDocument(unknownRoute, ...pages)),
        DOCUMENT_PATH,
      ),
    ).toThrow('references unknown Route "missing"');
    expect(() =>
      navigationLinksFromAst(
        unquotedTarget,
        JSON.parse(openUiDocument(unquotedTarget, ...pages)),
        DOCUMENT_PATH,
      ),
    ).toThrow('must be a quoted element-id string');
  });

  it('TC-APP-15: decodes ordered ToolBar rows and ToolAction attributes', () => {
    const applicationWithToolBar = {
      ...application,
      children: [...(application.children ?? []), toolBar],
    };

    expect(
      applicationFromAst(
        JSON.parse(openUiDocument(applicationWithToolBar, ...pages)),
        DOCUMENT_PATH,
        undefined,
      ).toolBar,
    ).toEqual({
      ariaLabel: 'Shop actions',
      rows: [
        {
          actions: [
            {
              id: 'refresh',
              label: 'Refresh',
              icon: 'refresh',
              disabled: true,
              activate: true,
            },
            { id: 'help', label: 'Help', icon: undefined, disabled: false, activate: false },
          ],
        },
        {
          actions: [
            { id: 'about', label: 'About', icon: undefined, disabled: false, activate: false },
          ],
        },
      ],
    });
  });

  it('TC-APP-16: compiles ToolBar actions into the existing Material title toolbar', async () => {
    const applicationWithToolBar = {
      ...application,
      children: [...(application.children ?? []), toolBar],
    };
    const generated = await runner.runSchematic(
      'material-app',
      { document: DOCUMENT_PATH },
      await createWorkspace(openUiDocument(applicationWithToolBar, ...pages)),
    );
    const template = generated.readContent(`${APP}/app.html`);
    const component = generated.readContent(`${APP}/app.ts`);
    const styles = generated.readContent(`${APP}/app.scss`);

    expect(template).toContain(
      '<mat-toolbar color="primary" role="toolbar" aria-label="Shop actions">',
    );
    expect(template).toContain(
      '<mat-toolbar-row>\n  <button mat-icon-button (click)="drawer.toggle()" aria-label="Toggle sidenav">',
    );
    expect(template).toContain(
      '<mat-toolbar-row>\n    <button mat-button disabled (click)="onRefreshActivate($event)"><mat-icon>refresh</mat-icon> Refresh</button>\n    <button mat-button>Help</button>\n  </mat-toolbar-row>',
    );
    expect(template).toContain(
      '<mat-toolbar-row>\n    <button mat-button>About</button>\n  </mat-toolbar-row>',
    );
    expect(component).toContain('onRefreshActivate($event: unknown): void {');
    expect(component).toContain("throw new Error('onRefreshActivate is not implemented');");
    expect(styles).toContain('top: 192px;');
  });

  it('TC-APP-17: rejects invalid ToolBar content for both Application consumers', async () => {
    const invalidToolBar = {
      id: 'invalidToolBar',
      type: 'ToolBar',
      attrs: { '[bogus]': 'ignored' },
    } satisfies OpenUiElement;
    const invalidApplication = { ...application, children: [invalidToolBar] };

    for (const schematic of ['application', 'material-app']) {
      await expect(
        runner.runSchematic(
          schematic,
          { document: DOCUMENT_PATH },
          await createWorkspace(openUiDocument(invalidApplication)),
        ),
      ).rejects.toThrow('unsupported attribute(s): [bogus]');
    }

    const invalidCases: [OpenUiElement, string][] = [
      [
        { id: 'wrongRow', type: 'ToolBar', children: [{ id: 'text', type: 'TextInputs' }] },
        'ToolBar may contain only ToolBarRow children',
      ],
      [
        {
          id: 'rowAttribute',
          type: 'ToolBar',
          children: [
            {
              id: 'row',
              type: 'ToolBarRow',
              attrs: { '[bogus]': 'ignored' },
            },
          ],
        },
        'unsupported attribute(s): [bogus]',
      ],
      [
        {
          id: 'wrongAction',
          type: 'ToolBar',
          children: [
            {
              id: 'row',
              type: 'ToolBarRow',
              children: [{ id: 'text', type: 'TextInputs' }],
            },
          ],
        },
        'ToolBarRow may contain only ToolAction children',
      ],
      [
        {
          id: 'missingLabel',
          type: 'ToolBar',
          children: [
            { id: 'row', type: 'ToolBarRow', children: [{ id: 'action', type: 'ToolAction' }] },
          ],
        },
        'requires a non-empty [label]',
      ],
      [
        {
          id: 'invalidDisabled',
          type: 'ToolBar',
          children: [
            {
              id: 'row',
              type: 'ToolBarRow',
              children: [
                {
                  id: 'action',
                  type: 'ToolAction',
                  attrs: { '[label]': 'Action', '[disabled]': 'yes' },
                },
              ],
            },
          ],
        },
        'attribute "[disabled]" must be "true" or "false"',
      ],
      [
        {
          id: 'childAction',
          type: 'ToolBar',
          children: [
            {
              id: 'row',
              type: 'ToolBarRow',
              children: [
                {
                  id: 'action',
                  type: 'ToolAction',
                  attrs: { '[label]': 'Action' },
                  children: [{ id: 'nested', type: 'TextInputs' }],
                },
              ],
            },
          ],
        },
        'ToolAction and may not contain children',
      ],
      [
        {
          id: 'invalidActivate',
          type: 'ToolBar',
          children: [
            {
              id: 'row',
              type: 'ToolBarRow',
              children: [
                {
                  id: 'action',
                  type: 'ToolAction',
                  attrs: { '[label]': 'Action', '(activate)': 'callAction()' },
                },
              ],
            },
          ],
        },
        '(activate) must be null when present',
      ],
    ];
    for (const [invalidToolBarNode, message] of invalidCases) {
      const invalid = { ...application, children: [invalidToolBarNode] };
      expect(() =>
        applicationFromAst(JSON.parse(openUiDocument(invalid)), DOCUMENT_PATH, undefined),
      ).toThrow(message);
    }
  });
});
