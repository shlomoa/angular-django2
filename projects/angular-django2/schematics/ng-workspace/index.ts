import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface NgWorkspaceSchema {
  name: string;
}

const README_TEMPLATE_PATH = join(__dirname, '../../README.md');

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

    addVitestSupport(tree, context);

    return tree;
  };
}
