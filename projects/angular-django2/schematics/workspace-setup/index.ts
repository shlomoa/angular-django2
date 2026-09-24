import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { readFileSync } from 'node:fs';
import {
  ensureDevDependency,
  ensureScript,
  readPackageJson,
  writePackageJson,
} from '../utility/package-json';
import { join } from 'node:path';
import type { WorkspaceConfig } from '../utility/workspace';
import { ANGULAR_JSON_PATH, requireWorkspaceProject, writeWorkspace } from '../utility/workspace';
import type { AppSourceFileKey, FileHook } from './file-hooks';
import { applyFileHooks, writeOrOverwrite } from './file-hooks';
import { faviconHrefFromAst, indexHtmlFromAst, type IndexHtmlAstOptions } from '../application/ast';
import { readOpenUiDocument } from '../utility/openui';

export type { AppSourceFileKey, FileHook } from './file-hooks';

export interface WorkspaceSetupSchema {
  name: string;
  project?: string;
  files?: Partial<Record<AppSourceFileKey, FileHook>>;
  /**
   * Workspace-relative path to an OpenUI document whose `IndexHtml` and
   * `Favicon` nodes describe the host document and icon.
   */
  document?: string;
}

/** File hooks an OpenUI document describes; they cannot be combined with `--document`. */
const DOCUMENT_DESCRIBED_FILES: readonly AppSourceFileKey[] = ['indexHtml', 'favicon'];

/** Host file edits compiled from an OpenUI document, resolved before any mutation. */
interface HostFileEdits {
  indexHtml?: { path: string; content: string };
  favicon?: { path: string; content: Buffer };
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
  const pkg = readPackageJson(tree, context);
  if (!pkg) return;

  let installNeeded = false;
  for (const [name, version] of Object.entries(LINT_DEV_DEPENDENCIES)) {
    if (ensureDevDependency(pkg, name, version)) {
      installNeeded = true;
    }
  }
  for (const [name, command] of Object.entries(LINT_SCRIPTS)) {
    ensureScript(pkg, name, command);
  }

  writePackageJson(tree, pkg);

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
  const angularJsonBuffer = tree.read(ANGULAR_JSON_PATH);

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
    writeWorkspace(tree, workspace);
  }
}

/**
 * Configure vitest for the generated workspace:
 *  - add vitest to devDependencies
 *  - create vitest.config.mts
 *  - add test:node / test:node:watch scripts
 *
 * All steps are idempotent so re-running workspace-setup is safe.
 */
function addVitestSupport(tree: Tree, context: SchematicContext): void {
  const pkg = readPackageJson(tree, context);
  if (!pkg) return;

  const depAdded = ensureDevDependency(pkg, 'vitest', VITEST_VERSION);
  if (depAdded) {
    context.logger.info(`Adding vitest@${VITEST_VERSION} to devDependencies.`);
  }

  let pkgChanged = depAdded;
  for (const [scriptName, scriptCommand] of Object.entries(VITEST_SCRIPTS)) {
    if (ensureScript(pkg, scriptName, scriptCommand)) {
      context.logger.info(`Adding ${scriptName} script to package.json.`);
      pkgChanged = true;
    }
  }

  if (pkgChanged) {
    writePackageJson(tree, pkg);
  }

  if (!tree.exists(VITEST_CONFIG_PATH)) {
    tree.create(VITEST_CONFIG_PATH, VITEST_CONFIG_CONTENT);
    context.logger.info('Created vitest.config.mts configuration file.');
  }

  if (depAdded) {
    context.addTask(new NodePackageInstallTask());
  }
}

function resolveSourceRoot(tree: Tree, project: string | undefined): string {
  if (!project) {
    return '/src';
  }

  const angularJsonBuffer = tree.read(ANGULAR_JSON_PATH);
  if (!angularJsonBuffer) {
    return '/src';
  }

  let workspace: WorkspaceConfig;
  try {
    workspace = JSON.parse(angularJsonBuffer.toString()) as WorkspaceConfig;
  } catch {
    return '/src';
  }

  const projectConfig = requireWorkspaceProject(workspace, project);

  const sourceRoot =
    projectConfig.sourceRoot ?? (projectConfig.root ? `${projectConfig.root}/src` : 'src');

  return sourceRoot.startsWith('/') ? sourceRoot : `/${sourceRoot}`;
}

export function workspaceSetup(options: WorkspaceSetupSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const name = options.name?.trim();

    if (!name) {
      throw new SchematicsException('Option "name" is required.');
    }
    const hostFileEdits =
      options.document === undefined ? undefined : resolveHostFileEdits(tree, options);

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
    if (hostFileEdits) {
      applyHostFileEdits(tree, hostFileEdits);
    }

    return tree;
  };
}

/**
 * Rule applying the `IndexHtml` and `Favicon` nodes of an OpenUI document to
 * the host files of `project` (used by the `compile` schematic).
 *
 * @internal
 */
