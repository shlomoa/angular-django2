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
import { materialSetup } from '../projects/angular-django2/schematics/material-setup/index';
import { ngAdd } from '../projects/angular-django2/schematics/ng-add/index';
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
          'test-app': {},
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
          'test-app': {},
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
          'test-app': {},
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
});
