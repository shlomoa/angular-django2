import { normalize, strings } from '@angular-devkit/core';
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import * as path from 'path';
import type { DataServiceSchema } from './schema';
import type { DataServiceNames } from './templates';
import { generateServiceContent, generateSpecContent } from './templates';

/**
 * Convert resource name to proper case names.
 * @example 'users' -> { className: 'Users', serviceName: 'UsersDataService', apiServiceName: 'UsersApiService' }
 */
function getNames(resourceName: string): DataServiceNames {
  const className = strings.classify(resourceName);
  const serviceName = `${className}DataService`;
  const apiServiceName = `${className}ApiService`;
  const fileName = strings.dasherize(resourceName);

  return {
    className,
    serviceName,
    apiServiceName,
    fileName,
  };
}

/**
 * Determine the destination path for the service files.
 */
function getDestinationPath(options: DataServiceSchema, names: DataServiceNames): string {
  if (options.path) {
    return options.flat
      ? normalize(options.path)
      : normalize(path.join(options.path, names.fileName));
  }

  // Default to features/<resource>/services if no path specified
  return options.flat
    ? normalize(`src/app/features/${names.fileName}/services`)
    : normalize(`src/app/features/${names.fileName}/services/${names.fileName}`);
}

function createFileIfMissing(
  tree: Tree,
  context: SchematicContext,
  filePath: string,
  content: string,
  label: string,
): void {
  if (tree.exists(filePath)) {
    context.logger.warn(`${label} file already exists at ${filePath}. Skipping...`);
    return;
  }

  tree.create(filePath, content);
  context.logger.info(`✓ Created ${filePath}`);
}

/**
 * data-service schematic: Generate a data service wrapper for OpenAPI services.
 *
 * This schematic scaffolds an Angular data service that wraps generated OpenAPI
 * API services with typed Observable returns and clean error handling.
 */
export function dataService(options: DataServiceSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.logger.info(`Generating data service for resource: ${options.name}`);

    const names = getNames(options.name);
    const destinationPath = getDestinationPath(options, names);
    const serviceFilePath = normalize(
      path.join(destinationPath, `${names.fileName}.data.service.ts`),
    );

    createFileIfMissing(
      tree,
      context,
      serviceFilePath,
      generateServiceContent(options, names),
      'Service',
    );

    if (!options.skipTests) {
      const specFilePath = normalize(
        path.join(destinationPath, `${names.fileName}.data.service.spec.ts`),
      );

      createFileIfMissing(tree, context, specFilePath, generateSpecContent(options, names), 'Spec');
    }

    context.logger.info(`✓ Data service generation complete!`);
    context.logger.info(`  Service: ${names.serviceName}`);
    context.logger.info(`  Location: ${serviceFilePath}`);

    return tree;
  };
}
