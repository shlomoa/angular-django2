import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

/**
 * Hook describing how to provision a single application source file.
 *
 * Exactly one of `content`, `path`, or `template` must be supplied:
 *
 * - `content`  — inline body written verbatim to the target path.
 * - `path`     — local filesystem path read at schematic execution time
 *                (the "user provides a link to the file" mode).
 * - `template` — literal body whose `{{key}}` placeholders are replaced
 *                with the matching value from `params`. Useful for
 *                instantiating a pre-defined template with values.
 */
export interface FileHook {
  content?: string;
  path?: string;
  template?: string;
  params?: Record<string, string | number | boolean>;
}

/**
 * Recognized file identifiers. Each key maps to a fixed relative path under
 * the resolved source root (`src/` by default, or the selected project's
 * `sourceRoot` from `angular.json`).
 *
 * The set matches the application source files documented at
 * https://angular.dev/reference/configs/file-structure#application-source-files.
 */
export type AppSourceFileKey =
  | 'favicon'
  | 'indexHtml'
  | 'mainTs'
  | 'stylesCss'
  | 'appConfigTs'
  | 'appComponentTs'
  | 'appComponentHtml'
  | 'appComponentCss'
  | 'appComponentSpecTs'
  | 'appModuleTs'
  | 'appRoutesTs';

export interface NgWorkspaceSchema {
  name: string;
  project?: string;
  files?: Partial<Record<AppSourceFileKey, FileHook>>;
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
  '@angular-eslint/builder': '^22.0.0',
  '@eslint/js': '^10.0.1',
  'angular-eslint': '^22.0.0',
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

const VITEST_VERSION = '^4.0.8';

const VITEST_CONFIG_PATH = '/vitest.config.mts';

const VITEST_CONFIG_CONTENT = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
});
`;

const VITEST_SCRIPTS: Record<string, string> = {
  'test:node': 'vitest run --config vitest.config.mts',
  'test:node:watch': 'vitest --config vitest.config.mts',
};

const APP_SOURCE_FILE_PATHS: Record<AppSourceFileKey, string> = {
  favicon: 'favicon.ico',
  indexHtml: 'index.html',
  mainTs: 'main.ts',
  stylesCss: 'styles.css',
  appConfigTs: 'app/app.config.ts',
  appComponentTs: 'app/app.component.ts',
  appComponentHtml: 'app/app.component.html',
  appComponentCss: 'app/app.component.css',
  appComponentSpecTs: 'app/app.component.spec.ts',
  appModuleTs: 'app/app.module.ts',
  appRoutesTs: 'app/app.routes.ts',
};

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

/**
 * Configure vitest for the generated workspace:
 *  - add vitest to devDependencies
 *  - create vitest.config.mts
 *  - add test:node / test:node:watch scripts
 *
 * All steps are idempotent so re-running ng-workspace is safe.
 */
function addVitestSupport(tree: Tree, context: SchematicContext): void {
  const packageJsonPath = '/package.json';
  const packageJsonBuffer = tree.read(packageJsonPath);

  if (!packageJsonBuffer) {
    context.logger.warn('Could not find package.json. Skipping vitest setup.');
    return;
  }

  const packageJson = JSON.parse(packageJsonBuffer.toString());

  let packageJsonChanged = false;
  let dependencyAdded = false;

  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }

  if (!packageJson.devDependencies['vitest']) {
    packageJson.devDependencies['vitest'] = VITEST_VERSION;
    context.logger.info(`Adding vitest@${VITEST_VERSION} to devDependencies.`);
    packageJsonChanged = true;
    dependencyAdded = true;
  }

  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }

  for (const [scriptName, scriptCommand] of Object.entries(VITEST_SCRIPTS)) {
    if (!packageJson.scripts[scriptName]) {
      packageJson.scripts[scriptName] = scriptCommand;
      context.logger.info(`Adding ${scriptName} script to package.json.`);
      packageJsonChanged = true;
    }
  }

  if (packageJsonChanged) {
    tree.overwrite(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  }

  if (!tree.exists(VITEST_CONFIG_PATH)) {
    tree.create(VITEST_CONFIG_PATH, VITEST_CONFIG_CONTENT);
    context.logger.info('Created vitest.config.mts configuration file.');
  }

  if (dependencyAdded) {
    context.addTask(new NodePackageInstallTask());
  }
}

function resolveSourceRoot(tree: Tree, project: string | undefined): string {
  if (!project) {
    return '/src';
  }

  const angularJsonBuffer = tree.read('/angular.json');
  if (!angularJsonBuffer) {
    return '/src';
  }

  let workspace: WorkspaceConfig;
  try {
    workspace = JSON.parse(angularJsonBuffer.toString()) as WorkspaceConfig;
  } catch {
    return '/src';
  }

  const projectConfig = workspace.projects?.[project];
  if (!projectConfig) {
    throw new SchematicsException(`Project "${project}" not found in angular.json.`);
  }

  const sourceRoot =
    projectConfig.sourceRoot ?? (projectConfig.root ? `${projectConfig.root}/src` : 'src');

  return sourceRoot.startsWith('/') ? sourceRoot : `/${sourceRoot}`;
}

function substituteTemplate(
  template: string,
  params: Record<string, string | number | boolean> | undefined,
): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      return String(params[key]);
    }
    return match;
  });
}

function resolveHookContent(hook: FileHook, fileKey: AppSourceFileKey): string {
  const modes = ['content', 'path', 'template'].filter(
    (mode) => hook[mode as keyof FileHook] !== undefined,
  );

  if (modes.length === 0) {
    throw new SchematicsException(
      `files.${fileKey} must specify exactly one of "content", "path", or "template".`,
    );
  }

  if (modes.length > 1) {
    throw new SchematicsException(
      `files.${fileKey} must specify only one of "content", "path", or "template" (got: ${modes.join(', ')}).`,
    );
  }

  if (hook.content !== undefined) {
    return hook.content;
  }

  if (hook.path !== undefined) {
    // Relative paths are resolved against the schematic's current working
    // directory. Prefer absolute paths for predictable behavior across
    // invocation contexts.
    const resolvedPath = isAbsolute(hook.path) ? hook.path : resolve(process.cwd(), hook.path);
    try {
      return readFileSync(resolvedPath, 'utf8');
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new SchematicsException(
        `Failed to read files.${fileKey}.path "${hook.path}": ${reason}`,
      );
    }
  }

  return substituteTemplate(hook.template!, hook.params);
}

function applyFileHooks(
  tree: Tree,
  sourceRoot: string,
  files: Partial<Record<AppSourceFileKey, FileHook>>,
): void {
  for (const [key, hook] of Object.entries(files) as [AppSourceFileKey, FileHook | undefined][]) {
    if (!hook) {
      continue;
    }

    const relativePath = APP_SOURCE_FILE_PATHS[key];
    if (!relativePath) {
      throw new SchematicsException(`Unknown application source file key "${key}".`);
    }

    const content = resolveHookContent(hook, key);
    const targetPath = `${sourceRoot}/${relativePath}`;
    writeOrOverwrite(tree, targetPath, content);
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
    addVitestSupport(tree, context);

    if (options.files && Object.keys(options.files).length > 0) {
      const sourceRoot = resolveSourceRoot(tree, options.project);
      applyFileHooks(tree, sourceRoot, options.files);
    }

    return tree;
  };
}
