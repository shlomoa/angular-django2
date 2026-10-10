import { strings } from '@angular-devkit/core';
import type { SchematicContext, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import * as path from 'path';
import { resolveApplicationTargetDirectory } from '../utility/project-relative-path';
import type { WorkspaceProject } from '../utility/workspace';
import type { DataServiceImports } from './templates';

/** Location of the `ng-openapi-gen` configuration written by `openapi-setup`. */
export const NG_OPENAPI_GEN_CONFIG_PATH = '/ng-openapi-gen.json';

/** Output folder `ng-openapi-gen` and `openapi-setup` use when none is configured. */
export const DEFAULT_API_OUTPUT = 'src/app/api';

/** Service class suffix `openapi-setup` writes into `ng-openapi-gen.json`. */
export const DEFAULT_API_SERVICE_SUFFIX = 'ApiService';

/** Service class suffix `ng-openapi-gen` uses when the configuration sets none. */
const NG_OPENAPI_GEN_SERVICE_SUFFIX = 'Service';

interface NgOpenApiGenConfig {
  output?: string;
  services?: boolean;
  serviceSuffix?: string;
}

/** The generated client a data service wraps, as the schematic resolved it. */
export interface ResolvedApiClient extends DataServiceImports {
  /** Workspace path of the `services` barrel, without extension. */
  servicesModule: string;
  /** Name of the class to wrap when `--api-service` is not given. */
  apiServiceName: string;
  /** Whether `ng-openapi-gen.json`, which located the client, sets `services: false`. */
  servicesDisabled: boolean;
}

function readConfig(tree: Tree): NgOpenApiGenConfig | undefined {
  const buffer = tree.read(NG_OPENAPI_GEN_CONFIG_PATH);
  if (!buffer) {
    return undefined;
  }

  try {
    return JSON.parse(buffer.toString()) as NgOpenApiGenConfig;
  } catch (error) {
    throw new SchematicsException(
      `Could not parse ${NG_OPENAPI_GEN_CONFIG_PATH}: ${(error as Error).message}`,
    );
  }
}

/** A relative import specifier from a directory to a workspace path. */
export function relativeImport(fromDirectory: string, target: string): string {
  const relative = path.posix.relative(fromDirectory, target);
  if (!relative) {
    return '.';
  }

  return relative.startsWith('.') ? relative : `./${relative}`;
}

/**
 * Resolve where the generated `ng-openapi-gen` client is, relative to the data service.
 *
 * - `--api-path` starting with `.` is a relative specifier and is used verbatim.
 * - any other `--api-path` is an application path (`src/app/api/services`) and is relativized.
 * - without `--api-path`, `output` of `ng-openapi-gen.json` is used, or the `openapi-setup`
 *   default `src/app/api` when the file is missing.
 */
export function resolveApiClient(
  tree: Tree,
  project: WorkspaceProject,
  serviceDirectory: string,
  options: { apiPath?: string; apiService?: string },
  resourceClassName: string,
): ResolvedApiClient {
  const directory = serviceDirectory.replace(/^\/+/, '');
  const config = options.apiPath === undefined ? readConfig(tree) : undefined;
  const suffix = config
    ? (config.serviceSuffix ?? NG_OPENAPI_GEN_SERVICE_SUFFIX)
    : DEFAULT_API_SERVICE_SUFFIX;
  const apiServiceName = `${resourceClassName}${suffix}`;

  if (options.apiPath?.startsWith('.')) {
    const servicesImport = options.apiPath.replace(/\/+$/, '');
    return {
      apiServicesImport: servicesImport,
      apiRootImport: path.posix.normalize(`${servicesImport}/..`),
      servicesModule: path.posix.join(directory, servicesImport),
      apiServiceName,
      servicesDisabled: false,
    };
  }

  const servicesModule = resolveApplicationTargetDirectory(
    project,
    options.apiPath ?? `${config?.output ?? DEFAULT_API_OUTPUT}/services`,
    `${DEFAULT_API_OUTPUT}/services`,
  );

  return {
    apiServicesImport: relativeImport(directory, servicesModule),
    apiRootImport: relativeImport(directory, path.posix.dirname(servicesModule)),
    servicesModule,
    apiServiceName,
    servicesDisabled: config?.services === false,
  };
}

/** Class names a `services` barrel exports, or `undefined` when it re-exports with `export *`. */
function exportedServices(barrel: string): string[] | undefined {
  if (/export\s*\*\s*from/.test(barrel)) {
    return undefined;
  }

  const names = new Set<string>();
  for (const match of barrel.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const specifier of match[1].split(',')) {
      const name = specifier
        .trim()
        .split(/\s+as\s+/)
        .pop();
      if (name) {
        names.add(name);
      }
    }
  }
  for (const match of barrel.matchAll(/export\s+(?:abstract\s+)?class\s+(\w+)/g)) {
    names.add(match[1]);
  }

  return [...names].sort();
}

function readBarrel(tree: Tree, servicesModule: string): string | undefined {
  for (const candidate of [`${servicesModule}.ts`, `${servicesModule}/index.ts`]) {
    const buffer = tree.read(candidate);
    if (buffer) {
      return buffer.toString();
    }
  }

  return undefined;
}

/**
 * Check that the data service has a generated client to wrap.
 *
 * Fails early when the generated output is present but does not export the wrapped class, or
 * when `ng-openapi-gen.json` disables services; warns when the output is not generated yet.
 */
export function verifyApiClient(
  tree: Tree,
  context: SchematicContext,
  client: ResolvedApiClient,
  apiService: string,
  resource: string,
): void {
  if (client.servicesDisabled) {
    throw new SchematicsException(
      `${NG_OPENAPI_GEN_CONFIG_PATH} sets "services": false, so ng-openapi-gen generates no ` +
        `${apiService} to wrap. Set "services": true and run \`npm run generate:api\`.`,
    );
  }

  const barrel = readBarrel(tree, client.servicesModule);
  if (barrel === undefined) {
    context.logger.warn(
      `No generated API client found at ${client.servicesModule}.ts. Run \`npm run generate:api\` ` +
        `to generate ${apiService}; the import is written for that location.`,
    );
    return;
  }

  const exported = exportedServices(barrel);
  if (exported && !exported.includes(apiService)) {
    throw new SchematicsException(
      `${client.servicesModule}.ts does not export ${apiService}. ` +
        `Exported services: ${exported.length > 0 ? exported.join(', ') : '(none)'}. ` +
        `The resource "${resource}" must match an OpenAPI tag (${strings.classify(resource)} + ` +
        `the service suffix), or pass --api-service.`,
    );
  }

  const root = path.posix.dirname(client.servicesModule);
  if (!tree.exists(`${root}/strict-http-response.ts`)) {
    throw new SchematicsException(
      `${root}/strict-http-response.ts does not exist. Regenerate the client with ` +
        '`npm run generate:api` (ng-openapi-gen >= 1.0.5 with "services": true).',
    );
  }
}
