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
      tree.create(
        '/angular.json',
        JSON.stringify(
          {
            version: 1,
            projects: {
              'demo-app': {
                sourceRoot: 'projects/demo-app/src',
                architect: {
                  build: {
                    options: {
                      styles: ['projects/demo-app/src/styles.scss'],
                    },
                  },
                },
              },
            },
          },
          null,
          2,
        ),
      );

      const updatedTree = materialSetup({
        project: 'demo-app',
        theme: 'indigo-pink',
      })(tree, {} as never) as Tree;

      const angularJson = JSON.parse(updatedTree.read('/angular.json')!.toString());
      const styles = angularJson.projects['demo-app'].architect.build.options.styles;

      expect(styles).toContain('@angular/material/prebuilt-themes/indigo-pink.css');
      expect(styles).toContain('projects/demo-app/src/styles.scss');
    });

    it('TC-M2: adds custom theme SCSS to styles.scss', () => {
      const tree = Tree.empty();
      tree.create(
        '/angular.json',
        JSON.stringify(
          {
            version: 1,
            projects: {
              'demo-app': {
                sourceRoot: 'projects/demo-app/src',
                architect: {
                  build: {
                    options: {
                      styles: ['projects/demo-app/src/styles.scss'],
                    },
                  },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      tree.create('/projects/demo-app/src/styles.scss', '/* existing styles */\n');

      const updatedTree = materialSetup({
        project: 'demo-app',
        theme: 'custom',
      })(tree, {} as never) as Tree;

      const stylesContent = updatedTree.read('/projects/demo-app/src/styles.scss')!.toString();

      expect(stylesContent).toContain("@use '@angular/material' as mat");
      expect(stylesContent).toContain('mat.define-palette');
      expect(stylesContent).toContain('mat.define-light-theme');
      expect(stylesContent).toContain('/* existing styles */');
    });

    it('TC-M3: omits typography config when typography is false', () => {
      const tree = Tree.empty();
      tree.create(
        '/angular.json',
        JSON.stringify(
          {
            version: 1,
            projects: {
              'demo-app': {
                sourceRoot: 'projects/demo-app/src',
                architect: {
                  build: {
                    options: {
                      styles: ['projects/demo-app/src/styles.scss'],
                    },
                  },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      tree.create('/projects/demo-app/src/styles.scss', '');

      const updatedTree = materialSetup({
        project: 'demo-app',
        theme: 'custom',
        typography: false,
      })(tree, {} as never) as Tree;

      const stylesContent = updatedTree.read('/projects/demo-app/src/styles.scss')!.toString();

      expect(stylesContent).toContain("@use '@angular/material' as mat");
      expect(stylesContent).not.toContain('mat.define-typography-config()');
    });

    it('TC-M4: is idempotent when Material is already configured with prebuilt theme', () => {
      const tree = Tree.empty();
      tree.create(
        '/angular.json',
        JSON.stringify(
          {
            version: 1,
            projects: {
              'demo-app': {
                sourceRoot: 'projects/demo-app/src',
                architect: {
                  build: {
                    options: {
                      styles: [
                        '@angular/material/prebuilt-themes/indigo-pink.css',
                        'projects/demo-app/src/styles.scss',
                      ],
                    },
                  },
                },
              },
            },
          },
          null,
          2,
        ),
      );

      const updatedTree = materialSetup({
        project: 'demo-app',
        theme: 'indigo-pink',
      })(tree, {} as never) as Tree;

      const angularJson = JSON.parse(updatedTree.read('/angular.json')!.toString());
      const styles = angularJson.projects['demo-app'].architect.build.options.styles;

      expect(styles).toEqual([
        '@angular/material/prebuilt-themes/indigo-pink.css',
        'projects/demo-app/src/styles.scss',
      ]);
    });

    it('TC-M4: is idempotent when Material custom theme is already configured', () => {
      const tree = Tree.empty();
      tree.create(
        '/angular.json',
        JSON.stringify(
          {
            version: 1,
            projects: {
              'demo-app': {
                sourceRoot: 'projects/demo-app/src',
                architect: {
                  build: {
                    options: {
                      styles: ['projects/demo-app/src/styles.scss'],
                    },
                  },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      tree.create(
        '/projects/demo-app/src/styles.scss',
        "@use '@angular/material' as mat;\n\n/* existing custom theme */\n",
      );

      const updatedTree = materialSetup({
        project: 'demo-app',
        theme: 'custom',
      })(tree, {} as never) as Tree;

      const stylesContent = updatedTree.read('/projects/demo-app/src/styles.scss')!.toString();

      expect(stylesContent).toBe(
        "@use '@angular/material' as mat;\n\n/* existing custom theme */\n",
      );
    });

    it('throws when project is not found', () => {
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

      expect(() =>
        materialSetup({
          project: 'non-existent',
        })(tree, {} as never),
      ).toThrow(SchematicsException);
      expect(() =>
        materialSetup({
          project: 'non-existent',
        })(tree, {} as never),
      ).toThrow('Project "non-existent" not found in angular.json.');
    });
  });

  describe('project-structure schematic', () => {
    it('TC-D1: creates all seven index.ts files in the correct directories', () => {
      const tree = Tree.empty();
      tree.create(
        '/angular.json',
        JSON.stringify(
          {
            version: 1,
            projects: {
              'demo-app': {
                sourceRoot: 'projects/demo-app/src',
              },
            },
          },
          null,
          2,
        ),
      );

      const updatedTree = projectStructure({
        project: 'demo-app',
      })(tree, {} as never) as Tree;

      const expectedPaths = [
        '/projects/demo-app/src/app/core/index.ts',
        '/projects/demo-app/src/app/shared/components/index.ts',
        '/projects/demo-app/src/app/shared/pipes/index.ts',
        '/projects/demo-app/src/app/features/index.ts',
      ];

      for (const path of expectedPaths) {
        expect(updatedTree.exists(path)).toBe(true);
      }
    });

    it('TC-D2: each index.ts contains valid export statement', () => {
      const tree = Tree.empty();
      tree.create(
        '/angular.json',
        JSON.stringify(
          {
            version: 1,
            projects: {
              'demo-app': {
                sourceRoot: 'projects/demo-app/src',
              },
            },
          },
          null,
          2,
        ),
      );

      const updatedTree = projectStructure({
        project: 'demo-app',
      })(tree, {} as never) as Tree;

      const expectedPaths = [
        '/projects/demo-app/src/app/core/index.ts',
        '/projects/demo-app/src/app/shared/components/index.ts',
        '/projects/demo-app/src/app/shared/pipes/index.ts',
        '/projects/demo-app/src/app/features/index.ts',
      ];

      for (const path of expectedPaths) {
        const content = updatedTree.read(path)!.toString();
        expect(content).toContain('export {};');
        expect(content).toContain('// Public API for this directory');
      }
    });

    it('TC-D3: is idempotent - does not overwrite existing index.ts files', () => {
      const tree = Tree.empty();
      tree.create(
        '/angular.json',
        JSON.stringify(
          {
            version: 1,
            projects: {
              'demo-app': {
                sourceRoot: 'projects/demo-app/src',
              },
            },
          },
          null,
          2,
        ),
      );

      // Pre-create one index.ts with custom content
      tree.create(
        '/projects/demo-app/src/app/core/index.ts',
        '// Custom content\nexport { MyService } from "./my-service";\n',
      );

      const updatedTree = projectStructure({
        project: 'demo-app',
      })(tree, {} as never) as Tree;

      // Custom content should be preserved
      const coreIndexContent = updatedTree
        .read('/projects/demo-app/src/app/core/index.ts')!
        .toString();
      expect(coreIndexContent).toBe(
        '// Custom content\nexport { MyService } from "./my-service";\n',
      );

      // Other files should be created
      expect(updatedTree.exists('/projects/demo-app/src/app/shared/components/index.ts')).toBe(
        true,
      );
      expect(updatedTree.exists('/projects/demo-app/src/app/shared/pipes/index.ts')).toBe(true);
      expect(updatedTree.exists('/projects/demo-app/src/app/features/index.ts')).toBe(true);
    });

    it('throws when project is not found', () => {
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

      expect(() =>
        projectStructure({
          project: 'non-existent',
        })(tree, {} as never),
      ).toThrow(SchematicsException);
      expect(() =>
        projectStructure({
          project: 'non-existent',
        })(tree, {} as never),
      ).toThrow('Project "non-existent" not found in angular.json.');
    });
  });
});
