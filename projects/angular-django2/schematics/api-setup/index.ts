import { normalize } from '@angular-devkit/core';
import type { Rule, Tree, SchematicContext } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import * as path from 'path';
import type { ApiSetupSchema } from './schema';
import { getHelperFiles } from './templates';
import {
  ensureDevDependency,
  ensureScript,
  readPackageJson,
  writePackageJson,
} from '../utility/package-json';

const NG_OPENAPI_GEN_VERSION = '^1.0.5';

const DEFAULT_HELPERS_PATH = 'src/app/api-integration';

/**
 * Default ng-openapi-gen configuration
 */
function getDefaultConfig(options: ApiSetupSchema): object {
  return {
    $schema: 'node_modules/ng-openapi-gen/ng-openapi-gen-schema.json',
    input: options.inputPath || 'openapi.json',
    output: options.outputPath || 'src/app/api',
  };
}

/**
 * Add ng-openapi-gen to devDependencies in package.json
 */
function addNgOpenApiGenDependency(tree: Tree, context: SchematicContext): void {
  const pkg = readPackageJson(tree, context);
  if (!pkg) return;

  // Add ng-openapi-gen if not already present (idempotent)
  if (ensureDevDependency(pkg, 'ng-openapi-gen', NG_OPENAPI_GEN_VERSION)) {
    context.logger.info(`Adding ng-openapi-gen@${NG_OPENAPI_GEN_VERSION} to devDependencies.`);
    writePackageJson(tree, pkg);
    context.addTask(new NodePackageInstallTask());
  } else {
    context.logger.info('ng-openapi-gen is already in devDependencies.');
  }
}

/**
 * Add generate:api npm script to package.json
 */
function addGenerateApiScript(tree: Tree, context: SchematicContext): void {
  const pkg = readPackageJson(tree, context);
  if (!pkg) return;

  // Add generate:api script if not already present (idempotent)
  if (ensureScript(pkg, 'generate:api', 'ng-openapi-gen')) {
    context.logger.info('Adding generate:api script to package.json.');
    writePackageJson(tree, pkg);
  } else {
    context.logger.info('generate:api script already exists in package.json.');
  }
}

/**
 * Generate ng-openapi-gen.json config file
 */
function generateConfigFile(tree: Tree, context: SchematicContext, options: ApiSetupSchema): void {
  const configPath = '/ng-openapi-gen.json';

  // Check if config file already exists (idempotent)
  if (tree.exists(configPath)) {
    context.logger.info('ng-openapi-gen.json already exists. Skipping config file generation.');
    return;
  }

  const config = getDefaultConfig(options);
  tree.create(configPath, JSON.stringify(config, null, 2) + '\n');
  context.logger.info('Created ng-openapi-gen.json configuration file.');
}

/**
 * Generate the Django integration helper artifacts (auth, CSRF, transport, and
 * CRM-oriented resource adapters) into the workspace.
 */
function generateHelperArtifacts(
  tree: Tree,
  context: SchematicContext,
  options: ApiSetupSchema,
): void {
  if (options.skipHelpers) {
    context.logger.info('Skipping Django integration helper generation (--skipHelpers).');
    return;
  }

  const helpersDir = normalize(options.helpersPath || DEFAULT_HELPERS_PATH);

  for (const file of getHelperFiles()) {
    if (file.spec && options.skipTests) {
      continue;
    }

    const filePath = normalize(path.join(helpersDir, file.fileName));

    if (tree.exists(filePath)) {
      context.logger.info(`${filePath} already exists. Skipping...`);
      continue;
    }

    tree.create(filePath, file.content);
    context.logger.info(`✓ Created ${filePath}`);
  }
}

/**
 * api-setup schematic: Bootstrap ng-openapi-gen for Angular-Django integration
 *
 * This schematic sets up ng-openapi-gen to generate Angular services and models
 * from an OpenAPI schema. It integrates with the django-angular3 backend pipeline.
 */
export function apiSetup(options: ApiSetupSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.info('Setting up ng-openapi-gen for OpenAPI client generation...');

    // Step 1: Add ng-openapi-gen to devDependencies
    addNgOpenApiGenDependency(tree, context);

    // Step 2: Generate ng-openapi-gen.json config file
    generateConfigFile(tree, context, options);

    // Step 3: Add generate:api npm script
    addGenerateApiScript(tree, context);

    // Step 4: Generate Django auth/CSRF/transport and resource adapter helpers
    generateHelperArtifacts(tree, context, options);

    context.logger.info('✓ api-setup complete!');
    context.logger.info('  Run `npm run generate:api` to generate API models and services.');

    return tree;
  };
}
