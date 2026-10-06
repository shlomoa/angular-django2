import { Tree, SchematicsException } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import { materialSetup } from 'angular-django2/schematics/material-setup/index';
import { projectStructure } from 'angular-django2/schematics/project-structure/index';
import { createSchematicContext } from './schematics.helpers';

describe('angular-django2 schematics', () => {
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
      })(tree, createSchematicContext()) as Tree;

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
      })(tree, createSchematicContext()) as Tree;

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
      })(tree, createSchematicContext()) as Tree;

      const stylesContent = updatedTree.read('projects/test-app/src/styles.scss')!.toString();

      expect(stylesContent).toContain('typography: null');
      expect(stylesContent).not.toContain('mat.define-typography-config()');
    });

    it.each([
      'indigo-pink',
      'deeppurple-amber',
      'pink-bluegrey',
      'purple-green',
      'custom',
    ] as const)('TC-M4: is idempotent - does not duplicate styles when run twice (%s)', (theme) => {
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
      const run = (input: Tree): Tree =>
        materialSetup({
          project: 'test-app',
          theme,
          typography: true,
          animations: true,
        })(input, createSchematicContext()) as Tree;
      const stylesPath = 'projects/test-app/src/styles.scss';

      const firstTree = run(tree);
      const firstStyles = firstTree.read(stylesPath)!.toString();
      const firstAngularJson = firstTree.read('/angular.json')!.toString();

      const secondTree = run(firstTree);

      expect(secondTree.read(stylesPath)!.toString()).toBe(firstStyles);
      expect(secondTree.read('/angular.json')!.toString()).toBe(firstAngularJson);

      if (theme !== 'custom') {
        const styles = JSON.parse(secondTree.read('/angular.json')!.toString()).projects['test-app']
          .architect.build.options.styles;
        const themeCount = styles.filter(
          (s: string) => s === `@angular/material/prebuilt-themes/${theme}.css`,
        ).length;
        expect(themeCount).toBe(1);
      }
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
        })(tree, createSchematicContext()),
      ).toThrow(SchematicsException);
      expect(() =>
        materialSetup({
          project: 'nonexistent',
          theme: 'indigo-pink',
          typography: true,
          animations: true,
        })(tree, createSchematicContext()),
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
      })(tree, createSchematicContext()) as Tree;

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
      })(tree, createSchematicContext()) as Tree;

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
      })(tree, createSchematicContext()) as Tree;

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
        })(tree, createSchematicContext()),
      ).toThrow(SchematicsException);
      expect(() =>
        projectStructure({
          project: 'nonexistent',
          prefix: 'app',
        })(tree, createSchematicContext()),
      ).toThrow('Project "nonexistent" not found');
    });
  });
});
