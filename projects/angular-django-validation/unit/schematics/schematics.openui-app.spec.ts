import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, type UnitTestTree } from '@angular-devkit/schematics/testing';
import type { OpenUiElement } from '@shlomoa/openui-spec';
import { beforeEach, describe, expect, it } from 'vitest';

import { materialLayoutTemplate } from 'angular-django2/schematics/material-app/index';
import {
  applicationFromAst,
  indexHtmlFromAst,
  navigationLinksFromAst,
} from 'angular-django2/schematics/application/ast';
import { updateIndexHtml } from 'angular-django2/schematics/workspace-setup/index';
import {
  angularCollectionPath,
  collectionPath,
  openUiDocumentString as openUiDocument,
} from './schematics.helpers';

const DOCUMENT_PATH = 'app.openui.json';
const APP = '/projects/shop/src/app';

const profilePage: OpenUiElement = {
  id: 'profile',
  type: 'DashboardPage',
  attrs: { 'uses.title': '"My profile"', 'uses.route': '"me/profile"', 'uses.icon': '"person"' },
  children: [
    { id: 'summary', type: 'SurfaceContainers', attrs: { 'uses.slot': '"header"' } },
    {
      id: 'contact',
      type: 'Form',
      attrs: { 'uses.title': '"Contact"', 'uses.action': '"/api/contact/"' },
      children: [
        {
          id: 'email',
          type: 'TextInputs',
          attrs: { 'uses.type': '"email"', 'uses.label': '"Email"' },
        },
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
          attrs: {
            'uses.path': '"me/profile"',
            'uses.target': '"profile"',
            'uses.title': '"My profile"',
          },
        },
        {
          id: 'ordersRoute',
          type: 'Route',
          attrs: { 'uses.path': '"orders"', 'uses.target': '"orders"', 'uses.title': '"Orders"' },
        },
      ],
    },
    {
      id: 'navigation',
      type: 'Navigation',
      attrs: { 'uses.ariaLabel': '"Primary"' },
      children: [
        {
          id: 'profileNavigation',
          type: 'NavItem',
          attrs: {
            'uses.label': '"My profile"',
            'uses.route': '"profileRoute"',
            'uses.icon': '"person"',
          },
        },
        {
          id: 'ordersNavigation',
          type: 'NavItem',
          attrs: { 'uses.label': '"Orders"', 'uses.route': '"ordersRoute"' },
        },
      ],
    },
    {
      id: 'look',
      type: 'Presentation',
      attrs: {
        'uses.theme': '"purple-green"',
        'uses.typography': 'false',
        'uses.animations': 'true',
      },
    },
    {
      id: 'host',
      type: 'html',
      attrs: { 'uses.lang': '"he"', 'uses.dir': '"rtl"', 'uses.title': '"Shop & Co"' },
    },
    {
      id: 'icon',
      type: 'link',
      attrs: { 'uses.rel': '"icon"', 'uses.href': '"branding/shop.ico"' },
    },
  ],
};

const pages: OpenUiElement[] = [
  profilePage,
  { id: 'orders', type: 'DashboardPage', attrs: { 'uses.access': '"public"' } },
  { id: 'blank', type: 'EmptyPage', attrs: { 'uses.route': '"blank"' } },
];

const ordersTable: OpenUiElement = {
  id: 'orderRows',
  type: 'Table',
  attrs: { 'uses.data': 'src/app/api/services#OrdersApiService', 'behaves.paginate': null },
};

