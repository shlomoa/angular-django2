import { Tree, SchematicsException } from '@angular-devkit/schematics';
import type { vi } from 'vitest';
import { describe, expect, it } from 'vitest';

import { workspaceSetup } from '../../projects/angular-django2/schematics/workspace-setup/index';
import { createMockContext, workspaceReadme, workspaceReadmePath } from './schematics.helpers';

describe('angular-django2 schematics', () => {
  it('TC-WS-01: writes workspace bootstrap files for the requested app name', () => {
    const tree = Tree.empty();

    const updatedTree = workspaceSetup({ name: 'demo-app' })(tree, createMockContext()) as Tree;

    expect(updatedTree.read('/.github/copilot-instructions.md')!.toString())
      .toBe(`# demo-app Repo Instructions

Read [these instructions first](https://github.com/shlomoa/internal/blob/main/github/copilot-instructions.md)

---
`);
    expect(updatedTree.read('/README.md')!.toString()).toBe(workspaceReadme);
  });

  it('TC-WS-02: overwrites existing workspace bootstrap files', () => {
    const tree = Tree.empty();
    tree.create('/README.md', 'old readme');
    tree.create('/.github/copilot-instructions.md', 'old instructions');

    const updatedTree = workspaceSetup({ name: 'demo-app' })(tree, createMockContext()) as Tree;

    expect(updatedTree.read('/README.md')!.toString()).toBe(workspaceReadme);
    expect(updatedTree.read('/.github/copilot-instructions.md')!.toString()).toContain(
      '# demo-app Repo Instructions',
    );
  });

  it('TC-WS-03: throws when name is missing', () => {
    const tree = Tree.empty();

    expect(() => workspaceSetup({ name: '' })(tree, createMockContext())).toThrow(
      SchematicsException,
    );
    expect(() => workspaceSetup({ name: '' })(tree, createMockContext())).toThrow(
      'Option "name" is required.',
    );
  });

  it('TC-WS-15: generates eslint.config.mjs at the workspace root', () => {
    const tree = Tree.empty();

    const updatedTree = workspaceSetup({ name: 'demo-app' })(tree, createMockContext()) as Tree;

    const eslintConfig = updatedTree.read('/eslint.config.mjs')?.toString();
    expect(eslintConfig).toBeDefined();
    expect(eslintConfig).toContain("import angular from 'angular-eslint'");
    expect(eslintConfig).toContain("import tseslint from 'typescript-eslint'");
    expect(eslintConfig).toContain('@angular-eslint/component-selector');
  });

  it('TC-WS-16: leaves an existing eslint.config.mjs untouched (idempotent)', () => {
    const tree = Tree.empty();
    const existing = '// custom user eslint config\nexport default [];\n';
    tree.create('/eslint.config.mjs', existing);

    const updatedTree = workspaceSetup({ name: 'demo-app' })(tree, createMockContext()) as Tree;

    expect(updatedTree.read('/eslint.config.mjs')!.toString()).toBe(existing);
  });

  it('TC-WS-17: adds lint scripts and ESLint devDependencies to package.json', () => {
    const tree = Tree.empty();
    tree.create(
      '/package.json',
      JSON.stringify(
        {
          name: 'demo-app',
          version: '0.0.0',
          scripts: { start: 'ng serve' },
          devDependencies: {},
        },
        null,
        2,
      ),
    );

    const context = createMockContext();
    const updatedTree = workspaceSetup({ name: 'demo-app' })(tree, context) as Tree;

    const packageJson = JSON.parse(updatedTree.read('/package.json')!.toString());
    expect(packageJson.scripts.lint).toBe('ng lint');
    expect(packageJson.scripts['lint:fix']).toBe('ng lint --fix');
    expect(packageJson.scripts.start).toBe('ng serve');
    expect(packageJson.devDependencies.eslint).toBeDefined();
    expect(packageJson.devDependencies['@eslint/js']).toBeDefined();
    expect(packageJson.devDependencies['angular-eslint']).toBeDefined();
    expect(packageJson.devDependencies['@angular-eslint/builder']).toBeDefined();
    expect(packageJson.devDependencies['typescript-eslint']).toBeDefined();
    expect(packageJson.devDependencies.globals).toBeDefined();
    expect(context.addTask).toHaveBeenCalled();
  });

  it('TC-WS-18: preserves existing lint scripts and devDependency versions in package.json', () => {
    const tree = Tree.empty();
    tree.create(
      '/package.json',
      JSON.stringify(
        {
          name: 'demo-app',
          version: '0.0.0',
          scripts: { lint: 'custom-lint', 'lint:fix': 'custom-lint --fix' },
          devDependencies: { eslint: '^9.0.0' },
        },
        null,
        2,
      ),
    );

    const context = createMockContext();
    const updatedTree = workspaceSetup({ name: 'demo-app' })(tree, context) as Tree;

    const packageJson = JSON.parse(updatedTree.read('/package.json')!.toString());
    expect(packageJson.scripts.lint).toBe('custom-lint');
    expect(packageJson.scripts['lint:fix']).toBe('custom-lint --fix');
    expect(packageJson.devDependencies.eslint).toBe('^9.0.0');
    // Other deps were still missing and should have been added.
    expect(packageJson.devDependencies['angular-eslint']).toBeDefined();
  });

  it('TC-WS-19: adds a lint architect target to every project in angular.json', () => {
    const tree = Tree.empty();
    const angularJson = {
      version: 1,
      projects: {
        'app-a': {
          root: 'projects/app-a',
          sourceRoot: 'projects/app-a/src',
          architect: { build: { builder: '@angular/build:application' } },
        },
        'app-b': {
          root: 'projects/app-b',
          sourceRoot: 'projects/app-b/src',
        },
      },
    };
    tree.create('/angular.json', JSON.stringify(angularJson, null, 2));

    const updatedTree = workspaceSetup({ name: 'demo-app' })(tree, createMockContext()) as Tree;

    const updated = JSON.parse(updatedTree.read('/angular.json')!.toString());
    expect(updated.projects['app-a'].architect.lint).toEqual({
      builder: '@angular-eslint/builder:lint',
      options: { lintFilePatterns: ['**/*.ts', '**/*.html'] },
    });
    expect(updated.projects['app-b'].architect.lint).toEqual({
      builder: '@angular-eslint/builder:lint',
      options: { lintFilePatterns: ['**/*.ts', '**/*.html'] },
    });
    // Build target must be preserved.
    expect(updated.projects['app-a'].architect.build.builder).toBe('@angular/build:application');
  });

  it('TC-WS-20: leaves an existing lint architect target untouched', () => {
    const tree = Tree.empty();
    const angularJson = {
      version: 1,
      projects: {
        'app-a': {
          root: 'projects/app-a',
          architect: {
            lint: {
              builder: '@some-custom/builder:lint',
              options: { lintFilePatterns: ['custom/**/*.ts'] },
            },
          },
        },
      },
    };
    tree.create('/angular.json', JSON.stringify(angularJson, null, 2));

    const updatedTree = workspaceSetup({ name: 'demo-app' })(tree, createMockContext()) as Tree;

    const updated = JSON.parse(updatedTree.read('/angular.json')!.toString());
    expect(updated.projects['app-a'].architect.lint.builder).toBe('@some-custom/builder:lint');
    expect(updated.projects['app-a'].architect.lint.options.lintFilePatterns).toEqual([
      'custom/**/*.ts',
    ]);
  });

  it('TC-WS-04: writes application source files from inline content hooks under /src by default', () => {
    const tree = Tree.empty();

    const updatedTree = workspaceSetup({
      name: 'demo-app',
      files: {
        indexHtml: { content: '<!doctype html><html><body><app-root></app-root></body></html>' },
        mainTs: { content: "import 'zone.js';\n" },
        appComponentTs: {
          content: "export class AppComponent { title = 'demo-app'; }\n",
        },
      },
    })(tree, createMockContext()) as Tree;

    expect(updatedTree.read('/src/index.html')!.toString()).toBe(
      '<!doctype html><html><body><app-root></app-root></body></html>',
    );
    expect(updatedTree.read('/src/main.ts')!.toString()).toBe("import 'zone.js';\n");
    expect(updatedTree.read('/src/app/app.component.ts')!.toString()).toBe(
      "export class AppComponent { title = 'demo-app'; }\n",
    );
  });

  it('TC-WS-05: overrides existing application source files via the inline content hook', () => {
    const tree = Tree.empty();
    tree.create('/src/styles.css', '/* original */\n');

    const updatedTree = workspaceSetup({
      name: 'demo-app',
      files: {
        stylesCss: { content: '/* overridden */\n' },
      },
    })(tree, createMockContext()) as Tree;

    expect(updatedTree.read('/src/styles.css')!.toString()).toBe('/* overridden */\n');
  });

  it('TC-WS-06: reads application source file content from a local filesystem path', () => {
    const tree = Tree.empty();

    const updatedTree = workspaceSetup({
      name: 'demo-app',
      files: {
        indexHtml: { path: workspaceReadmePath },
      },
    })(tree, createMockContext()) as Tree;

    expect(updatedTree.read('/src/index.html')!.toString()).toBe(workspaceReadme);
  });

  it('TC-WS-07: instantiates a predefined template by substituting `{{key}}` placeholders from params', () => {
    const tree = Tree.empty();

    const updatedTree = workspaceSetup({
      name: 'demo-app',
      files: {
        appComponentTs: {
          template:
            "import { Component } from '@angular/core';\n\n@Component({ selector: '{{selector}}', template: '<h1>{{title}}</h1>' })\nexport class {{className}} {}\n",
          params: { selector: 'app-root', title: 'Hello', className: 'AppComponent' },
        },
      },
    })(tree, createMockContext()) as Tree;

    expect(updatedTree.read('/src/app/app.component.ts')!.toString()).toBe(
      "import { Component } from '@angular/core';\n\n@Component({ selector: 'app-root', template: '<h1>Hello</h1>' })\nexport class AppComponent {}\n",
    );
  });

  it('TC-WS-08: resolves the source root from angular.json when `project` is provided', () => {
    const tree = Tree.empty();
    tree.create(
      '/angular.json',
      JSON.stringify({
        version: 1,
        projects: {
          'demo-app': {
            root: 'projects/demo-app',
            sourceRoot: 'projects/demo-app/src',
          },
        },
      }),
    );

    const updatedTree = workspaceSetup({
      name: 'demo-app',
      project: 'demo-app',
      files: {
        mainTs: { content: "import 'zone.js';\n" },
      },
    })(tree, createMockContext()) as Tree;

    expect(updatedTree.read('/projects/demo-app/src/main.ts')!.toString()).toBe(
      "import 'zone.js';\n",
    );
  });

  it('TC-WS-09: throws when a file hook specifies neither content nor path nor template', () => {
    const tree = Tree.empty();

    expect(() =>
      workspaceSetup({
        name: 'demo-app',
        files: { mainTs: {} },
      })(tree, createMockContext()),
    ).toThrow(/must specify exactly one of "content", "path", or "template"/);
  });

  it('TC-WS-10: throws when a file hook specifies more than one mode', () => {
    const tree = Tree.empty();

    expect(() =>
      workspaceSetup({
        name: 'demo-app',
        files: { mainTs: { content: 'a', template: 'b' } },
      })(tree, createMockContext()),
    ).toThrow(/must specify only one of "content", "path", or "template"/);
  });

  it('TC-WS-11: throws when `project` is not found in angular.json', () => {
    const tree = Tree.empty();
    tree.create('/angular.json', JSON.stringify({ version: 1, projects: {} }));

    expect(() =>
      workspaceSetup({
        name: 'demo-app',
        project: 'missing',
        files: { mainTs: { content: '' } },
      })(tree, createMockContext()),
    ).toThrow('Project "missing" not found in angular.json.');
  });

  it('TC-WS-12: adds vitest dev dependency, config file, and test scripts to package.json', () => {
    const tree = Tree.empty();
    tree.create(
      '/package.json',
      JSON.stringify(
        {
          name: 'demo-app',
          version: '1.0.0',
          scripts: { ng: 'ng' },
          devDependencies: {},
        },
        null,
        2,
      ),
    );

    const context = createMockContext();
    const updatedTree = workspaceSetup({ name: 'demo-app' })(tree, context) as Tree;

    const packageJson = JSON.parse(updatedTree.read('/package.json')!.toString());
    expect(packageJson.devDependencies.vitest).toBeDefined();
    expect(packageJson.scripts['test:node']).toBe('vitest run --config vitest.config.mts');
    expect(packageJson.scripts['test:node:watch']).toBe('vitest --config vitest.config.mts');
    // Pre-existing scripts are preserved
    expect(packageJson.scripts.ng).toBe('ng');

    const vitestConfig = updatedTree.read('/vitest.config.mts')!.toString();
    expect(vitestConfig).toContain("from 'vitest/config'");
    expect(vitestConfig).toContain("environment: 'node'");
    expect(vitestConfig).toContain("'tests/**/*.spec.ts'");

    // npm install task is scheduled when a new dep is added
    expect(
      (context as unknown as { addTask: ReturnType<typeof vi.fn> }).addTask,
    ).toHaveBeenCalled();
  });

  it('TC-WS-13: vitest setup is idempotent and preserves existing values', () => {
    const tree = Tree.empty();
    tree.create(
      '/package.json',
      JSON.stringify(
        {
          name: 'demo-app',
          version: '1.0.0',
          scripts: {
            'test:node': 'echo custom',
            'test:node:watch': 'echo custom-watch',
          },
          devDependencies: {
            vitest: '^3.0.0',
            // Pre-seed lint devDependencies so workspace-setup's lint setup
            // does not schedule its own NodePackageInstallTask, letting this
            // test stay focused on vitest idempotency.
            '@angular-eslint/builder': '^21.3.1',
            '@eslint/js': '^10.0.1',
            'angular-eslint': '^21.3.1',
            eslint: '^10.2.0',
            globals: '^17.4.0',
            'typescript-eslint': '^8.58.0',
          },
        },
        null,
        2,
      ),
    );
    tree.create('/vitest.config.mts', '// existing config\n');
    tree.create('/eslint.config.mjs', '// existing eslint config\n');

    const context = createMockContext();
    const updatedTree = workspaceSetup({ name: 'demo-app' })(tree, context) as Tree;

    const packageJson = JSON.parse(updatedTree.read('/package.json')!.toString());
    expect(packageJson.devDependencies.vitest).toBe('^3.0.0');
    expect(packageJson.scripts['test:node']).toBe('echo custom');
    expect(packageJson.scripts['test:node:watch']).toBe('echo custom-watch');
    expect(updatedTree.read('/vitest.config.mts')!.toString()).toBe('// existing config\n');

    // No install task scheduled when nothing new was added
    expect(
      (context as unknown as { addTask: ReturnType<typeof vi.fn> }).addTask,
    ).not.toHaveBeenCalled();
  });

  it('TC-WS-14: gracefully skips vitest setup when package.json is missing', () => {
    const tree = Tree.empty();

    const context = createMockContext();
    const updatedTree = workspaceSetup({ name: 'demo-app' })(tree, context) as Tree;

    expect(updatedTree.exists('/vitest.config.mts')).toBe(false);
    expect(
      (context as unknown as { logger: { warn: ReturnType<typeof vi.fn> } }).logger.warn,
    ).toHaveBeenCalledWith(expect.stringContaining('package.json'));
  });
});
