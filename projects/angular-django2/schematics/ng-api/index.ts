import type { Rule, Tree, SchematicContext } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import type { NgApiSchema } from './schema';

const NG_OPENAPI_GEN_VERSION = '^1.0.5';

/**
 * Default ng-openapi-gen configuration
 */
function getDefaultConfig(options: NgApiSchema): object {
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
  const packageJsonPath = '/package.json';
  const packageJsonBuffer = tree.read(packageJsonPath);

  if (!packageJsonBuffer) {
    context.logger.warn(
      'Could not find package.json. Skipping ng-openapi-gen dependency installation.',
    );
    return;
  }

  const packageJson = JSON.parse(packageJsonBuffer.toString());

  // Ensure devDependencies object exists
  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }

  // Add ng-openapi-gen if not already present (idempotent)
  if (!packageJson.devDependencies['ng-openapi-gen']) {
    packageJson.devDependencies['ng-openapi-gen'] = NG_OPENAPI_GEN_VERSION;
    context.logger.info(`Adding ng-openapi-gen@${NG_OPENAPI_GEN_VERSION} to devDependencies.`);

    tree.overwrite(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

    // Schedule npm install
    context.addTask(new NodePackageInstallTask());
  } else {
    context.logger.info('ng-openapi-gen is already in devDependencies.');
  }
}

/**
 * Add generate:api npm script to package.json
 */
function addGenerateApiScript(tree: Tree, context: SchematicContext): void {
  const packageJsonPath = '/package.json';
  const packageJsonBuffer = tree.read(packageJsonPath);

  if (!packageJsonBuffer) {
    context.logger.warn('Could not find package.json. Skipping npm script addition.');
    return;
  }

  const packageJson = JSON.parse(packageJsonBuffer.toString());

  // Ensure scripts object exists
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }

  // Add generate:api script if not already present (idempotent)
  const scriptCommand = 'ng-openapi-gen';
  if (!packageJson.scripts['generate:api']) {
    packageJson.scripts['generate:api'] = scriptCommand;
    context.logger.info('Adding generate:api script to package.json.');
    tree.overwrite(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  } else {
    context.logger.info('generate:api script already exists in package.json.');
  }
}

/**
 * Generate ng-openapi-gen.json config file
 */
function generateConfigFile(tree: Tree, context: SchematicContext, options: NgApiSchema): void {
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
 * ng-api schematic: Bootstrap ng-openapi-gen for Angular-Django integration
 *
 * This schematic sets up ng-openapi-gen to generate Angular services and models
 * from an OpenAPI schema. It integrates with the django-angular3 backend pipeline.
 */
export function ngApi(options: NgApiSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.info('Setting up ng-openapi-gen for OpenAPI client generation...');

    // Step 1: Add ng-openapi-gen to devDependencies
    addNgOpenApiGenDependency(tree, context);

    // Step 2: Generate ng-openapi-gen.json config file
    generateConfigFile(tree, context, options);

    // Step 3: Add generate:api npm script
    addGenerateApiScript(tree, context);

    context.logger.info('✓ ng-api setup complete!');
    context.logger.info('  Run `npm run generate:api` to generate API models and services.');

    return tree;
  };
}