export function hostFilesFromDocument(documentPath: string, project: string): Rule {
  return (tree: Tree) => {
    applyHostFileEdits(
      tree,
      resolveHostFileEdits(tree, { name: project, project, document: documentPath }),
    );
    return tree;
  };
}

function applyHostFileEdits(tree: Tree, edits: HostFileEdits): void {
  if (edits.indexHtml) {
    tree.overwrite(edits.indexHtml.path, edits.indexHtml.content);
  }
  if (edits.favicon) {
    writeOrOverwrite(tree, edits.favicon.path, edits.favicon.content);
  }
}

/**
 * Compile the `IndexHtml` and `Favicon` nodes of `--document` into host file
 * edits: `[lang]`, `[dir]`, and `[title]` update the existing index.html, and
 * the `[href]` icon file replaces the application favicon (`public/favicon.ico`
 * when present, else `<sourceRoot>/favicon.ico` as for the `favicon` file hook).
 *
 * @throws SchematicsException for conflicting file hooks, invalid nodes, or missing files.
 */
function resolveHostFileEdits(tree: Tree, options: WorkspaceSetupSchema): HostFileEdits {
  const documentPath = options.document!;
  const conflicting = DOCUMENT_DESCRIBED_FILES.filter((key) => options.files?.[key] !== undefined);
  if (conflicting.length > 0) {
    throw new SchematicsException(
      `--document cannot be combined with files.${conflicting.join(', files.')}; ` +
        'describe them with the OpenUI IndexHtml and Favicon nodes instead.',
    );
  }

  const document = readOpenUiDocument(tree, documentPath);
  const sourceRoot = resolveSourceRoot(tree, options.project);
  const edits: HostFileEdits = {};

  const indexHtml = indexHtmlFromAst(document, documentPath);
  if (indexHtml) {
    const indexPath = `${sourceRoot}/index.html`;
    const content = tree.read(indexPath)?.toString();
    if (content === undefined) {
      throw new SchematicsException(
        `OpenUI document "${documentPath}" describes index.html, but ${indexPath} does not exist.`,
      );
    }
    edits.indexHtml = { path: indexPath, content: updateIndexHtml(content, indexHtml, indexPath) };
  }

  const faviconHref = faviconHrefFromAst(document, documentPath);
  if (faviconHref !== undefined) {
    const iconPath = `/${faviconHref.replace(/\\/g, '/').replace(/^\.?\/+/, '')}`;
    const icon = faviconHref.split(/[\\/]+/).includes('..') ? null : tree.read(iconPath);
    if (!icon) {
      throw new SchematicsException(
        `The favicon file "${faviconHref}" from OpenUI document "${documentPath}" was not found in the workspace.`,
      );
    }
    const publicFavicon = `${resolveProjectRoot(tree, options.project)}/public/favicon.ico`;
    edits.favicon = {
      path: tree.exists(publicFavicon) ? publicFavicon : `${sourceRoot}/favicon.ico`,
      content: icon,
    };
  }

  return edits;
}

/**
 * Set `lang` and `dir` on the `<html>` element and the `<title>` text.
 *
 * @internal exported for direct unit testing.
 */
export function updateIndexHtml(
  content: string,
  options: IndexHtmlAstOptions,
  indexPath = 'index.html',
): string {
  let result = content;
  for (const attribute of ['lang', 'dir'] as const) {
    const value = options[attribute];
    if (value === undefined) {
      continue;
    }
    const htmlTag = /<html\b[^>]*>/i.exec(result);
    if (!htmlTag) {
      throw new SchematicsException(`${indexPath} has no <html> element.`);
    }
    const existing = new RegExp(`\\s${attribute}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, 'i');
    const assignment = ` ${attribute}="${escapeHtml(value)}"`;
    const updatedTag = existing.test(htmlTag[0])
      ? htmlTag[0].replace(existing, assignment)
      : htmlTag[0].replace(/\s*\/?>$/, (end) => `${assignment}${end}`);
    result = result.replace(htmlTag[0], updatedTag);
  }

  if (options.title !== undefined) {
    const title = `<title>${escapeHtml(options.title)}</title>`;
    if (/<title>[\s\S]*?<\/title>/i.test(result)) {
      result = result.replace(/<title>[\s\S]*?<\/title>/i, title);
    } else if (/^([ \t]*)<\/head>/im.test(result)) {
      result = result.replace(/^([ \t]*)<\/head>/im, (match, indent: string) => {
        return `${indent}  ${title}\n${match}`;
      });
    } else {
      throw new SchematicsException(`${indexPath} has no <title> or </head> to set the title.`);
    }
  }

  return result;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveProjectRoot(tree: Tree, project: string | undefined): string {
  const angularJsonBuffer = tree.read(ANGULAR_JSON_PATH);
  if (!project || !angularJsonBuffer) {
    return '';
  }

  const workspace = JSON.parse(angularJsonBuffer.toString()) as WorkspaceConfig;
  const root = requireWorkspaceProject(workspace, project).root ?? '';
  return root ? `/${root.replace(/^\/+|\/+$/g, '')}` : '';
}
