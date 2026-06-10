import type { Rule, Tree, SchematicContext } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface NgWorkspaceSchema {
  name: string;
}

interface ArchitectTarget {
  builder: string;
  options?: Record<string, unknown>;
}

interface WorkspaceProject {
  root?: string;
  sourceRoot?: string;
  architect?: Record<string, ArchitectTarget>;
}

interface WorkspaceConfig {
  projects?: Record<string, WorkspaceProject>;
}

const README_TEMPLATE_PATH = join(__dirname, '../../README.md');

/**
 * Versions for ESLint workspace tooling. Kept in sync with the host
 * angular-django2 workspace devDependencies so generated workspaces use a
 * verified-compatible toolchain.
 */
const LINT_DEV_DEPENDENCIES: Record<string, string> = {
  '@angular-eslint/builder': '^21.3.1',
  '@eslint/js': '^10.0.1',
  'angular-eslint': '^21.3.1',
  eslint: '^10.2.0',
  globals: '^17.4.0',
  'typescript-eslint': '^8.58.0',
};

const LINT_SCRIPTS: Record<string, string> = {
  lint: 'ng lint',
  'lint:fix': 'ng lint --fix',
};

const ESLINT_CONFIG_CONTENT = `import js from '@eslint/js';
import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['.angular/**', 'dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  },
);
`;

function writeOrOverwrite(tree: Tree, filePath: string, content: string): void {
  if (tree.exists(filePath)) {
    tree.overwrite(filePath, content);
    return;
  }

  tree.create(filePath, content);
}

function getWorkspaceReadme(): string {
  return readFileSync(README_TEMPLATE_PATH, 'utf8');
}

/**
 * Create the workspace-level ESLint flat config if it does not already exist.
 * Idempotent: leaves any existing user-customized config untouched.
 */
function ensureEslintConfig(tree: Tree, context: SchematicContext): void {
  const eslintConfigPath = '/eslint.config.mjs';

  if (tree.exists(eslintConfigPath)) {
    context.logger.info('eslint.config.mjs already exists. Skipping ESLint config generation.');
    return;
  }

  tree.create(eslintConfigPath, ESLINT_CONFIG_CONTENT);
  context.logger.info('Created eslint.config.mjs.');
}

/**
 * Add lint-related devDependencies and lint scripts to package.json, and
 * schedule `npm install` if any devDependency was added.
 */
function updatePackageJsonForLint(tree: Tree, context: SchematicContext): void {
  const packageJsonPath = '/package.json';
  const packageJsonBuffer = tree.read(packageJsonPath);

  if (!packageJsonBuffer) {
    context.logger.warn('Could not find package.json. Skipping lint setup in package.json.');
    return;
  }

  const packageJson = JSON.parse(packageJsonBuffer.toString());

  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }

  let installNeeded = false;
  for (const [name, version] of Object.entries(LINT_DEV_DEPENDENCIES)) {
    if (!packageJson.devDependencies[name]) {
      packageJson.devDependencies[name] = version;
      installNeeded = true;
    }
  }

  for (const [name, command] of Object.entries(LINT_SCRIPTS)) {
    if (!packageJson.scripts[name]) {
      packageJson.scripts[name] = command;
    }
  }

  tree.overwrite(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  if (installNeeded) {
    context.addTask(new NodePackageInstallTask());
    context.logger.info('Added ESLint devDependencies to package.json.');
  }
  context.logger.info('Ensured lint and lint:fix scripts exist in package.json.');
}

/**
 * Add a `lint` architect target backed by `@angular-eslint/builder:lint` to
 * every project in angular.json that does not already define one.
 */
function addLintTargetsToAngularJson(tree: Tree, context: SchematicContext): void {
  const angularJsonPath = '/angular.json';
  const angularJsonBuffer = tree.read(angularJsonPath);

  if (!angularJsonBuffer) {
    context.logger.warn('Could not find angular.json. Skipping lint architect setup.');
    return;
  }

  let workspace: WorkspaceConfig;
  try {
    workspace = JSON.parse(angularJsonBuffer.toString()) as WorkspaceConfig;
  } catch {
    context.logger.warn('angular.json is not valid JSON. Skipping lint architect setup.');
    return;
  }

  const projects = workspace.projects ?? {};
  let modified = false;

  for (const [projectName, project] of Object.entries(projects)) {
    if (!project) {
      continue;
    }

    if (!project.architect) {
      project.architect = {};
    }

    if (project.architect.lint) {
      continue;
    }

    project.architect.lint = {
      builder: '@angular-eslint/builder:lint',
      options: {
        lintFilePatterns: ['**/*.ts', '**/*.html'],
      },
    };
    modified = true;
    context.logger.info(`Added lint architect target to project '${projectName}'.`);
  }

  if (modified) {
    tree.overwrite(angularJsonPath, JSON.stringify(workspace, null, 2) + '\n');
  }
}

export function ngWorkspace(options: NgWorkspaceSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const name = options.name?.trim();

    if (!name) {
      throw new SchematicsException('Option "name" is required.');
    }

    writeOrOverwrite(
      tree,
      '/.github/copilot-instructions.md',
      `# ${name} Repo Instructions

Read [these instructions first](https://github.com/shlomoa/internal/blob/main/github/copilot-instructions.md)

---
`,
    );
    writeOrOverwrite(tree, '/README.md', getWorkspaceReadme());

    ensureEslintConfig(tree, context);
    updatePackageJsonForLint(tree, context);
    addLintTargetsToAngularJson(tree, context);

    return tree;
  };
}
