import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, type UnitTestTree } from '@angular-devkit/schematics/testing';
import { describe, expect, it } from 'vitest';
import * as path from 'node:path';
import { MATERIAL_LAYOUT_TEMPLATE } from '../../projects/angular-django2/schematics/utility/material-constants';

const collectionPath = path.join(
  __dirname,
  '../../dist/angular-django2/schematics/collection.json',
);

function createMaterialApplicationTree(): UnitTestTree {
  const tree = Tree.empty() as UnitTestTree;
  tree.create(
    '/package.json',
    JSON.stringify({
      dependencies: {
        '@angular/cdk': '^22.0.0',
        '@angular/common': '^22.0.0',
        '@angular/forms': '^22.0.0',
        '@angular/material': '^22.0.0',
        '@angular/router': '^22.0.0',
      },
    }),
  );
  tree.create(
    '/angular.json',
    JSON.stringify({
      projects: {
        demo: {
          projectType: 'application',
          root: '',
          sourceRoot: 'src',
          architect: {
            build: {
              options: {
                styles: ['@angular/material/prebuilt-themes/indigo-pink.css'],
              },
            },
          },
        },
      },
    }),
  );
  tree.create(
    '/src/app/app.routes.ts',
    `import type { Routes } from '@angular/router';

export const routes: Routes = [];
`,
  );
  tree.create(
    '/src/app/app.config.ts',
    `import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig = { providers: [provideRouter(routes)] };
`,
  );
  tree.create('/src/app/app.html', MATERIAL_LAYOUT_TEMPLATE);
  return tree;
}

function createRunner(): SchematicTestRunner {
  return new SchematicTestRunner('angular-django2', collectionPath);
}

describe('site schematic', () => {
  it('TC-SITE-01: registers and assembles a source-defined Material shell, routes, forms, and CSRF provider', async () => {
    const tree = createMaterialApplicationTree();
    tree.create(
      '/src/app/openui/contact-form.json',
      JSON.stringify({
        title: 'Contact',
        endpoint: '/api/contact/',
        fields: [{ name: 'email', label: 'Email', control: 'email', required: true }],
      }),
    );
    tree.create(
      '/src/app/openui/site.json',
      JSON.stringify({
        pages: [
          {
            name: 'contact',
            routePath: 'contact',
            navigation: { id: 'contact', label: 'Contact', icon: 'mail' },
          },
        ],
        forms: [{ name: 'contact', definition: 'src/app/openui/contact-form.json' }],
      }),
    );

    const result = await createRunner().runSchematic(
      'site',
      { project: 'demo', source: 'src/app/openui/site.json' },
      tree,
    );

    expect(result.files).toContain('/src/app/features/contact/contact-page.ts');
    expect(result.files).toContain('/src/app/features/contact-form/contact-form.ts');
    expect(result.readContent('/src/app/features/contact/contact.page.routes.ts')).toContain(
      "path: 'contact'",
    );
    expect(result.readContent('/src/app/app.config.ts')).toContain('withXsrfConfiguration');
    expect(result.readContent('/src/app/app.html')).toContain('routerLink="/contact"');
    expect(result.readContent('/.angular-django2/site/demo.json')).toContain(
      '"source": "src/app/openui/site.json"',
    );
  });

  it('TC-SITE-02: generates only the documented Home default and is idempotent', async () => {
    const runner = createRunner();
    const first = await runner.runSchematic(
      'site',
      { project: 'demo', defaults: true },
      createMaterialApplicationTree(),
    );
    const second = await runner.runSchematic('site', { project: 'demo', defaults: true }, first);

    expect(second.files).toContain('/src/app/features/home/home-page.ts');
    expect(second.readContent('/src/app/app.html')).toContain('routerLink="/home"');
    expect(second.readContent('/src/app/app.routes.ts').match(/homePageRoutes/g)).toHaveLength(2);
  });

  it('TC-SITE-03: rejects missing source/defaults before writing output', async () => {
    const tree = createMaterialApplicationTree();

    await expect(createRunner().runSchematic('site', { project: 'demo' }, tree)).rejects.toThrow(
      'Pass --source',
    );
    expect(tree.exists('/.angular-django2/site/demo.json')).toBe(false);
  });

  it('TC-SITE-04: rejects a protected page without an existing applied guard', async () => {
    const tree = createMaterialApplicationTree();
    tree.create(
      '/src/app/openui/site.json',
      JSON.stringify({
        pages: [
          {
            name: 'account',
            access: 'protected',
            navigation: { id: 'account', label: 'Account' },
          },
        ],
      }),
    );

    await expect(
      createRunner().runSchematic(
        'site',
        { project: 'demo', source: 'src/app/openui/site.json' },
        tree,
      ),
    ).rejects.toThrow('Protected OpenUI pages require existing');
  });

  it('TC-SITE-05: rejects conflicting OpenUI routes and navigation identifiers', async () => {
    const tree = createMaterialApplicationTree();
    tree.create(
      '/src/app/openui/site.json',
      JSON.stringify({
        pages: [
          { name: 'orders', navigation: { id: 'shared', label: 'Orders' } },
          {
            name: 'order-history',
            routePath: 'orders',
            navigation: { id: 'shared', label: 'Order history' },
          },
        ],
      }),
    );

    await expect(
      createRunner().runSchematic(
        'site',
        { project: 'demo', source: 'src/app/openui/site.json' },
        tree,
      ),
    ).rejects.toThrow('conflicting route paths');
  });

  it('TC-SITE-06: delete requires confirmation and restores only the owned shell', async () => {
    const runner = createRunner();
    const created = await runner.runSchematic(
      'site',
      { project: 'demo', defaults: true },
      createMaterialApplicationTree(),
    );

    await expect(
      runner.runSchematic('site', { project: 'demo', operation: 'delete' }, created),
    ).rejects.toThrow('confirmDelete=true');

    const deleted = await runner.runSchematic(
      'site',
      { project: 'demo', operation: 'delete', confirmDelete: true, defaults: true },
      created,
    );
    expect(deleted.readContent('/src/app/app.html')).toBe(MATERIAL_LAYOUT_TEMPLATE);
    expect(deleted.files).not.toContain('/.angular-django2/site/demo.json');
    expect(deleted.files).toContain('/src/app/features/home/home-page.ts');
  });
});