const toolBar: OpenUiElement = {
  id: 'mainToolBar',
  type: 'ToolBar',
  attrs: { 'uses.ariaLabel': '"Shop actions"' },
  children: [
    {
      id: 'primaryToolBarRow',
      type: 'ToolBarRow',
      children: [
        {
          id: 'refresh',
          type: 'ToolAction',
          attrs: {
            'uses.label': '"Refresh"',
            'uses.icon': '"refresh"',
            'uses.disabled': 'true',
            'produces.activate': null,
          },
        },
        { id: 'help', type: 'ToolAction', attrs: { 'uses.label': '"Help"' } },
      ],
    },
    {
      id: 'secondaryToolBarRow',
      type: 'ToolBarRow',
      children: [{ id: 'about', type: 'ToolAction', attrs: { 'uses.label': '"About"' } }],
    },
  ],
};

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

      const tree = await createWorkspace(openUiDocument(application, ...pages));
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

      const guarded = openUiDocument(application, ...pages, {
        id: 'admin',
        type: 'DashboardPage',
        attrs: { 'uses.access': '"protected"', 'uses.authGuard': '"adminGuard"' },
      });
      await expect(
        runner.runSchematic(
          'page',
          { document: DOCUMENT_PATH, nodeId: 'admin', path: 'src/app/features/admin' },
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
          { id: 'bad', type: 'DashboardPage', attrs: { 'uses.color': '"red"' } },
          'unsupported attribute(s): uses.color',
        ],
        [
          { id: 'bad', type: 'EmptyPage', children: [{ id: 'c', type: 'SurfaceContainers' }] },
          'which has no content',
        ],
        [
          { id: 'bad', type: 'DashboardPage', attrs: { 'uses.route': '"Bad Route"' } },
          'lowercase URL segments',
        ],
      ];
      for (const [node, message] of cases) {
        await expect(
          runner.runSchematic(
            'page',
            { ...base, nodeId: node.id },
            await createApplication(openUiDocument(application, ...pages, node)),
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

      // A NavItem's uses.route must name a Route: the validator's contract stage reports it first.
      const navItemsWithoutRouting = {
        ...application,
        children: application.children?.filter((child) => child.type !== 'Routing'),
      };
      await expect(
        runner.runSchematic(
          'material-app',
          { document: DOCUMENT_PATH },
          await createWorkspace(openUiDocument(navItemsWithoutRouting, ...pages)),
        ),
      ).rejects.toThrow(
        '/children/0/children/0/children/0/attrs/uses.route: contract/unresolved-reference',
      );
      const emptyNavigationWithoutRouting = {
        ...application,
        children: navItemsWithoutRouting.children?.map((child) =>
          child.type === 'Navigation' ? { ...child, children: [] } : child,
        ),
      };
      await expect(
        runner.runSchematic(
          'material-app',
          { document: DOCUMENT_PATH },
          await createWorkspace(openUiDocument(emptyNavigationWithoutRouting, ...pages)),
        ),
      ).rejects.toThrow('requires an Application Routing child');
      await expect(
        runner.runSchematic(
          'material-app',
          { document: DOCUMENT_PATH },
          await createWorkspace(
            openUiDocument({
              ...application,
              children: [{ id: 'look', type: 'Presentation', attrs: { 'uses.typography': 'yes' } }],
            }),
          ),
        ),
      ).rejects.toThrow(
        'attribute "uses.typography" must be the unquoted string "true" or "false", ' +
          'not the expression "yes"',
      );
    });
  });

  describe('workspace-setup --document', () => {
    it('TC-APP-08: updates index.html and replaces the favicon from html and link nodes', async () => {
      const tree = await createApplication(openUiDocument(application, ...pages));
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
      const tree = await createApplication(openUiDocument(application, ...pages));
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

  describe('Application children that a Route targets', () => {
    const route = (id: string, target: string): OpenUiElement => ({
      id,
      type: 'Route',
      attrs: { 'uses.path': `"${id}"`, 'uses.target': `"${target}"` },
    });
    const gardens = (...extra: OpenUiElement[]): OpenUiElement => ({
      id: 'root',
      type: 'Application',
      children: [
        { id: 'host', type: 'html', attrs: { 'uses.lang': '"he"' } },
        {
          id: 'appRouting',
          type: 'Routing',
          children: [route('register', 'registerForm'), route('account', 'accountPage')],
        },
        { id: 'nav', type: 'Navigation' },
        { id: 'registerForm', type: 'Form' },
        { id: 'accountPage', type: 'EmptyPage' },
        ...extra,
      ],
    });

    it('TC-APP-30: accepts the Form and page nodes that a Route targets and leaves them to their own schematics', () => {
      const document = gardens();
      const result = applicationFromAst(document, DOCUMENT_PATH, undefined);

      expect(result.name).toBe('root');
      expect(result.routing).toBe(true);
      expect(navigationLinksFromAst(result.node, document, DOCUMENT_PATH)).toEqual([]);
    });

    it('TC-APP-31: still rejects a Form that no Route targets', () => {
      expect(() =>
        applicationFromAst(gardens({ id: 'strayForm', type: 'Form' }), DOCUMENT_PATH, undefined),
      ).toThrow(
        'OpenUI node "app.openui.json#strayForm" has type "Form", which is not a supported Application child.',
      );
    });
  });

  describe('indexHtmlFromAst', () => {
    const hebrewAttrs = { 'uses.lang': '"he"', 'uses.dir': '"rtl"', 'uses.title': '"גינות"' };

    it('TC-APP-12: reads lang, dir and title from a root html node and ignores its document attributes', () => {
      const root: OpenUiElement = {
        id: 'root',
        type: 'html',
        attrs: { name: '"specialgardens"', ...hebrewAttrs },
      };
      expect(indexHtmlFromAst(root, DOCUMENT_PATH)).toEqual({
        lang: 'he',
        dir: 'rtl',
        title: 'גינות',
      });
    });

    it('TC-APP-13: a root html node without uses attributes describes nothing', () => {
      const root: OpenUiElement = { id: 'root', type: 'html', attrs: { name: '"specialgardens"' } };
      expect(indexHtmlFromAst(root, DOCUMENT_PATH)).toBeUndefined();
    });

    it('TC-APP-14: keeps reading a non-root html node', () => {
      const root: OpenUiElement = {
        id: 'root',
        type: 'html',
        attrs: { name: '"specialgardens"' },
        children: [{ id: 'host', type: 'html', attrs: hebrewAttrs }],
      };
      expect(indexHtmlFromAst(root, DOCUMENT_PATH)?.dir).toBe('rtl');
    });

    it('TC-APP-15: rejects a root and a non-root html node that both describe index.html', () => {
      const root: OpenUiElement = {
        id: 'root',
        type: 'html',
        attrs: hebrewAttrs,
        children: [{ id: 'host', type: 'html', attrs: hebrewAttrs }],
      };
      expect(() => indexHtmlFromAst(root, DOCUMENT_PATH)).toThrow(/both describe index\.html/);
    });

    it('TC-APP-16: rejects a root uses.dir other than ltr, rtl, auto', () => {
      const root: OpenUiElement = { id: 'root', type: 'html', attrs: { 'uses.dir': '"up"' } };
      expect(() => indexHtmlFromAst(root, DOCUMENT_PATH)).toThrow(/must be ltr, rtl, or auto/);
    });
  });

  describe('data-service --document', () => {
    it('TC-APP-11: generates a data service from a uses.data binding with a relative API import', async () => {
      const tree = await createApplication(openUiDocument(application, ...pages, ordersTable));
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
      const tree = await createApplication(openUiDocument(application, ...pages, ordersTable));
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
      ).rejects.toThrow('has no uses.data binding');
      await expect(
        runner.runSchematic(
          'data-service',
          { document: DOCUMENT_PATH },
          await createApplication(
            openUiDocument(application, ...pages, {
              id: 'rows',
              type: 'Table',
              attrs: { 'uses.data': 'OrdersApiService' },
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
        '<a mat-list-item routerLink="/a" routerLinkActive="active">\n        <span matListItemTitle>&#123;a&#125;</span>\n      </a>\n      <!-- openui:end nav -->\n    </mat-nav-list>',
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
                  attrs: { 'uses.label': '"Broken"', 'uses.route': '"missing"' },
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
                  attrs: { 'uses.path': '"profile"', 'uses.target': 'profile' },
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
    ).toThrow('attribute "uses.target" has the unquoted value profile');
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
      attrs: { 'uses.bogus': '"ignored"' },
    } satisfies OpenUiElement;
    const invalidApplication = { ...application, children: [invalidToolBar] };

    for (const schematic of ['application', 'material-app']) {
      await expect(
        runner.runSchematic(
          schematic,
          { document: DOCUMENT_PATH },
          await createWorkspace(openUiDocument(invalidApplication)),
        ),
      ).rejects.toThrow('unsupported attribute(s): uses.bogus');
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
              attrs: { 'uses.bogus': '"ignored"' },
            },
          ],
        },
        'unsupported attribute(s): uses.bogus',
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
        'requires a non-empty uses.label',
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
                  attrs: { 'uses.label': '"Action"', 'uses.disabled': 'yes' },
                },
              ],
            },
          ],
        },
        'attribute "uses.disabled" must be the unquoted string "true" or "false", ' +
          'not the expression "yes"',
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
                  attrs: { 'uses.label': '"Action"' },
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
                  attrs: { 'uses.label': '"Action"', 'produces.activate': 'callAction()' },
                },
              ],
            },
          ],
        },
        'produces.activate must be null when present',
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

