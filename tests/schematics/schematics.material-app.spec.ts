import type * as SchematicsModule from '@angular-devkit/schematics';
import { Tree, externalSchematic } from '@angular-devkit/schematics';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@angular-devkit/schematics', async () => {
  const actual = await vi.importActual<SchematicsModule>('@angular-devkit/schematics');

  return {
    ...actual,
    externalSchematic: vi.fn((collectionName, schematicName, options) => {
      void collectionName;
      void schematicName;
      void options;

      return (tree: Tree) => tree;
    }),
  };
});

import {
  addMaterialDependencies,
  generateMaterialLayout,
  materialApp,
  updateIndexHtmlWithMaterialIcons,
} from '../../projects/angular-django2/schematics/material-app/index';

describe('angular-django2 schematics', () => {
  const mockedExternalSchematic = vi.mocked(externalSchematic);

  beforeEach(() => {
    mockedExternalSchematic.mockClear();
  });

  afterEach(() => {
    mockedExternalSchematic.mockReset();
  });

  describe('material-app schematic', () => {
    it('passes Angular 22 application defaults when generating a missing project', () => {
      const tree = Tree.empty();
      tree.create(
        '/package.json',
        JSON.stringify({
          dependencies: {
            '@angular/core': '^22.0.0',
          },
        }),
      );
      tree.create(
        '/angular.json',
        JSON.stringify({
          version: 1,
          projects: {},
        }),
      );

      mockedExternalSchematic.mockImplementationOnce(() => (innerTree: Tree) => {
        const angularJson = JSON.parse(innerTree.read('/angular.json')!.toString());
        angularJson.projects['generated-app'] = {
          root: 'projects/generated-app',
          sourceRoot: 'projects/generated-app/src',
          architect: {
            build: {
              options: {
                styles: ['projects/generated-app/src/styles.scss'],
              },
            },
          },
        };
        innerTree.overwrite('/angular.json', JSON.stringify(angularJson, null, 2));
        innerTree.create(
          'projects/generated-app/src/app/app.component.ts',
          'export class AppComponent {}',
        );
        innerTree.create('projects/generated-app/src/app/app.component.html', '<div>Hello</div>');
        innerTree.create('projects/generated-app/src/app/app.component.scss', '');
        innerTree.create(
          'projects/generated-app/src/index.html',
          '<!doctype html>\n<html lang="en">\n  <head>\n  </head>\n  <body></body>\n</html>\n',
        );
        innerTree.create('projects/generated-app/src/styles.scss', '');
        innerTree.create(
          'projects/generated-app/src/app/app.config.ts',
          'export const appConfig = { providers: [] };',
        );

        return innerTree;
      });

      const context = {
        addTask: vi.fn(),
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      } as never;

      materialApp({ name: 'generated-app' })(tree, context);

      expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'application', {
        name: 'generated-app',
        routing: true,
        standalone: true,
        ssr: false,
        zoneless: true,
        style: 'scss',
        prefix: 'app',
      });
    });

    // The following tests exercise the underlying synchronous helpers directly
    // rather than the full composed `materialApp` Rule. Once `applyMaterialSetupRule`
    // delegates to sibling schematics via `chain()` + `externalSchematic`, the
    // composed Rule resolves asynchronously (chain() is `async`), so it can no
    // longer be invoked as a plain function and cast `as Tree` the way a unit
    // test would. Full end-to-end composed behavior (Material deps, layout
    // markup, directory structure all together) is covered by the real
    // schematics engine in tests/schematics.integration.spec.ts (INT-APP-01,
    // INT-APP-02) — mirrors how the `component` schematic's chain()+
    // externalSchematic() usage is unit-tested via its extracted pure helpers.

    it('TC-APP-01: adds Material dependencies and generates the sidenav layout', () => {
      const tree = Tree.empty();
      tree.create(
        '/package.json',
        JSON.stringify({
          dependencies: {
            '@angular/core': '^21.0.0',
          },
        }),
      );
      tree.create(
        '/angular.json',
        JSON.stringify({
          version: 1,
          projects: {
            'my-app': {
              root: 'projects/my-app',
              sourceRoot: 'projects/my-app/src',
              architect: {
                build: {
                  options: {
                    styles: ['projects/my-app/src/styles.scss'],
                  },
                },
              },
            },
          },
        }),
      );

      tree.create('projects/my-app/src/app/app.component.ts', 'export class AppComponent {}');
      tree.create('projects/my-app/src/app/app.component.html', '<div>Hello</div>');
      tree.create('projects/my-app/src/app/app.component.scss', '');
      tree.create(
        'projects/my-app/src/index.html',
        '<!doctype html>\n<html lang="en">\n  <head>\n  </head>\n  <body></body>\n</html>\n',
      );
      tree.create('projects/my-app/src/styles.scss', '');
      tree.create('projects/my-app/src/app/app.config.ts', 'export const appConfig = {};');

      const context = {
        addTask: vi.fn(),
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      } as never;

      addMaterialDependencies(tree, context);
      updateIndexHtmlWithMaterialIcons(tree, context, 'my-app');
      generateMaterialLayout(tree, context, 'my-app', 'scss');

      // Verify package.json was updated with Material dependencies
      const packageJson = JSON.parse(tree.read('/package.json')!.toString());
      expect(packageJson.dependencies['@angular/material']).toBeDefined();
      expect(packageJson.dependencies['@angular/cdk']).toBeDefined();

      // Verify Material layout was generated
      const appComponentHtml = tree.read('projects/my-app/src/app/app.component.html')!.toString();
      expect(appComponentHtml).toContain('mat-toolbar');
      expect(appComponentHtml).toContain('mat-sidenav-container');
      expect(appComponentHtml).toContain('router-outlet');

      // Verify app component TypeScript was updated
      const appComponentTs = tree.read('projects/my-app/src/app/app.component.ts')!.toString();
      expect(appComponentTs).toContain('MatToolbarModule');
      expect(appComponentTs).toContain('MatSidenavModule');

      // Verify Material Icons stylesheet is available for mat-icon ligatures
      const indexHtml = tree.read('projects/my-app/src/index.html')!.toString();
      expect(indexHtml).toContain(
        '<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />',
      );
      expect(indexHtml).toMatch(
        /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/icon\?family=Material\+Icons" \/>\n\s*<\/head>/,
      );
    });

    it('does not duplicate an existing Material Icons stylesheet link', () => {
      const tree = Tree.empty();
      tree.create(
        '/angular.json',
        JSON.stringify({
          version: 1,
          projects: {
            'my-app': {
              root: 'projects/my-app',
              sourceRoot: 'projects/my-app/src',
              architect: {
                build: {
                  options: {
                    styles: ['projects/my-app/src/styles.scss'],
                  },
                },
              },
            },
          },
        }),
      );

      tree.create(
        'projects/my-app/src/index.html',
        '<!doctype html>\n<html lang="en">\n  <head>\n    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />\n  </head>\n  <body></body>\n</html>\n',
      );

      const context = {
        addTask: vi.fn(),
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      } as never;

      updateIndexHtmlWithMaterialIcons(tree, context, 'my-app');
      const indexHtml = tree.read('projects/my-app/src/index.html')!.toString();

      expect(
        indexHtml.match(/https:\/\/fonts\.googleapis\.com\/icon\?family=Material\+Icons/g),
      ).toHaveLength(1);
    });

    it('TC-APP-02: uses the given project name when generating the layout', () => {
      const tree = Tree.empty();
      tree.create(
        '/angular.json',
        JSON.stringify({
          version: 1,
          projects: {
            'test-app': {
              root: 'projects/test-app',
              sourceRoot: 'projects/test-app/src',
              architect: {
                build: {
                  options: {
                    styles: ['projects/test-app/src/styles.scss'],
                  },
                },
              },
            },
          },
        }),
      );

      tree.create('projects/test-app/src/app/app.component.ts', 'export class AppComponent {}');
      tree.create('projects/test-app/src/app/app.component.html', '<div>Hello</div>');
      tree.create('projects/test-app/src/app/app.component.scss', '');

      const context = {
        addTask: vi.fn(),
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      } as never;

      generateMaterialLayout(tree, context, 'test-app', 'scss');

      const appComponentTs = tree.read('projects/test-app/src/app/app.component.ts')!.toString();
      expect(appComponentTs).toContain('test-app');
    });

    it('TC-APP-03: handles package.json gracefully when missing', () => {
      const tree = Tree.empty();

      const context = {
        addTask: vi.fn(),
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      } as never;

      // Should not throw
      expect(() => addMaterialDependencies(tree, context)).not.toThrow();

      expect(context.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not find package.json'),
      );
    });
  });
});
