import { Tree } from '@angular-devkit/schematics';
import { describe, expect, it, vi } from 'vitest';

import { apiSetup } from '../../projects/angular-django2/schematics/api-setup/index';

describe('angular-django2 schematics', () => {
  describe('api-setup schematic', () => {
    it('TC-API-01: adds ng-openapi-gen to devDependencies', () => {
      const tree = Tree.empty();
      tree.create(
        '/package.json',
        JSON.stringify(
          {
            name: 'test-app',
            version: '1.0.0',
            dependencies: {},
            devDependencies: {},
          },
          null,
          2,
        ),
      );

      const context = {
        addTask: vi.fn(),
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
        },
      } as never;

      const updatedTree = apiSetup({})(tree, context) as Tree;
      const packageJson = JSON.parse(updatedTree.read('/package.json')!.toString());

      expect(packageJson.devDependencies['ng-openapi-gen']).toBeDefined();
      expect(packageJson.devDependencies['ng-openapi-gen']).toMatch(/^\^\d+\.\d+\.\d+$/);
      expect(context.addTask).toHaveBeenCalled();
    });

    it('TC-API-02: generates ng-openapi-gen.json config file with default options', () => {
      const tree = Tree.empty();
      tree.create('/package.json', JSON.stringify({ name: 'test-app' }, null, 2));

      const context = {
        addTask: vi.fn(),
        logger: { info: vi.fn(), warn: vi.fn() },
      } as never;

      const updatedTree = apiSetup({})(tree, context) as Tree;
      const configContent = updatedTree.read('/ng-openapi-gen.json')!.toString();
      const config = JSON.parse(configContent);

      expect(config).toEqual({
        $schema: 'node_modules/ng-openapi-gen/ng-openapi-gen-schema.json',
        input: 'openapi.json',
        output: 'src/app/api',
      });
    });

    it('TC-API-03: generates ng-openapi-gen.json config file with custom options', () => {
      const tree = Tree.empty();
      tree.create('/package.json', JSON.stringify({ name: 'test-app' }, null, 2));

      const context = {
        addTask: vi.fn(),
        logger: { info: vi.fn(), warn: vi.fn() },
      } as never;

      const updatedTree = apiSetup({
        inputPath: 'schema/api.json',
        outputPath: 'src/generated/api',
      })(tree, context) as Tree;

      const configContent = updatedTree.read('/ng-openapi-gen.json')!.toString();
      const config = JSON.parse(configContent);

      expect(config.input).toBe('schema/api.json');
      expect(config.output).toBe('src/generated/api');
    });

    it('TC-API-04: adds generate:api script to package.json', () => {
      const tree = Tree.empty();
      tree.create(
        '/package.json',
        JSON.stringify(
          {
            name: 'test-app',
            scripts: {
              start: 'ng serve',
            },
          },
          null,
          2,
        ),
      );

      const context = {
        addTask: vi.fn(),
        logger: { info: vi.fn(), warn: vi.fn() },
      } as never;

      const updatedTree = apiSetup({})(tree, context) as Tree;
      const packageJson = JSON.parse(updatedTree.read('/package.json')!.toString());

      expect(packageJson.scripts['generate:api']).toBe('ng-openapi-gen');
      expect(packageJson.scripts.start).toBe('ng serve'); // Preserves existing scripts
    });

    it('TC-API-05: is idempotent when run multiple times', () => {
      const tree = Tree.empty();
      tree.create(
        '/package.json',
        JSON.stringify(
          {
            name: 'test-app',
            devDependencies: {},
            scripts: {},
          },
          null,
          2,
        ),
      );

      const context = {
        addTask: vi.fn(),
        logger: { info: vi.fn(), warn: vi.fn() },
      } as never;

      // First run
      let updatedTree = apiSetup({})(tree, context) as Tree;
      const firstPackageJson = JSON.parse(updatedTree.read('/package.json')!.toString());
      const firstConfig = updatedTree.read('/ng-openapi-gen.json')!.toString();

      // Second run
      updatedTree = apiSetup({})(updatedTree, context) as Tree;
      const secondPackageJson = JSON.parse(updatedTree.read('/package.json')!.toString());
      const secondConfig = updatedTree.read('/ng-openapi-gen.json')!.toString();

      // Verify nothing changed
      expect(secondPackageJson).toEqual(firstPackageJson);
      expect(secondConfig).toBe(firstConfig);

      // Verify logger messages indicate idempotency
      expect(context.logger.info).toHaveBeenCalledWith(expect.stringContaining('already'));
    });

    it('TC-API-06: handles missing package.json gracefully', () => {
      const tree = Tree.empty();

      const context = {
        addTask: vi.fn(),
        logger: { info: vi.fn(), warn: vi.fn() },
      } as never;

      // Should not throw
      expect(() => apiSetup({})(tree, context)).not.toThrow();

      expect(context.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not find package.json'),
      );
    });

    it('TC-API-07: preserves existing devDependencies', () => {
      const tree = Tree.empty();
      tree.create(
        '/package.json',
        JSON.stringify(
          {
            name: 'test-app',
            devDependencies: {
              typescript: '^5.0.0',
              '@angular/cli': '^21.0.0',
            },
          },
          null,
          2,
        ),
      );

      const context = {
        addTask: vi.fn(),
        logger: { info: vi.fn(), warn: vi.fn() },
      } as never;

      const updatedTree = apiSetup({})(tree, context) as Tree;
      const packageJson = JSON.parse(updatedTree.read('/package.json')!.toString());

      expect(packageJson.devDependencies.typescript).toBe('^5.0.0');
      expect(packageJson.devDependencies['@angular/cli']).toBe('^21.0.0');
      expect(packageJson.devDependencies['ng-openapi-gen']).toBeDefined();
    });

    it('TC-API-08: creates scripts object if it does not exist', () => {
      const tree = Tree.empty();
      tree.create(
        '/package.json',
        JSON.stringify(
          {
            name: 'test-app',
            version: '1.0.0',
          },
          null,
          2,
        ),
      );

      const context = {
        addTask: vi.fn(),
        logger: { info: vi.fn(), warn: vi.fn() },
      } as never;

      const updatedTree = apiSetup({})(tree, context) as Tree;
      const packageJson = JSON.parse(updatedTree.read('/package.json')!.toString());

      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts['generate:api']).toBe('ng-openapi-gen');
    });

    it('TC-API-09: generates Django integration helper artifacts', () => {
      const tree = Tree.empty();
      tree.create('/package.json', JSON.stringify({ name: 'test-app' }, null, 2));

      const context = {
        addTask: vi.fn(),
        logger: { info: vi.fn(), warn: vi.fn() },
      } as never;

      const updatedTree = apiSetup({})(tree, context) as Tree;

      expect(updatedTree.exists('/src/app/api-integration/django-transport.ts')).toBe(true);
      expect(updatedTree.exists('/src/app/api-integration/resource-adapter.ts')).toBe(true);
      expect(updatedTree.exists('/src/app/api-integration/index.ts')).toBe(true);
      expect(updatedTree.exists('/src/app/api-integration/django-transport.spec.ts')).toBe(true);
      expect(updatedTree.exists('/src/app/api-integration/resource-adapter.spec.ts')).toBe(true);
    });

    it('TC-API-10: transport helper exposes auth, CSRF, and transport composition points', () => {
      const tree = Tree.empty();
      tree.create('/package.json', JSON.stringify({ name: 'test-app' }, null, 2));

      const context = {
        addTask: vi.fn(),
        logger: { info: vi.fn(), warn: vi.fn() },
      } as never;

      const updatedTree = apiSetup({})(tree, context) as Tree;
      const transport = updatedTree
        .read('/src/app/api-integration/django-transport.ts')!
        .toString();

      expect(transport).toContain('export function provideDjangoApiTransport(');
      expect(transport).toContain('export function readCsrfCookie(');
      expect(transport).toContain('export const djangoAuthInterceptor');
      expect(transport).toContain('export function djangoCredentialsInterceptor(');
      expect(transport).toContain('export const DJANGO_AUTH_TOKEN');
      expect(transport).toContain('withXsrfConfiguration');
      expect(transport).toContain('withCredentials: true');
      expect(transport).toContain('Authorization: authorization');
    });

    it('TC-API-11: resource adapter helper exposes CRM CRUD composition points', () => {
      const tree = Tree.empty();
      tree.create('/package.json', JSON.stringify({ name: 'test-app' }, null, 2));

      const context = {
        addTask: vi.fn(),
        logger: { info: vi.fn(), warn: vi.fn() },
      } as never;

      const updatedTree = apiSetup({})(tree, context) as Tree;
      const adapter = updatedTree.read('/src/app/api-integration/resource-adapter.ts')!.toString();
      const barrel = updatedTree.read('/src/app/api-integration/index.ts')!.toString();

      expect(adapter).toContain('export interface PaginatedResult<T>');
      expect(adapter).toContain('export abstract class ResourceAdapter<');
      for (const method of ['list', 'retrieve', 'create', 'update', 'delete']) {
        expect(adapter).toContain(`abstract ${method}(`);
      }
      expect(adapter).toContain('catchError');
      expect(barrel).toContain("export * from './django-transport'");
      expect(barrel).toContain("export * from './resource-adapter'");
    });

    it('TC-API-12: honors custom helpersPath', () => {
      const tree = Tree.empty();
      tree.create('/package.json', JSON.stringify({ name: 'test-app' }, null, 2));

      const context = {
        addTask: vi.fn(),
        logger: { info: vi.fn(), warn: vi.fn() },
      } as never;

      const updatedTree = apiSetup({ helpersPath: 'src/app/core/api' })(tree, context) as Tree;

      expect(updatedTree.exists('/src/app/core/api/django-transport.ts')).toBe(true);
      expect(updatedTree.exists('/src/app/api-integration/django-transport.ts')).toBe(false);
    });

    it('TC-API-13: skipHelpers suppresses helper generation', () => {
      const tree = Tree.empty();
      tree.create('/package.json', JSON.stringify({ name: 'test-app' }, null, 2));

      const context = {
        addTask: vi.fn(),
        logger: { info: vi.fn(), warn: vi.fn() },
      } as never;

      const updatedTree = apiSetup({ skipHelpers: true })(tree, context) as Tree;

      expect(updatedTree.exists('/src/app/api-integration/django-transport.ts')).toBe(false);
      // Bootstrap artifacts are still generated.
      expect(updatedTree.exists('/ng-openapi-gen.json')).toBe(true);
    });

    it('TC-API-14: skipTests omits generated spec files', () => {
      const tree = Tree.empty();
      tree.create('/package.json', JSON.stringify({ name: 'test-app' }, null, 2));

      const context = {
        addTask: vi.fn(),
        logger: { info: vi.fn(), warn: vi.fn() },
      } as never;

      const updatedTree = apiSetup({ skipTests: true })(tree, context) as Tree;

      expect(updatedTree.exists('/src/app/api-integration/django-transport.ts')).toBe(true);
      expect(updatedTree.exists('/src/app/api-integration/django-transport.spec.ts')).toBe(false);
      expect(updatedTree.exists('/src/app/api-integration/resource-adapter.spec.ts')).toBe(false);
    });

    it('TC-API-15: helper generation is idempotent', () => {
      const tree = Tree.empty();
      tree.create('/package.json', JSON.stringify({ name: 'test-app' }, null, 2));

      const context = {
        addTask: vi.fn(),
        logger: { info: vi.fn(), warn: vi.fn() },
      } as never;

      let updatedTree = apiSetup({})(tree, context) as Tree;
      const firstContent = updatedTree
        .read('/src/app/api-integration/django-transport.ts')!
        .toString();

      updatedTree = apiSetup({})(updatedTree, context) as Tree;
      const secondContent = updatedTree
        .read('/src/app/api-integration/django-transport.ts')!
        .toString();

      expect(secondContent).toBe(firstContent);
    });
  });
});
