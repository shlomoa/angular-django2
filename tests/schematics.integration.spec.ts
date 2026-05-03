/**
 * Integration tests for angular-django2 schematics
 * These tests exercise schematics in a fully integrated way using SchematicTestRunner
 */
import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, type UnitTestTree } from '@angular-devkit/schematics/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import * as path from 'path';

const collectionPath = path.join(__dirname, '../dist/angular-django2/schematics/collection.json');

describe('angular-django2 schematics integration tests', () => {
  let runner: SchematicTestRunner;
  let appTree: UnitTestTree;

  beforeEach(() => {
    runner = new SchematicTestRunner('angular-django2', collectionPath);
    appTree = Tree.empty() as UnitTestTree;
  });

  describe('ng-add schematic integration', () => {
    it('INT-01: successfully registers collection in a minimal workspace', async () => {
      // Create a minimal Angular workspace
      appTree.create(
        '/angular.json',
        JSON.stringify({
          version: 1,
          projects: {},
        }),
      );

      const tree = await runner.runSchematic('ng-add', {}, appTree);

      const angularJson = JSON.parse(tree.readContent('/angular.json'));
      expect(angularJson.cli).toBeDefined();
      expect(angularJson.cli.schematicCollections).toContain('angular-django2');
    });

    it('INT-02: successfully registers collection in workspace with existing collections', async () => {
      appTree.create(
        '/angular.json',
        JSON.stringify({
          version: 1,
          projects: {},
          cli: {
            schematicCollections: ['@schematics/angular'],
          },
        }),
      );

      const tree = await runner.runSchematic('ng-add', {}, appTree);

      const angularJson = JSON.parse(tree.readContent('/angular.json'));
      expect(angularJson.cli.schematicCollections).toEqual([
        'angular-django2',
        '@schematics/angular',
      ]);
    });

    it('INT-03: is idempotent - running twice produces same result', async () => {
      appTree.create(
        '/angular.json',
        JSON.stringify({
          version: 1,
          projects: {},
        }),
      );

      const tree1 = await runner.runSchematic('ng-add', {}, appTree);
      const tree2 = await runner.runSchematic('ng-add', {}, tree1);

      const angularJson = JSON.parse(tree2.readContent('/angular.json'));
      expect(angularJson.cli.schematicCollections).toEqual(['angular-django2']);
    });
  });

  describe('ng-api schematic integration', () => {
    beforeEach(() => {
      // Create minimal package.json
      appTree.create(
        '/package.json',
        JSON.stringify({
          name: 'test-app',
          version: '1.0.0',
          dependencies: {},
          devDependencies: {},
        }),
      );
    });

    it('INT-API-01: generates complete ng-openapi-gen configuration', async () => {
      const tree = await runner.runSchematic('ng-api', {}, appTree);

      // Verify package.json was updated
      const packageJson = JSON.parse(tree.readContent('/package.json'));
      expect(packageJson.devDependencies['ng-openapi-gen']).toBeDefined();
      expect(packageJson.scripts['generate:api']).toBe('ng-openapi-gen');

      // Verify config file was created
      expect(tree.files).toContain('/ng-openapi-gen.json');
      const config = JSON.parse(tree.readContent('/ng-openapi-gen.json'));
      expect(config.input).toBe('openapi.json');
      expect(config.output).toBe('src/app/api');
    });

    it('INT-API-02: handles custom paths correctly', async () => {
      const tree = await runner.runSchematic(
        'ng-api',
        {
          inputPath: 'custom/schema.json',
          outputPath: 'src/generated',
        },
        appTree,
      );

      const config = JSON.parse(tree.readContent('/ng-openapi-gen.json'));
      expect(config.input).toBe('custom/schema.json');
      expect(config.output).toBe('src/generated');
    });

    it('INT-API-03: preserves existing package.json content', async () => {
      appTree.overwrite(
        '/package.json',
        JSON.stringify({
          name: 'test-app',
          version: '2.0.0',
          dependencies: {
            '@angular/core': '^21.0.0',
          },
          devDependencies: {
            typescript: '^5.0.0',
          },
          scripts: {
            test: 'ng test',
          },
        }),
      );

      const tree = await runner.runSchematic('ng-api', {}, appTree);

      const packageJson = JSON.parse(tree.readContent('/package.json'));
      expect(packageJson.version).toBe('2.0.0');
      expect(packageJson.dependencies['@angular/core']).toBe('^21.0.0');
      expect(packageJson.devDependencies.typescript).toBe('^5.0.0');
      expect(packageJson.scripts.test).toBe('ng test');
      expect(packageJson.devDependencies['ng-openapi-gen']).toBeDefined();
      expect(packageJson.scripts['generate:api']).toBe('ng-openapi-gen');
    });
  });

  describe('material-setup schematic integration', () => {
    beforeEach(() => {
      appTree.create(
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
      appTree.create('projects/test-app/src/styles.scss', '/* existing styles */\n');
      appTree.create(
        'projects/test-app/src/app/app.config.ts',
        `import { ApplicationConfig } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: []
};
`,
      );
    });

    it('INT-MAT-01: configures Material with prebuilt theme', async () => {
      const tree = await runner.runSchematic(
        'material-setup',
        {
          project: 'test-app',
          theme: 'indigo-pink',
          typography: true,
          animations: true,
        },
        appTree,
      );

      const angularJson = JSON.parse(tree.readContent('/angular.json'));
      const styles = angularJson.projects['test-app'].architect.build.options.styles;
      expect(styles).toContain('@angular/material/prebuilt-themes/indigo-pink.css');

      const stylesContent = tree.readContent('projects/test-app/src/styles.scss');
      expect(stylesContent).toContain('Angular Material theme is loaded via angular.json');

      const appConfigContent = tree.readContent('projects/test-app/src/app/app.config.ts');
      expect(appConfigContent).toContain('provideAnimations()');
      expect(appConfigContent).not.toContain('MatNativeDateModule');
    });

    it('INT-MAT-02: configures Material with custom theme', async () => {
      const tree = await runner.runSchematic(
        'material-setup',
        {
          project: 'test-app',
          theme: 'custom',
          typography: true,
          animations: true,
        },
        appTree,
      );

      const stylesContent = tree.readContent('projects/test-app/src/styles.scss');
      expect(stylesContent).toContain("@use '@angular/material' as mat");
      expect(stylesContent).toContain('mat.define-palette');
      expect(stylesContent).toContain('mat.define-light-theme');
      expect(stylesContent).toContain('mat.all-component-themes');
    });
  });

  describe('project-structure schematic integration', () => {
    beforeEach(() => {
      appTree.create(
        '/angular.json',
        JSON.stringify({
          version: 1,
          projects: {
            'test-app': {
              root: 'projects/test-app',
              sourceRoot: 'projects/test-app/src',
            },
          },
        }),
      );
    });

    it('INT-STRUCT-01: creates complete directory structure', async () => {
      const tree = await runner.runSchematic(
        'project-structure',
        {
          project: 'test-app',
          prefix: 'app',
        },
        appTree,
      );

      const expectedFiles = [
        '/projects/test-app/src/app/core/index.ts',
        '/projects/test-app/src/app/shared/index.ts',
        '/projects/test-app/src/app/shared/components/index.ts',
        '/projects/test-app/src/app/shared/pipes/index.ts',
        '/projects/test-app/src/app/features/index.ts',
      ];

      for (const filePath of expectedFiles) {
        expect(tree.files).toContain(filePath);
        const content = tree.readContent(filePath);
        expect(content).toContain('Public API for this directory');
      }
    });

    it('INT-STRUCT-02: preserves existing barrel file content', async () => {
      appTree.create(
        'projects/test-app/src/app/core/index.ts',
        '// Custom exports\nexport { MyService } from "./my.service";\n',
      );

      const tree = await runner.runSchematic(
        'project-structure',
        {
          project: 'test-app',
          prefix: 'app',
        },
        appTree,
      );

      const coreIndex = tree.readContent('/projects/test-app/src/app/core/index.ts');
      expect(coreIndex).toContain('MyService');
      expect(coreIndex).toContain('Custom exports');
    });
  });

  describe('ng-app schematic integration', () => {
    beforeEach(() => {
      appTree.create(
        '/package.json',
        JSON.stringify({
          name: 'test-workspace',
          dependencies: {
            '@angular/core': '^21.0.0',
          },
        }),
      );
      appTree.create(
        '/angular.json',
        JSON.stringify({
          version: 1,
          projects: {},
        }),
      );
    });

    /**
     * Helper function to create the minimal project structure that would be
     * generated by @schematics/angular:application schematic.
     * This simulates the external schematic's output in the test environment.
     */
    function createMinimalProjectStructure(tree: UnitTestTree, projectName: string): void {
      // Update angular.json to include the new project
      const angularJson = JSON.parse(tree.read('/angular.json')!.toString());
      angularJson.projects[projectName] = {
        projectType: 'application',
        root: `projects/${projectName}`,
        sourceRoot: `projects/${projectName}/src`,
        architect: {
          build: {
            options: {
              styles: [`projects/${projectName}/src/styles.scss`],
            },
          },
        },
      };
      tree.overwrite('/angular.json', JSON.stringify(angularJson, null, 2));

      // Create minimal app files that ng-app schematic expects
      tree.create(
        `projects/${projectName}/src/app/app.component.ts`,
        'export class AppComponent {}',
      );
      tree.create(`projects/${projectName}/src/app/app.component.html`, '<div>Hello</div>');
      tree.create(`projects/${projectName}/src/app/app.component.scss`, '');
      tree.create(`projects/${projectName}/src/styles.scss`, '');
      tree.create(
        `projects/${projectName}/src/app/app.config.ts`,
        `import { ApplicationConfig } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: []
};
`,
      );
    }

    it('INT-APP-01: generates complete application with Material setup', async () => {
      // Note: This test validates the integration of multiple schematics
      // The ng-app schematic calls externalSchematic for application generation,
      // but in tests we need to mock that part by pre-creating the structure

      // Pre-create the project structure that would be generated by @schematics/angular:application
      createMinimalProjectStructure(appTree, 'demo-app');

      const tree = await runner.runSchematic(
        'ng-app',
        {
          name: 'demo-app',
          theme: 'indigo-pink',
          typography: true,
          animations: true,
          routing: true,
          standalone: true,
          style: 'scss',
          prefix: 'app',
        },
        appTree,
      );

      // Verify package.json was updated with Material dependencies
      const packageJson = JSON.parse(tree.readContent('/package.json'));
      expect(packageJson.dependencies['@angular/material']).toBeDefined();
      expect(packageJson.dependencies['@angular/cdk']).toBeDefined();

      // Verify angular.json has the project
      const angularJson = JSON.parse(tree.readContent('/angular.json'));
      expect(angularJson.projects['demo-app']).toBeDefined();

      // Verify Material theme is configured
      const styles = angularJson.projects['demo-app'].architect.build.options.styles;
      expect(styles).toContain('@angular/material/prebuilt-themes/indigo-pink.css');

      const appConfigContent = tree.readContent('/projects/demo-app/src/app/app.config.ts');
      expect(appConfigContent).toContain('provideAnimations()');
      expect(appConfigContent).not.toContain('MatNativeDateModule');

      // Verify app component was generated with Material
      const appComponentTs = tree.readContent('/projects/demo-app/src/app/app.component.ts');
      expect(appComponentTs).toContain('MatToolbarModule');
      expect(appComponentTs).toContain('MatSidenavModule');

      const appComponentHtml = tree.readContent('/projects/demo-app/src/app/app.component.html');
      expect(appComponentHtml).toContain('mat-toolbar');
      expect(appComponentHtml).toContain('mat-sidenav-container');
      expect(appComponentHtml).toContain('router-outlet');

      // Verify project structure was created
      expect(tree.files).toContain('/projects/demo-app/src/app/core/index.ts');
      expect(tree.files).toContain('/projects/demo-app/src/app/features/index.ts');
    });

    it('INT-APP-02: handles custom configuration options', async () => {
      // Pre-create the project structure
      createMinimalProjectStructure(appTree, 'custom-app');

      const tree = await runner.runSchematic(
        'ng-app',
        {
          name: 'custom-app',
          theme: 'custom',
          typography: false,
          animations: false,
          routing: true,
          standalone: true,
          style: 'css',
          prefix: 'custom',
        },
        appTree,
      );

      // Verify custom theme in styles.scss
      const stylesContent = tree.readContent('/projects/custom-app/src/styles.scss');
      expect(stylesContent).toContain("@use '@angular/material' as mat");
      expect(stylesContent).toContain('typography: null');

      // Verify app config has noopAnimations
      const appConfigContent = tree.readContent('/projects/custom-app/src/app/app.config.ts');
      expect(appConfigContent).toContain('provideNoopAnimations');
      expect(appConfigContent).not.toContain('MatNativeDateModule');
    });
  });

  describe('schematic chaining integration', () => {
    it('INT-CHAIN-01: ng-add followed by ng-api works correctly', async () => {
      appTree.create(
        '/angular.json',
        JSON.stringify({
          version: 1,
          projects: {},
        }),
      );
      appTree.create(
        '/package.json',
        JSON.stringify({
          name: 'test-app',
          dependencies: {},
        }),
      );

      // First run ng-add
      const tree1 = await runner.runSchematic('ng-add', {}, appTree);

      // Then run ng-api
      const tree2 = await runner.runSchematic('ng-api', {}, tree1);

      // Verify both schematics executed successfully
      const angularJson = JSON.parse(tree2.readContent('/angular.json'));
      expect(angularJson.cli.schematicCollections).toContain('angular-django2');

      const packageJson = JSON.parse(tree2.readContent('/package.json'));
      expect(packageJson.devDependencies['ng-openapi-gen']).toBeDefined();
    });

    it('INT-CHAIN-02: multiple schematic runs maintain consistency', async () => {
      appTree.create(
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
      appTree.create('projects/test-app/src/styles.scss', '/* styles */\n');

      // Run material-setup
      const tree1 = await runner.runSchematic(
        'material-setup',
        {
          project: 'test-app',
          theme: 'indigo-pink',
          typography: true,
          animations: true,
        },
        appTree,
      );

      // Run project-structure
      const tree2 = await runner.runSchematic(
        'project-structure',
        {
          project: 'test-app',
          prefix: 'app',
        },
        tree1,
      );

      // Verify both completed successfully
      const angularJson = JSON.parse(tree2.readContent('/angular.json'));
      const styles = angularJson.projects['test-app'].architect.build.options.styles;
      expect(styles).toContain('@angular/material/prebuilt-themes/indigo-pink.css');

      expect(tree2.files).toContain('/projects/test-app/src/app/core/index.ts');
    });
  });
});