describe('material-app --document: protected routes (Route uses.access)', () => {
  let runner: SchematicTestRunner;
  let angularRunner: SchematicTestRunner;

  beforeEach(() => {
    runner = new SchematicTestRunner('angular-django2', collectionPath);
    angularRunner = new SchematicTestRunner('@schematics/angular', angularCollectionPath);
  });

  /** The shop application with `uses.access` on the orders Route. */
  function documentWithAccess(access: string | undefined): string {
    const routing = application.children!.find((child) => child.type === 'Routing')!;
    const routes = routing.children!.map((route) =>
      route.id === 'ordersRoute' && access !== undefined
        ? { ...route, attrs: { ...route.attrs, 'uses.access': access } }
        : route,
    );
    const withAccess = {
      ...application,
      children: application.children!.map((child) =>
        child.type === 'Routing' ? { ...child, children: routes } : child,
      ),
    };
    return openUiDocument(withAccess, ...pages);
  }

  /** A generated application whose document has no protected route yet. */
  async function generate(access: string | undefined = undefined): Promise<UnitTestTree> {
    const workspace = (await angularRunner.runSchematic(
      'workspace',
      { name: 'demo', version: '22.0.0', newProjectRoot: 'projects' },
      Tree.empty(),
    )) as UnitTestTree;
    workspace.create(`/${DOCUMENT_PATH}`, documentWithAccess(access));
    return runner.runSchematic('material-app', { document: DOCUMENT_PATH }, workspace);
  }

  /** Adds the site's guard to the generated application and a feature route for `orders`. */
  function addSiteGuard(tree: UnitTestTree, guardName = 'authGuard'): void {
    tree.create(
      `${APP}/auth/auth.guard.ts`,
      `import type { CanActivateFn } from '@angular/router';\nexport const ${guardName}: CanActivateFn = () => false;\n`,
    );
    const routes = tree.readContent(`${APP}/app.routes.ts`);
    tree.overwrite(
      `${APP}/app.routes.ts`,
      `import { ${guardName} } from './auth/auth.guard';\nimport { ordersRoutes } from './features/orders.routes';\n${routes.replace(
        /export const routes: Routes = \[\s*\];?/,
        'export const routes: Routes = [...ordersRoutes];',
      )}`,
    );
    tree.create(
      `${APP}/features/orders.routes.ts`,
      "import type { Routes } from '@angular/router';\n\nexport const ordersRoutes: Routes = [\n  {\n    path: 'orders',\n    loadComponent: () => import('./orders-page').then((m) => m.OrdersPage),\n  },\n];\n",
    );
  }

  async function protect(tree: UnitTestTree, options: object = {}): Promise<UnitTestTree> {
    tree.overwrite(`/${DOCUMENT_PATH}`, documentWithAccess('"protected"'));
    return runner.runSchematic('material-app', { document: DOCUMENT_PATH, ...options }, tree);
  }

  it('TC-APP-18: applies the existing guard to a protected route and hides its link from anonymous visitors', async () => {
    const tree = await generate();
    addSiteGuard(tree);
    const generated = await protect(tree);

    const ordersRoutes = generated.readContent(`${APP}/features/orders.routes.ts`);
    expect(ordersRoutes).toContain("import { authGuard } from '../auth/auth.guard';");
    expect(ordersRoutes).toContain("path: 'orders',\n    canActivate: [authGuard]");
    const template = generated.readContent(`${APP}/app.html`);
    expect(template).toContain('@if (canAccessProtected()) {');
    expect(template.indexOf('@if (canAccessProtected())')).toBeLessThan(
      template.indexOf('routerLink="/orders"'),
    );
    expect(template).toMatch(/routerLink="\/me\/profile"/);
    expect(template.split('canAccessProtected').length - 1).toBe(1);
    const component = generated.readContent(`${APP}/app.ts`);
    expect(component).toContain("import { authGuard } from './auth/auth.guard';");
    expect(component).toContain('protected readonly canAccessProtected = toSignal(');
    expect(component).toContain('authGuard(state.root, state)');
    // The route stays declared once; the shell and the route configuration share the guard.
    expect(generated.readContent(`${APP}/app.routes.ts`)).not.toContain('canActivate');
  });

  it('TC-APP-19: fails naming the guard when the application does not import it', async () => {
    const tree = await generate();
    tree.overwrite(`/${DOCUMENT_PATH}`, documentWithAccess('"protected"'));
    await expect(
      runner.runSchematic('material-app', { document: DOCUMENT_PATH }, tree),
    ).rejects.toThrow(
      '"authGuard" guard, but "/projects/shop/src/app/app.routes.ts" does not import it',
    );

    addSiteGuard(tree, 'adminGuard');
    await expect(
      runner.runSchematic('material-app', { document: DOCUMENT_PATH }, tree),
    ).rejects.toThrow('need the existing "authGuard" guard');
    const generated = await runner.runSchematic(
      'material-app',
      { document: DOCUMENT_PATH, authGuard: 'adminGuard' },
      tree,
    );
    expect(generated.readContent(`${APP}/features/orders.routes.ts`)).toContain(
      'canActivate: [adminGuard]',
    );
  });

  it('TC-APP-32: material-app compiles the shell of a document whose Routes target Form and page nodes', async () => {
    const withForm = {
      ...application,
      children: [
        ...application.children!.map((child) =>
          child.type === 'Routing'
            ? {
                ...child,
                children: [
                  ...child.children!,
                  {
                    id: 'newsletterRoute',
                    type: 'Route',
                    attrs: { 'uses.path': '"newsletter"', 'uses.target': '"newsletterForm"' },
                  },
                ],
              }
            : child,
        ),
        { id: 'newsletterForm', type: 'Form', attrs: { 'uses.title': '"Newsletter"' } },
      ],
    };
    const workspace = (await angularRunner.runSchematic(
      'workspace',
      { name: 'demo', version: '22.0.0', newProjectRoot: 'projects' },
      Tree.empty(),
    )) as UnitTestTree;
    workspace.create(`/${DOCUMENT_PATH}`, openUiDocument(withForm, ...pages));

    const generated = await runner.runSchematic(
      'material-app',
      { document: DOCUMENT_PATH },
      workspace,
    );

    expect(generated.files).toContain(`${APP}/app.routes.ts`);
    expect(generated.readContent(`${APP}/app.html`)).toContain('routerLink="/me/profile"');
    expect(generated.files.filter((file) => file.includes('newsletter'))).toEqual([]);

    withForm.children.push({ id: 'strayForm', type: 'Form', attrs: {} });
    workspace.overwrite(`/${DOCUMENT_PATH}`, openUiDocument(withForm, ...pages));
    await expect(
      runner.runSchematic('material-app', { document: DOCUMENT_PATH }, workspace),
    ).rejects.toThrow('"Form", which is not a supported Application child');
  });

  it('TC-APP-20: leaves public routes unchanged', async () => {
    const withoutAccess = await generate();
    for (const access of ['"public"', undefined]) {
      const generated = await generate(access);
      for (const file of ['app.html', 'app.ts', 'app.routes.ts']) {
        expect(generated.readContent(`${APP}/${file}`)).toBe(
          withoutAccess.readContent(`${APP}/${file}`),
        );
      }
    }
    expect(withoutAccess.readContent(`${APP}/app.html`)).not.toContain('canAccessProtected');
    expect(withoutAccess.readContent(`${APP}/app.ts`)).not.toContain('access');
  });

  it('TC-APP-21: a re-run is idempotent and a route made public again loses the guarded link', async () => {
    const tree = await generate();
    addSiteGuard(tree);
    const first = await protect(tree);
    const snapshot = Object.fromEntries(
      ['app.html', 'app.ts', 'features/orders.routes.ts'].map((file) => [
        file,
        first.readContent(`${APP}/${file}`),
      ]),
    );
    const second = await protect(first);
    for (const [file, content] of Object.entries(snapshot)) {
      expect(second.readContent(`${APP}/${file}`)).toBe(content);
    }

    second.overwrite(`/${DOCUMENT_PATH}`, documentWithAccess('"public"'));
    const reverted = await runner.runSchematic('material-app', { document: DOCUMENT_PATH }, second);
    expect(reverted.readContent(`${APP}/app.html`)).not.toContain('canAccessProtected');
    expect(reverted.readContent(`${APP}/app.ts`)).not.toContain('canAccessProtected');
  });

  it('TC-APP-22: rejects an unsupported uses.access value', async () => {
    const tree = await createWorkspaceWith(angularRunner, documentWithAccess('"admin"'));
    await expect(
      runner.runSchematic('material-app', { document: DOCUMENT_PATH }, tree),
    ).rejects.toThrow('uses.access="admin" is not supported. Supported values: public, protected.');
  });
});

async function createWorkspaceWith(
  angularRunner: SchematicTestRunner,
  document: string,
): Promise<UnitTestTree> {
  const tree = (await angularRunner.runSchematic(
    'workspace',
    { name: 'demo', version: '22.0.0', newProjectRoot: 'projects' },
    Tree.empty(),
  )) as UnitTestTree;
  tree.create(`/${DOCUMENT_PATH}`, document);
  return tree;
}
