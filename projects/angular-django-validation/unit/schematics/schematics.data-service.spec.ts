import { Tree } from '@angular-devkit/schematics';
import { describe, expect, it, vi } from 'vitest';

import { dataService } from 'angular-django2/schematics/data-service/index';

const SERVICE_DIRECTORY = 'src/app/features/users/services/users';

/** An empty workspace with one application project, as `ng new` writes it. */
function workspaceTree(): Tree {
  const tree = Tree.empty();
  tree.create(
    '/angular.json',
    JSON.stringify({
      projects: { app: { root: '', sourceRoot: 'src', projectType: 'application' } },
    }),
  );
  return tree;
}

function createContext() {
  return { logger: { info: vi.fn(), warn: vi.fn() } };
}

/** Write the files `ng-openapi-gen` generates for the given service classes. */
function generateClient(tree: Tree, output: string, services: string[]): void {
  tree.create(
    `${output}/services.ts`,
    services
      .map((name) => `export { ${name} } from './services/${name.toLowerCase()}';\n`)
      .join(''),
  );
  tree.create(`${output}/strict-http-response.ts`, 'export {};\n');
}

function readService(tree: Tree, directory = SERVICE_DIRECTORY, file = 'users'): string {
  return tree.read(`${directory}/${file}.data.service.ts`)!.toString();
}

