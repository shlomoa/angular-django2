import { Tree } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';
import { page } from '../../projects/angular-django2/schematics/page/index';
import type { PageSchema } from '../../projects/angular-django2/schematics/page/schema';

function createApplicationTree(
  options: { multipleProjects?: boolean; protectedRoute?: boolean } = {},
): Tree {
  const tree = Tree.empty();
  tree.create(
    '/package.json',
    JSON.stringify({
      dependencies: {
        '@angular/cdk': '^22.0.0',
        '@angular/material': '^22.0.0',
        '@angular/router': '^22.0.0',
      },
    }),
  );
  tree.create(
    '/angular.json',
    JSON.stringify({
      version: 1,
      projects: {
        demo: {
          projectType: 'application',
          root: 'projects/demo',
          sourceRoot: 'projects/demo/src',
        },
        ...(options.multipleProjects
          ? {
              admin: {
                projectType: 'application',
                root: 'projects/admin',
                sourceRoot: 'projects/admin/src',
              },
            }
          : {}),
      },
    }),
  );
  addApplicationFiles(tree, 'demo', options.protectedRoute);
  if (options.multipleProjects) {
    addApplicationFiles(tree, 'admin');
  }
  return tree;
}

function addApplicationFiles(tree: Tree, project: string, protectedRoute = false): void {
  const sourceRoot = `/projects/${project}/src/app`;
  const guardImport = protectedRoute ? "import { authGuard } from './core/auth.guard';\n" : '';
  const protectedRouteDefinition = protectedRoute
    ? `,
  { path: 'account', canActivate: [authGuard], loadComponent: () => import('./account').then((m) => m.Account) }`
    : '';

  tree.create(
    `${sourceRoot}/app.routes.ts`,
    `import type { Routes } from '@angular/router';
${guardImport}
export const routes: Routes = [
  { path: 'existing', loadComponent: () => import('./existing').then((m) => m.Existing) }${protectedRouteDefinition},
];
`,
  );
  tree.create(
    `${sourceRoot}/app.config.ts`,
    `import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig = { providers: [provideRouter(routes)] };
`,
  );
  if (protectedRoute) {
    tree.create(`${sourceRoot}/core/auth.guard.ts`, 'export const authGuard = () => true;\n');
  }
}

const publicOptions: PageSchema = {
  name: 'orders',
  path: 'src/app/features/orders',
  routePath: 'orders',
  navigationLabel: 'Orders',
  navigationIcon: 'shopping_cart',
};

describe('page schematic', () => {
  it('creates a standalone OnPush Material page and preserves unrelated routes', () => {
    const tree = createApplicationTree();

    page(publicOptions)(tree, {} as never);

    const component = tree
      .read('/projects/demo/src/app/features/orders/orders-page.ts')!
      .toString();
    const route = tree
      .read('/projects/demo/src/app/features/orders/orders.page.routes.ts')!
      .toString();
    const rootRoutes = tree.read('/projects/demo/src/app/app.routes.ts')!.toString();

    expect(component).toContain('standalone');
    expect(component).toContain('MatCardModule');
    expect(component).toContain('ChangeDetectionStrategy.OnPush');
    expect(route).toContain('loadComponent: () =>');
    expect(route).toContain("path: 'orders'");
    expect(route).toContain("navigation: { label: 'Orders', icon: 'shopping_cart' }");
    expect(route).not.toContain('canActivate');
    expect(rootRoutes).toContain("path: 'existing'");
    expect(rootRoutes).toContain(
      "import { ordersPageRoutes } from './features/orders/orders.page.routes';",
    );
    expect(rootRoutes).toContain('...ordersPageRoutes,');
  });

  it('references an already configured guard only for protected routes', () => {
    const tree = createApplicationTree({ protectedRoute: true });

    page({ ...publicOptions, access: 'protected' })(tree, {} as never);

    const route = tree
      .read('/projects/demo/src/app/features/orders/orders.page.routes.ts')!
      .toString();
    expect(route).toContain("import { authGuard } from '../../core/auth.guard';");
    expect(route).toContain('canActivate: [authGuard]');
    expect(route).toContain("access: 'protected'");
  });

  it('rejects protected pages without an applied reusable guard', () => {
    const tree = createApplicationTree();

    expect(() => page({ ...publicOptions, access: 'protected' })(tree, {} as never)).toThrow(
      'Protected pages require the configured reusable "authGuard" guard',
    );
  });

  it('rejects duplicate route paths before creating page files', () => {
    const tree = createApplicationTree();

    expect(() => page({ ...publicOptions, routePath: 'existing' })(tree, {} as never)).toThrow(
      'The route path "existing" is already declared',
    );
    expect(tree.exists('/projects/demo/src/app/features/orders/orders-page.ts')).toBe(false);
  });

  it('is idempotent and refuses incomplete owned route registration', () => {
    const tree = createApplicationTree();
    page(publicOptions)(tree, {} as never);
    const firstRoutes = tree.read('/projects/demo/src/app/app.routes.ts')!.toString();

    page(publicOptions)(tree, {} as never);
    expect(tree.read('/projects/demo/src/app/app.routes.ts')!.toString()).toBe(firstRoutes);

    tree.overwrite(
      '/projects/demo/src/app/app.routes.ts',
      firstRoutes.replace('...ordersPageRoutes,', ''),
    );
    expect(() => page(publicOptions)(tree, {} as never)).toThrow('route registration');
  });

  it('requires routing and Material prerequisites before mutation', () => {
    const tree = createApplicationTree();
    tree.delete('/projects/demo/src/app/app.config.ts');
    expect(() => page(publicOptions)(tree, {} as never)).toThrow('provideRouter(routes)');

    const missingMaterial = createApplicationTree();
    missingMaterial.overwrite(
      '/package.json',
      JSON.stringify({ dependencies: { '@angular/router': '^22' } }),
    );
    expect(() => page(publicOptions)(missingMaterial, {} as never)).toThrow(
      'Angular Material and routing prerequisites',
    );
  });

  it('requires --project for multiple applications and targets the selected project', () => {
    const tree = createApplicationTree({ multipleProjects: true });
    expect(() => page(publicOptions)(tree, {} as never)).toThrow('Specify --project');

    page({ ...publicOptions, project: 'admin' })(tree, {} as never);
    expect(tree.exists('/projects/admin/src/app/features/orders/orders-page.ts')).toBe(true);
    expect(tree.exists('/projects/demo/src/app/features/orders/orders-page.ts')).toBe(false);
  });

  it('rejects unknown projects and paths outside the application source root', () => {
    const tree = createApplicationTree();
    expect(() => page({ ...publicOptions, project: 'unknown' })(tree, {} as never)).toThrow(
      'Project "unknown" not found',
    );
    expect(() => page({ ...publicOptions, path: '../outside' })(tree, {} as never)).toThrow(
      'target path must be a non-empty path within the application source tree',
    );
  });
});
