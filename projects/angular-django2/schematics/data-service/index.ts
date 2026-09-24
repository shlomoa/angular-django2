import { normalize, strings } from '@angular-devkit/core';
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import * as path from 'path';
import { readOpenUiDocument } from '../utility/openui';
import { resolveApplicationTargetDirectory } from '../utility/project-relative-path';
import {
  readWorkspace,
  requireWorkspaceProject,
  resolveApplicationProjectName,
} from '../utility/workspace';
import { dataBindingFromAst } from './ast';
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
function getDestinationPath(
  options: Pick<DataServiceSchema, 'path' | 'flat'>,
  names: DataServiceNames,
): string {
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
  if (options.document === undefined) {
    if (options.nodeId !== undefined) {
      throw new SchematicsException('--nodeId requires --document.');
    }
    if (!options.name) {
      throw new SchematicsException('Option "name" is required unless --document is given.');
    }
    return generateDataService({ ...options, name: options.name });
  }

  const conflicting = (['apiService', 'apiPath'] as const).filter(
    (option) => options[option] !== undefined,
  );
  if (conflicting.length > 0) {
    throw new SchematicsException(
      `--document cannot be combined with ${conflicting.map((option) => `--${option}`).join(', ')}; ` +
        'set the [data] binding on the OpenUI node instead.',
    );
  }

  const documentPath = options.document;
  return (tree: Tree, context: SchematicContext) => {
    const binding = dataBindingFromAst(
      readOpenUiDocument(tree, documentPath),
      documentPath,
      options.nodeId,
    );
    const name = options.name ?? strings.dasherize(binding.node.id);
    const names = getNames(name);

    // Resolve paths inside the selected project so the API import is relative
    // to the generated service file.
    const workspace = readWorkspace(tree);
    const project = requireWorkspaceProject(
      workspace,
      resolveApplicationProjectName(workspace, options.project),
    );
    const servicePath = resolveApplicationTargetDirectory(
      project,
      options.path,
      `src/app/features/${names.fileName}/services`,
    );
    const serviceDirectory = getDestinationPath({ flat: options.flat, path: servicePath }, names);
    const apiPath = resolveApplicationTargetDirectory(project, binding.apiPath, binding.apiPath);
    const relativeApiPath = path.posix.relative(serviceDirectory, apiPath);

    return generateDataService({
      ...options,
      name,
      path: servicePath,
      apiService: binding.apiService,
      apiPath: relativeApiPath.startsWith('.') ? relativeApiPath : `./${relativeApiPath}`,
    })(tree, context);
  };
}

/** Generate the data service files from resolved CLI options. */
function generateDataService(options: DataServiceSchema & { name: string }): Rule {
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