describe('angular-django2 schematics', () => {
  describe('data-service schematic', () => {
    it('TC-DS-01: generates data service with default options', () => {
      const tree = workspaceTree();

      const context = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
        },
      } as never;

      const updatedTree = dataService({ name: 'users' })(tree, context) as Tree;

      // Check that the service file was created
      const serviceFile = updatedTree.read(
        'src/app/features/users/services/users/users.data.service.ts',
      );
      expect(serviceFile).toBeTruthy();

      const serviceContent = serviceFile!.toString();
      expect(serviceContent).toContain('export class UsersDataService');
      expect(serviceContent).toContain('constructor(public readonly apiService: UsersApiService)');
      // src/app/features/users/services/users -> src/app/api
      expect(serviceContent).toContain("from '../../../../api/services'");
      expect(serviceContent).toContain("from '../../../../api/strict-http-response'");
    });

    it('TC-DS-02: generates data service spec file by default', () => {
      const tree = workspaceTree();

      const context = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
        },
      } as never;

      const updatedTree = dataService({ name: 'users' })(tree, context) as Tree;

      // Check that the spec file was created
      const specFile = updatedTree.read(
        'src/app/features/users/services/users/users.data.service.spec.ts',
      );
      expect(specFile).toBeTruthy();

      const specContent = specFile!.toString();
      expect(specContent).toContain("describe('UsersDataService'");
      expect(specContent).toContain('TestBed.configureTestingModule');
      expect(specContent).toContain('UsersApiService');
    });

    it('TC-DS-03: skips spec file when skipTests is true', () => {
      const tree = workspaceTree();

      const context = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
        },
      } as never;

      const updatedTree = dataService({ name: 'users', skipTests: true })(tree, context) as Tree;

      // Service file should exist
      expect(
        updatedTree.exists('src/app/features/users/services/users/users.data.service.ts'),
      ).toBe(true);

      // Spec file should not exist
      expect(
        updatedTree.exists('src/app/features/users/services/users/users.data.service.spec.ts'),
      ).toBe(false);
    });

    it('TC-DS-04: respects custom path option', () => {
      const tree = workspaceTree();

      const context = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
        },
      } as never;

      const updatedTree = dataService({
        name: 'products',
        path: 'src/app/core/services',
      })(tree, context) as Tree;

      // Check that files were created in custom path
      expect(updatedTree.exists('src/app/core/services/products/products.data.service.ts')).toBe(
        true,
      );
      expect(
        updatedTree.exists('src/app/core/services/products/products.data.service.spec.ts'),
      ).toBe(true);
    });

    it('TC-DS-05: respects flat option to create files in path root', () => {
      const tree = workspaceTree();

      const context = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
        },
      } as never;

      const updatedTree = dataService({
        name: 'orders',
        path: 'src/app/services',
        flat: true,
      })(tree, context) as Tree;

      // Check that files were created flat in the path
      expect(updatedTree.exists('src/app/services/orders.data.service.ts')).toBe(true);
      expect(updatedTree.exists('src/app/services/orders.data.service.spec.ts')).toBe(true);
    });

    it('TC-DS-06: handles custom API service name', () => {
      const tree = workspaceTree();

      const context = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
        },
      } as never;

      const updatedTree = dataService({
        name: 'customers',
        apiService: 'CustomerApiService',
      })(tree, context) as Tree;

      const serviceFile = updatedTree.read(
        'src/app/features/customers/services/customers/customers.data.service.ts',
      );
      const serviceContent = serviceFile!.toString();

      expect(serviceContent).toContain('CustomerApiService');
      expect(serviceContent).toContain(
        'constructor(public readonly apiService: CustomerApiService)',
      );
    });

    it('TC-DS-07: handles custom API path', () => {
      const tree = workspaceTree();

      const context = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
        },
      } as never;

      const updatedTree = dataService({
        name: 'items',
        apiPath: '../../generated/api/services',
      })(tree, context) as Tree;

      const serviceFile = updatedTree.read(
        'src/app/features/items/services/items/items.data.service.ts',
      );
      const serviceContent = serviceFile!.toString();

      expect(serviceContent).toContain("from '../../generated/api/services'");
      expect(serviceContent).toContain("from '../../generated/api/strict-http-response'");
      expect(serviceContent).not.toContain("'../api/");
    });

    it('TC-DS-08: is idempotent - does not overwrite existing service file', () => {
      const tree = workspaceTree();
      const existingContent = '// Existing service content';
      tree.create('src/app/features/users/services/users/users.data.service.ts', existingContent);

      const context = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
        },
      } as never;

      const updatedTree = dataService({ name: 'users' })(tree, context) as Tree;

      const serviceFile = updatedTree.read(
        'src/app/features/users/services/users/users.data.service.ts',
      );
      expect(serviceFile!.toString()).toBe(existingContent);
      expect(context.logger.warn).toHaveBeenCalledWith(expect.stringContaining('already exists'));
    });

    it('TC-DS-09: includes all CRUD methods', () => {
      const tree = workspaceTree();

      const context = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
        },
      } as never;

      const updatedTree = dataService({ name: 'posts' })(tree, context) as Tree;

      const serviceFile = updatedTree.read(
        'src/app/features/posts/services/posts/posts.data.service.ts',
      );
      const serviceContent = serviceFile!.toString();

      // Check for all CRUD methods
      expect(serviceContent).toContain('search<ItemType, ResponseBody>(');
      expect(serviceContent).toContain('list<T, R = T>(');
      expect(serviceContent).toContain('get<T, R = T>(');
      expect(serviceContent).toContain('create<T, R = T>(');
      expect(serviceContent).toContain('update<T, R = T>(');
      expect(serviceContent).toContain('delete(');
    });

    it('TC-DS-10: includes proper TypeScript types and imports', () => {
      const tree = workspaceTree();

      const context = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
        },
      } as never;

      const updatedTree = dataService({ name: 'books' })(tree, context) as Tree;

      const serviceFile = updatedTree.read(
        'src/app/features/books/services/books/books.data.service.ts',
      );
      const serviceContent = serviceFile!.toString();

      // Check for required imports
      expect(serviceContent).toContain("import { Injectable } from '@angular/core'");
      expect(serviceContent).toContain("import { SortDirection } from '@angular/material/sort'");
      expect(serviceContent).toContain("import { Observable } from 'rxjs'");
      expect(serviceContent).toContain("import { map, catchError } from 'rxjs/operators'");

      // Check for interfaces
      expect(serviceContent).toContain('export interface ItemsType<ItemType>');
      expect(serviceContent).toContain('export interface SearchParamsType');
      expect(serviceContent).toContain('export type SearchFn<ResponseBody>');
      expect(serviceContent).toContain('export type ToItems<ItemType, ResponseBody>');
    });

    it('TC-DS-11: spec file includes comprehensive test coverage', () => {
      const tree = workspaceTree();

      const context = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
        },
      } as never;

      const updatedTree = dataService({ name: 'articles' })(tree, context) as Tree;

      const specFile = updatedTree.read(
        'src/app/features/articles/services/articles/articles.data.service.spec.ts',
      );
      const specContent = specFile!.toString();

      // Check for test structure
      expect(specContent).toContain('TestBed.configureTestingModule');
      expect(specContent).toContain('jasmine.createSpyObj');
      expect(specContent).toContain("describe('search'");
      expect(specContent).toContain("describe('list'");
      expect(specContent).toContain("describe('get'");
      expect(specContent).toContain("describe('create'");
      expect(specContent).toContain("describe('update'");
      expect(specContent).toContain("describe('delete'");

      // Check for error handling tests
      expect(specContent).toContain('should handle search errors');
    });

    it('TC-DS-12: handles multi-word resource names correctly', () => {
      const tree = workspaceTree();

      const context = {
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
        },
      } as never;

      const updatedTree = dataService({ name: 'user-profiles' })(tree, context) as Tree;

      const serviceFile = updatedTree.read(
        'src/app/features/user-profiles/services/user-profiles/user-profiles.data.service.ts',
      );
      const serviceContent = serviceFile!.toString();

      // Check proper class naming
      expect(serviceContent).toContain('export class UserProfilesDataService');
      expect(serviceContent).toContain('UserProfilesApiService');
    });

    describe('generated client resolution', () => {
      it('TC-DS-13: resolves the client from the output of ng-openapi-gen.json', () => {
        const tree = workspaceTree();
        tree.create('/ng-openapi-gen.json', JSON.stringify({ output: 'src/app/shared/api/' }));
        const context = createContext();

        const service = readService(dataService({ name: 'users' })(tree, context as never) as Tree);

        expect(service).toContain("from '../../../../shared/api/services'");
        expect(service).toContain("from '../../../../shared/api/strict-http-response'");
      });

      it('TC-DS-14: relativizes an --api-path that is an application path', () => {
        const context = createContext();

        const tree = dataService({ name: 'users', apiPath: 'src/app/core/api/services' })(
          workspaceTree(),
          context as never,
        ) as Tree;

        const service = readService(tree);
        expect(service).toContain("from '../../../../core/api/services'");
        expect(service).toContain("from '../../../../core/api/strict-http-response'");
      });

      it('TC-DS-15: derives the root import without rewriting other services segments', () => {
        const context = createContext();

        const tree = dataService({ name: 'users', apiPath: '../../services/api/services' })(
          workspaceTree(),
          context as never,
        ) as Tree;

        const service = readService(tree);
        expect(service).toContain("from '../../services/api/services'");
        expect(service).toContain("from '../../services/api/strict-http-response'");
      });

      it('TC-DS-16: imports the same client from the generated spec', () => {
        const context = createContext();

        const tree = dataService({ name: 'users' })(workspaceTree(), context as never) as Tree;

        const spec = tree.read(`${SERVICE_DIRECTORY}/users.data.service.spec.ts`)!.toString();
        expect(spec).toContain("import { UsersApiService } from '../../../../api/services';");
        expect(spec).toContain("from '../../../../api/strict-http-response'");
        expect(spec).toContain("import { HttpResponse } from '@angular/common/http';");
        expect(spec).toContain('new HttpResponse<');
        expect(spec).not.toContain('headers: {} as any');
      });

      it('TC-DS-17: uses the serviceSuffix of ng-openapi-gen.json for the class name', () => {
        const tree = workspaceTree();
        tree.create('/ng-openapi-gen.json', JSON.stringify({ serviceSuffix: 'Client' }));
        generateClient(tree, 'src/app/api', ['UsersClient']);

        const generated = dataService({ name: 'users' })(tree, createContext() as never) as Tree;

        expect(readService(generated)).toContain(
          'constructor(public readonly apiService: UsersClient)',
        );
      });

      it('TC-DS-18: warns and still writes the computed path when the client is not generated', () => {
        const context = createContext();

        const tree = dataService({ name: 'users' })(workspaceTree(), context as never) as Tree;

        expect(context.logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('npm run generate:api'),
        );
        expect(readService(tree)).toContain("from '../../../../api/services'");
      });

      it('TC-DS-19: accepts a generated client that exports the wrapped class', () => {
        const tree = workspaceTree();
        generateClient(tree, 'src/app/api', ['UsersApiService']);
        const context = createContext();

        dataService({ name: 'users' })(tree, context as never);

        expect(context.logger.warn).not.toHaveBeenCalled();
      });

      it('TC-DS-20: fails when the client does not export the wrapped class', () => {
        const tree = workspaceTree();
        generateClient(tree, 'src/app/api', ['CustomersApiService', 'OrdersApiService']);

        expect(() => dataService({ name: 'customer' })(tree, createContext() as never)).toThrow(
          /does not export CustomerApiService\. Exported services: CustomersApiService, OrdersApiService/,
        );
        expect(() =>
          dataService({ name: 'customer', apiService: 'CustomersApiService' })(
            tree,
            createContext() as never,
          ),
        ).not.toThrow();
      });

      it('TC-DS-21: fails when ng-openapi-gen.json disables services', () => {
        const tree = workspaceTree();
        tree.create('/ng-openapi-gen.json', JSON.stringify({ services: false }));

        expect(() => dataService({ name: 'users' })(tree, createContext() as never)).toThrow(
          /"services": false/,
        );
      });

      it('TC-DS-22: fails when strict-http-response is missing from the generated client', () => {
        const tree = workspaceTree();
        tree.create('src/app/api/services.ts', "export { UsersApiService } from './services/x';\n");

        expect(() => dataService({ name: 'users' })(tree, createContext() as never)).toThrow(
          /src\/app\/api\/strict-http-response\.ts does not exist/,
        );
      });
    });
  });
});
