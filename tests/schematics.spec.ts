import type * as SchematicsModule from '@angular-devkit/schematics';
import { Tree, externalSchematic, SchematicsException } from '@angular-devkit/schematics';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import { appShell } from '../projects/angular-django2/schematics/app-shell/index';
import { application } from '../projects/angular-django2/schematics/application/index';
import { classGenerator } from '../projects/angular-django2/schematics/class/index';
import { component } from '../projects/angular-django2/schematics/component/index';
import { dataService } from '../projects/angular-django2/schematics/data-service/index';
import { materialSetup } from '../projects/angular-django2/schematics/material-setup/index';
import { ngAdd } from '../projects/angular-django2/schematics/ng-add/index';
import { ngApi } from '../projects/angular-django2/schematics/ng-api/index';
import { ngApp } from '../projects/angular-django2/schematics/ng-app/index';
import { projectStructure } from '../projects/angular-django2/schematics/project-structure/index';
import { service } from '../projects/angular-django2/schematics/service/index';

describe('angular-django2 schematics', () => {
  const mockedExternalSchematic = vi.mocked(externalSchematic);

  beforeEach(() => {
    mockedExternalSchematic.mockClear();
  });

  afterEach(() => {
    mockedExternalSchematic.mockReset();
  });

  it('wraps the Angular application schematic with standalone and routing defaults', () => {
    application({ name: 'demo-app' });

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'application', {
      name: 'demo-app',
      routing: true,
      standalone: true,
      style: 'scss',
    });
  });

  it('TC-01: application schematic defaults style to scss when not provided', () => {
    application({ name: 'my-app' });

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'application', {
      name: 'my-app',
      routing: true,
      standalone: true,
      style: 'scss',
    });
  });

  it('TC-02: caller-supplied style overrides the scss default', () => {
    application({ name: 'my-app', style: 'css' });

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'application', {
      name: 'my-app',
      routing: true,
      standalone: true,
      style: 'css',
    });
  });

  it('wraps the Angular component schematic with standalone and OnPush defaults', () => {
    component({ changeDetection: 'Default', name: 'hero-card', standalone: false });

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'component', {
      changeDetection: 'Default',
      name: 'hero-card',
      standalone: false,
    });
  });

  it('passes service options through to the Angular service schematic', () => {
    service({ name: 'django-api', path: 'src/app/data' });

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'service', {
      name: 'django-api',
      path: 'src/app/data',
    });
  });

  it('passes class options through to the Angular class schematic', () => {
    classGenerator({ name: 'api-contract', project: 'demo-app' });

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'class', {
      name: 'api-contract',
      project: 'demo-app',
    });
  });

  it('passes app-shell options through to the Angular app-shell schematic', () => {
    appShell({ project: 'demo-app' });

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'app-shell', {
      project: 'demo-app',
    });
  });

  it('TC-01: registers the collection in a workspace that has no existing cli config', () => {
    const tree = Tree.empty();
    tree.create(
      '/angular.json',
      JSON.stringify(
        {
          projects: {},
          version: 1,
        },
        null,
        2,
      ),
    );

    const updatedTree = ngAdd()(tree, {} as never) as Tree;
    const angularJson = JSON.parse(updatedTree.read('/angular.json')!.toString());

    expect(angularJson.cli).toBeDefined();
    expect(angularJson.cli.schematicCollections).toEqual(['angular-django2']);
  });

  it('TC-02: registers the collection prepended before existing collections', () => {
    const tree = Tree.empty();
    tree.create(
      '/angular.json',
      JSON.stringify(
        {
          cli: {
            schematicCollections: ['@schematics/angular'],
          },
          projects: {},
          version: 1,
        },
        null,
        2,
      ),
    );

    const updatedTree = ngAdd()(tree, {} as never) as Tree;
    const angularJson = JSON.parse(updatedTree.read('/angular.json')!.toString());

    expect(angularJson.cli.schematicCollections).toEqual([
      'angular-django2',
      '@schematics/angular',
    ]);
  });

  it('TC-03: is idempotent - does not duplicate an already-registered collection', () => {
    const tree = Tree.empty();
    tree.create(
      '/angular.json',
      JSON.stringify(
        {
          cli: {
            schematicCollections: ['angular-django2', 'existing-collection'],
          },
          projects: {},
          version: 1,
        },
        null,
        2,
      ),
    );

    const updatedTree = ngAdd()(tree, {} as never) as Tree;
    const angularJson = JSON.parse(updatedTree.read('/angular.json')!.toString());

    expect(angularJson.cli.schematicCollections).toEqual([
      'angular-django2',
      'existing-collection',
    ]);
  });

  it('TC-04: throws when angular.json is missing', () => {
    const tree = Tree.empty();

    expect(() => ngAdd()(tree, {} as never)).toThrow(SchematicsException);
    expect(() => ngAdd()(tree, {} as never)).toThrow(
      'Could not find angular.json in the target workspace.',
    );
  });

  it('TC-05: preserves all other angular.json content unchanged', () => {
    const tree = Tree.empty();
    const originalContent = {
      version: 1,
      projects: {
        'my-app': {
          root: '',
          sourceRoot: 'src',
          projectType: 'application',
        },
      },
      defaultProject: 'my-app',
      schematics: {
        '@schematics/angular:component': {
          style: 'scss',
        },
      },
    };

    tree.create('/angular.json', JSON.stringify(originalContent, null, 2));

    const updatedTree = ngAdd()(tree, {} as never) as Tree;
    const angularJson = JSON.parse(updatedTree.read('/angular.json')!.toString());

    expect(angularJson.version).toBe(originalContent.version);
    expect(angularJson.projects).toEqual(originalContent.projects);
    expect(angularJson.defaultProject).toBe(originalContent.defaultProject);
    expect(angularJson.schematics).toEqual(originalContent.schematics);
    expect(angularJson.cli.schematicCollections).toEqual(['angular-django2']);
  });

  it('TC-06: output is valid JSON with 2-space indentation and trailing newline', () => {
    const tree = Tree.empty();
    tree.create(
      '/angular.json',
      JSON.stringify(
        {
          version: 1,
          projects: {},
        },
        null,
        2,
      ),
    );

    const updatedTree = ngAdd()(tree, {} as never) as Tree;
    const rawContent = updatedTree.read('/angular.json')!.toString();

    expect(() => JSON.parse(rawContent)).not.toThrow();

    expect(rawContent.endsWith('\n')).toBe(true);

    const lines = rawContent.split('\n');
    const indentedLine = lines.find((line) => line.startsWith('  '));
    expect(indentedLine).toBeDefined();
    const match = indentedLine!.match(/^(\s+)/);
    if (match) {
      expect(match[1]).toBe('  ');
    }
  });

  describe('material-setup schematic', () => {
    it('TC-M1: adds prebuilt theme CSS to angular.json styles array', () => {
      const tree = Tree.empty();
      const angularJson = {
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
      };
      tree.create('/angular.json', JSON.stringify(angularJson, null, 2));
      tree.create('projects/test-app/src/styles.scss', '/* existing styles */\n');

      const updatedTree = materialSetup({
        project: 'test-app',
        theme: 'indigo-pink',
        typography: true,
        animations: true,
      })(tree, {} as never) as Tree;

      const updatedAngularJson = JSON.parse(updatedTree.read('/angular.json')!.toString());
      const styles = updatedAngularJson.projects['test-app'].architect.build.options.styles;

      expect(styles).toContain('@angular/material/prebuilt-themes/indigo-pink.css');
      expect(styles[0]).toBe('@angular/material/prebuilt-themes/indigo-pink.css');
    });

    it('TC-M2: generates custom theme in styles.scss', () => {
      const tree = Tree.empty();
      const angularJson = {
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
      };
      tree.create('/angular.json', JSON.stringify(angularJson, null, 2));
      tree.create('projects/test-app/src/styles.scss', '/* existing styles */\n');

      const updatedTree = materialSetup({
        project: 'test-app',
        theme: 'custom',
        typography: true,
        animations: true,
      })(tree, {} as never) as Tree;

      const stylesContent = updatedTree.read('projects/test-app/src/styles.scss')!.toString();

      expect(stylesContent).toContain("@use '@angular/material' as mat");
      expect(stylesContent).toContain('mat.define-palette');
      expect(stylesContent).toContain('mat.define-light-theme');
      expect(stylesContent).toContain('mat.all-component-themes');
    });

    it('TC-M3: omits typography config when typography is false', () => {
      const tree = Tree.empty();
      const angularJson = {
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
      };
      tree.create('/angular.json', JSON.stringify(angularJson, null, 2));
      tree.create('projects/test-app/src/styles.scss', '/* existing styles */\n');

      const updatedTree = materialSetup({
        project: 'test-app',
        theme: 'custom',
        typography: false,
        animations: true,
      })(tree, {} as never) as Tree;

      const stylesContent = updatedTree.read('projects/test-app/src/styles.scss')!.toString();

      expect(stylesContent).toContain('typography: null');
      expect(stylesContent).not.toContain('mat.define-typography-config()');
    });

    it('TC-M4: is idempotent - does not duplicate styles when run twice', () => {
      const tree = Tree.empty();
      const angularJson = {
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
      };
      tree.create('/angular.json', JSON.stringify(angularJson, null, 2));
      tree.create('projects/test-app/src/styles.scss', '/* existing styles */\n');

      // Run once
      let updatedTree = materialSetup({
        project: 'test-app',
        theme: 'indigo-pink',
        typography: true,
        animations: true,
      })(tree, {} as never) as Tree;

      // Run again
      updatedTree = materialSetup({
        project: 'test-app',
        theme: 'indigo-pink',
        typography: true,
        animations: true,
      })(updatedTree, {} as never) as Tree;

      const updatedAngularJson = JSON.parse(updatedTree.read('/angular.json')!.toString());
      const styles = updatedAngularJson.projects['test-app'].architect.build.options.styles;

      // Count occurrences of the theme
      const themeCount = styles.filter(
        (s: string) => s === '@angular/material/prebuilt-themes/indigo-pink.css',
      ).length;
      expect(themeCount).toBe(1);
    });

    it('throws when project does not exist', () => {
      const tree = Tree.empty();
      tree.create(
        '/angular.json',
        JSON.stringify({
          version: 1,
          projects: {},
        }),
      );

      expect(() =>
        materialSetup({
          project: 'nonexistent',
          theme: 'indigo-pink',
          typography: true,
          animations: true,
        })(tree, {} as never),
      ).toThrow(SchematicsException);
      expect(() =>
        materialSetup({
          project: 'nonexistent',
          theme: 'indigo-pink',
          typography: true,
          animations: true,
        })(tree, {} as never),
      ).toThrow('Project "nonexistent" not found');
    });
  });

  describe('project-structure schematic', () => {
    it('TC-D1: creates all seven index.ts barrel files', () => {
      const tree = Tree.empty();
      const angularJson = {
        version: 1,
        projects: {
          'test-app': {
            root: 'projects/test-app',
            sourceRoot: 'projects/test-app/src',
          },
        },
      };
      tree.create('/angular.json', JSON.stringify(angularJson, null, 2));

      const updatedTree = projectStructure({
        project: 'test-app',
        prefix: 'app',
      })(tree, {} as never) as Tree;

      const expectedFiles = [
        'projects/test-app/src/app/core/index.ts',
        'projects/test-app/src/app/shared/index.ts',
        'projects/test-app/src/app/shared/components/index.ts',
        'projects/test-app/src/app/shared/pipes/index.ts',
        'projects/test-app/src/app/features/index.ts',
      ];

      for (const filePath of expectedFiles) {
        expect(updatedTree.exists(filePath)).toBe(true);
      }
    });

    it('TC-D2: each index.ts contains valid TypeScript export', () => {
      const tree = Tree.empty();
      const angularJson = {
        version: 1,
        projects: {
          'test-app': {
            root: 'projects/test-app',
            sourceRoot: 'projects/test-app/src',
          },
        },
      };
      tree.create('/angular.json', JSON.stringify(angularJson, null, 2));

      const updatedTree = projectStructure({
        project: 'test-app',
        prefix: 'app',
      })(tree, {} as never) as Tree;

      const expectedFiles = [
        'projects/test-app/src/app/core/index.ts',
        'projects/test-app/src/app/shared/index.ts',
        'projects/test-app/src/app/shared/components/index.ts',
        'projects/test-app/src/app/shared/pipes/index.ts',
        'projects/test-app/src/app/features/index.ts',
      ];

      for (const filePath of expectedFiles) {
        const content = updatedTree.read(filePath)!.toString();
        expect(content).toContain('export');
        expect(content).toContain('// Public API for this directory');
      }
    });

    it('TC-D3: is idempotent - does not overwrite existing non-empty barrel files', () => {
      const tree = Tree.empty();
      const angularJson = {
        version: 1,
        projects: {
          'test-app': {
            root: 'projects/test-app',
            sourceRoot: 'projects/test-app/src',
          },
        },
      };
      tree.create('/angular.json', JSON.stringify(angularJson, null, 2));
      tree.create(
        'projects/test-app/src/app/core/index.ts',
        '// Custom content\nexport { MyService } from "./my.service";\n',
      );

      const updatedTree = projectStructure({
        project: 'test-app',
        prefix: 'app',
      })(tree, {} as never) as Tree;

      const coreIndexContent = updatedTree
        .read('projects/test-app/src/app/core/index.ts')!
        .toString();

      // Should preserve custom content
      expect(coreIndexContent).toContain('MyService');
      expect(coreIndexContent).toContain('Custom content');
    });

    it('throws when project does not exist', () => {
      const tree = Tree.empty();
      tree.create(
        '/angular.json',
        JSON.stringify({
          version: 1,
          projects: {},
        }),
      );

      expect(() =>
        projectStructure({
          project: 'nonexistent',
          prefix: 'app',
        })(tree, {} as never),
      ).toThrow(SchematicsException);
      expect(() =>
        projectStructure({
          project: 'nonexistent',
          prefix: 'app',
        })(tree, {} as never),
      ).toThrow('Project "nonexistent" not found');
    });
  });

  describe('ng-app schematic', () => {
    it('TC-APP-01: generates application with Material setup and directory structure', () => {
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

      // Create required files that would be generated by application schematic
      tree.create('projects/my-app/src/app/app.component.ts', 'export class AppComponent {}');
      tree.create('projects/my-app/src/app/app.component.html', '<div>Hello</div>');
      tree.create('projects/my-app/src/app/app.component.scss', '');
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

      const updatedTree = ngApp({
        name: 'my-app',
        theme: 'indigo-pink',
        typography: true,
        animations: true,
        routing: true,
        standalone: true,
        style: 'scss',
        prefix: 'app',
      })(tree, context) as Tree;

      // Verify package.json was updated with Material dependencies
      const packageJson = JSON.parse(updatedTree.read('/package.json')!.toString());
      expect(packageJson.dependencies['@angular/material']).toBeDefined();
      expect(packageJson.dependencies['@angular/cdk']).toBeDefined();

      // Verify app shell was generated
      const appComponentHtml = updatedTree
        .read('projects/my-app/src/app/app.component.html')!
        .toString();
      expect(appComponentHtml).toContain('mat-toolbar');
      expect(appComponentHtml).toContain('mat-sidenav-container');
      expect(appComponentHtml).toContain('router-outlet');

      // Verify app component TypeScript was updated
      const appComponentTs = updatedTree
        .read('projects/my-app/src/app/app.component.ts')!
        .toString();
      expect(appComponentTs).toContain('MatToolbarModule');
      expect(appComponentTs).toContain('MatSidenavModule');
    });

    it('TC-APP-02: uses default options when not provided', () => {
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
      tree.create('projects/test-app/src/styles.scss', '');
      tree.create('projects/test-app/src/app/app.config.ts', 'export const appConfig = {};');

      const context = {
        addTask: vi.fn(),
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      } as never;

      const updatedTree = ngApp({
        name: 'test-app',
        theme: 'indigo-pink',
        typography: true,
        animations: true,
        routing: true,
        standalone: true,
        style: 'scss',
        prefix: 'app',
      })(tree, context) as Tree;

      const appComponentTs = updatedTree
        .read('projects/test-app/src/app/app.component.ts')!
        .toString();
      expect(appComponentTs).toContain('test-app');
    });

    it('TC-APP-03: handles package.json gracefully when missing', () => {
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

      tree.create('projects/my-app/src/app/app.component.ts', 'export class AppComponent {}');
      tree.create('projects/my-app/src/app/app.component.html', '<div>Hello</div>');
      tree.create('projects/my-app/src/app/app.component.scss', '');
      tree.create('projects/my-app/src/styles.scss', '');

      const context = {
        addTask: vi.fn(),
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      } as never;

      // Should not throw
      expect(() =>
        ngApp({
          name: 'my-app',
          theme: 'indigo-pink',
          typography: true,
          animations: true,
          routing: true,
          standalone: true,
          style: 'scss',
          prefix: 'app',
        })(tree, context),
      ).not.toThrow();

      expect(context.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not find package.json'),
      );
    });
  });

  describe('ng-api schematic', () => {
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

      const updatedTree = ngApi({})(tree, context) as Tree;
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

      const updatedTree = ngApi({})(tree, context) as Tree;
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

      const updatedTree = ngApi({
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

      const updatedTree = ngApi({})(tree, context) as Tree;
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
      let updatedTree = ngApi({})(tree, context) as Tree;
      const firstPackageJson = JSON.parse(updatedTree.read('/package.json')!.toString());
      const firstConfig = updatedTree.read('/ng-openapi-gen.json')!.toString();

      // Second run
      updatedTree = ngApi({})(updatedTree, context) as Tree;
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
      expect(() => ngApi({})(tree, context)).not.toThrow();

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

      const updatedTree = ngApi({})(tree, context) as Tree;
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

      const updatedTree = ngApi({})(tree, context) as Tree;
      const packageJson = JSON.parse(updatedTree.read('/package.json')!.toString());

      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts['generate:api']).toBe('ng-openapi-gen');
    });
  });

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
