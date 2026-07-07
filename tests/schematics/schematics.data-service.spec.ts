import { Tree } from '@angular-devkit/schematics';
import { describe, expect, it, vi } from 'vitest';

import { dataService } from '../../projects/angular-django2/schematics/data-service/index';

describe('angular-django2 schematics', () => {
  describe('data-service schematic', () => {
    it('TC-DS-01: generates data service with default options', () => {
      const tree = Tree.empty();

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
      expect(serviceContent).toContain("from '../api/services'");
    });

    it('TC-DS-02: generates data service spec file by default', () => {
      const tree = Tree.empty();

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
      const tree = Tree.empty();

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
      const tree = Tree.empty();

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
      const tree = Tree.empty();

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
      const tree = Tree.empty();

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
      const tree = Tree.empty();

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
    });

    it('TC-DS-08: is idempotent - does not overwrite existing service file', () => {
      const tree = Tree.empty();
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
      const tree = Tree.empty();

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
      const tree = Tree.empty();

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
      const tree = Tree.empty();

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
      const tree = Tree.empty();

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
  });
});
