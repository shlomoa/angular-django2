/**
 * End-to-end tests for the `data-service` schematic against a real `ng-openapi-gen` client
 * (INT-DS-API-01 to INT-DS-API-05).
 *
 * One Angular workspace is created and shared by the tests. Each test resets the generated client
 * and data service, runs the documented flow (`openapi-setup`, `ng-openapi-gen`, `data-service`)
 * and compiles the result with `tsc --strict`.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cleanupTempAreas,
  createE2ETempArea,
  E2E_TEMP_AREA_PREFIX,
  execAngularCli,
  execCommand,
  getAngularCliInvocation,
  getRepoRoot,
  isE2EDebugMode,
  type TestTempAreaHandle,
} from './utils/temp_areas';

/** Commit of github/rest-api-description the GitHub REST schema is pinned to (info.version 1.1.4). */
const GITHUB_SPEC_SHA = '58b1e0c00b39b9e46c24dc4a0ba6a2669c90e9c1';
const GITHUB_SPEC_URL = `https://raw.githubusercontent.com/github/rest-api-description/${GITHUB_SPEC_SHA}/descriptions/api.github.com/api.github.com.json`;
const GITHUB_SPEC_CACHE = path.join(
  tmpdir(),
  'angular-django2-test',
  `github-rest-api-${GITHUB_SPEC_SHA}.json`,
);

const SETUP_TIMEOUT = 15 * 60 * 1000;
const TEST_TIMEOUT = 10 * 60 * 1000;
const FIXTURE_PATH = path.join(
  import.meta.dirname,
  'fixtures',
  'data-service-api',
  'search-table.ts.txt',
);

/** A small OpenAPI document with a `search` tag, for the tests that do not need the GitHub schema. */
const SEARCH_OPENAPI = {
  openapi: '3.0.3',
  info: { title: 'Search', version: '1.0.0' },
  paths: {
    '/search/items': {
      get: {
        tags: ['search'],
        operationId: 'searchItems',
        parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Matching items',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['total_count', 'items'],
                  properties: {
                    total_count: { type: 'integer' },
                    items: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

interface NgResult {
  status: number | null;
  output: string;
}

interface Diagnostic {
  file: string;
  code: string;
  message: string;
}

/** Download the pinned GitHub schema once and cache it; `undefined` when offline. */
async function downloadGithubSpec(): Promise<string | undefined> {
  if (fs.existsSync(GITHUB_SPEC_CACHE)) {
    return GITHUB_SPEC_CACHE;
  }

  try {
    const response = await fetch(GITHUB_SPEC_URL, { signal: AbortSignal.timeout(2 * 60 * 1000) });
    if (!response.ok) {
      return undefined;
    }

    fs.mkdirSync(path.dirname(GITHUB_SPEC_CACHE), { recursive: true });
    fs.writeFileSync(GITHUB_SPEC_CACHE, Buffer.from(await response.arrayBuffer()));
    return GITHUB_SPEC_CACHE;
  } catch {
    return undefined;
  }
}

describe('data-service against an ng-openapi-gen client', () => {
  const repoRoot = getRepoRoot();
  const debugMode = isE2EDebugMode();
  let tempArea: TestTempAreaHandle;
  let workspace: string;
  let githubSpec: string | undefined;

  const resolve = (...segments: string[]): string => path.join(workspace, ...segments);
  const read = (...segments: string[]): string => fs.readFileSync(resolve(...segments), 'utf8');

  /** Run `ng` in the workspace and keep stdout and stderr, whether or not it succeeds. */
  function ng(args: string[]): NgResult {
    const invocation = getAngularCliInvocation(repoRoot);
    const result = spawnSync(invocation.command, [...invocation.args, ...args], {
      cwd: workspace,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });

    return { status: result.status, output: `${result.stdout}${result.stderr}` };
  }

  function ngSucceeds(args: string[]): string {
    const result = ng(args);
    expect(result.status, result.output).toBe(0);
    return result.output;
  }

  /** Remove everything a previous test generated, so each test starts from the same workspace. */
  function resetGenerated(): void {
    for (const generated of [
      'ng-openapi-gen.json',
      'src/app/api',
      'src/app/shared',
      'src/app/features',
    ]) {
      fs.rmSync(resolve(generated), { recursive: true, force: true });
    }
  }

  function writeSpec(fileName: string, spec: object): string {
    fs.writeFileSync(resolve(fileName), JSON.stringify(spec));
    return fileName;
  }

  function generateClient(specFile: string, setupArgs: string[] = [], config: object = {}): void {
    ngSucceeds([
      'generate',
      'angular-django2:openapi-setup',
      `--openapi-spec-file=${specFile}`,
      '--skip-helpers',
      ...setupArgs,
    ]);

    const configPath = resolve('ng-openapi-gen.json');
    const generatorConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')) as object;
    fs.writeFileSync(configPath, JSON.stringify({ ...generatorConfig, ...config }, null, 2));

    execCommand('npx --no-install ng-openapi-gen', workspace);
  }

  /** `tsc --strict` over the given files; returns the diagnostics in the data-service files. */
  function compile(files: string[], types: string[] = []): Diagnostic[] {
    const tsconfig = resolve('tsconfig.int-ds-api.json');
    fs.writeFileSync(
      tsconfig,
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          experimentalDecorators: true,
          target: 'ES2022',
          module: 'ES2022',
          moduleResolution: 'bundler',
          lib: ['ES2022', 'DOM'],
          types,
        },
        files,
      }),
    );

    const result = spawnSync(
      process.execPath,
      [resolve('node_modules', 'typescript', 'bin', 'tsc'), '-p', tsconfig, '--pretty', 'false'],
      { cwd: workspace, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 },
    );

    const diagnostics: Diagnostic[] = [];
    for (const line of result.stdout.split(/\r?\n/)) {
      const match = /^(?:(.+?)\(\d+,\d+\): )?error (TS\d+): (.*)$/.exec(line);
      if (match) {
        // A diagnostic without a file (a bad tsconfig, a missing file) must not pass silently.
        diagnostics.push({
          file: (match[1] ?? '').replace(/\\/g, '/'),
          code: match[2],
          message: match[3],
        });
      }
    }
    expect(result.status === 0 || diagnostics.length > 0, result.stdout + result.stderr).toBe(true);

    // The generated models of a large schema can fail `strict` for reasons unrelated to ngdj
    // (for example TS2411 in the GitHub schema); only the data-service files count.
    return diagnostics.filter(
      (diagnostic) => !diagnostic.file || diagnostic.file.startsWith('src/app/features/'),
    );
  }

  beforeAll(async () => {
    if (!debugMode) {
      cleanupTempAreas(repoRoot, [E2E_TEMP_AREA_PREFIX]);
    }

    const distDir = path.join(repoRoot, 'projects', 'angular-django2', 'dist');
    if (!fs.existsSync(distDir)) {
      throw new Error(`Library not built. Run 'npm run build' first. Expected path: ${distDir}`);
    }

    githubSpec = await downloadGithubSpec();

    tempArea = createE2ETempArea(repoRoot, debugMode);
    const appName = 'data-service-api-app';
    workspace = path.join(tempArea.path, appName);
    const parentDir = path.dirname(repoRoot);

    execAngularCli(
      [
        'new',
        appName,
        `--directory=${path.relative(parentDir, workspace)}`,
        '--skip-git',
        '--skip-install',
        '--routing=false',
        '--style=scss',
        '--defaults',
      ],
      parentDir,
    );
    execCommand('npm install', workspace);
    execCommand(`npm install "${distDir}"`, workspace);
    execAngularCli(['add', 'angular-django2', '--skip-confirmation'], workspace);

    // The generated service imports Angular Material; the generated spec uses jasmine types.
    const coreVersion = (
      JSON.parse(read('node_modules', '@angular', 'core', 'package.json')) as { version: string }
    ).version;
    execCommand(
      `npm install @angular/material@${coreVersion} @angular/cdk@${coreVersion} ` +
        'ng-openapi-gen@^1.0.5 --save-dev @types/jasmine',
      workspace,
    );
  }, SETUP_TIMEOUT);

  afterAll(() => {
    if (tempArea && !debugMode) {
      tempArea.cleanup();
    }
  });

  it(
    'INT-DS-API-01: data-service output compiles against the ng-openapi-gen client with defaults',
    { timeout: TEST_TIMEOUT },
    async (context) => {
      if (!githubSpec) {
        return context.skip();
      }
      resetGenerated();
      fs.copyFileSync(githubSpec, resolve('github.openapi.json'));

      generateClient('github.openapi.json', [], { includeTags: ['search'] });
      ngSucceeds(['generate', 'angular-django2:data-service', 'search']);

      expect(fs.existsSync(resolve('src/app/api/services/search-api.service.ts'))).toBe(true);
      const service = read('src/app/features/search/services/search/search.data.service.ts');
      expect(service).toContain("import { SearchApiService } from '../../../../api/services';");
      expect(service).toContain("from '../../../../api/strict-http-response';");

      expect(compile(['src/app/features/search/services/search/search.data.service.ts'])).toEqual(
        [],
      );
    },
  );

  it(
    'INT-DS-API-02: the Material "Table retrieving data through HTTP" flow compiles',
    { timeout: TEST_TIMEOUT },
    async (context) => {
      if (!githubSpec) {
        return context.skip();
      }
      resetGenerated();
      fs.copyFileSync(githubSpec, resolve('github.openapi.json'));

      generateClient('github.openapi.json', [], { includeTags: ['search'] });
      ngSucceeds(['generate', 'angular-django2:data-service', 'search']);
      fs.copyFileSync(FIXTURE_PATH, resolve('src/app/features/search/search-table.ts'));

      expect(compile(['src/app/features/search/search-table.ts'])).toEqual([]);
    },
  );

  it(
    'INT-DS-API-03: data-service imports the client from a custom openapi-setup output',
    { timeout: TEST_TIMEOUT },
    () => {
      resetGenerated();
      const specFile = writeSpec('search.openapi.json', SEARCH_OPENAPI);

      generateClient(specFile, ['--output-path=src/app/shared/api']);
      ngSucceeds(['generate', 'angular-django2:data-service', 'search']);

      expect(fs.existsSync(resolve('src/app/shared/api/services/search-api.service.ts'))).toBe(
        true,
      );
      const service = read('src/app/features/search/services/search/search.data.service.ts');
      expect(service).toContain("from '../../../../shared/api/services';");
      expect(service).toContain("from '../../../../shared/api/strict-http-response';");
      expect(service).not.toContain("'../api/");

      expect(compile(['src/app/features/search/services/search/search.data.service.ts'])).toEqual(
        [],
      );
    },
  );

  it(
    'INT-DS-API-04: data-service fails early when the generated client is not consumable',
    { timeout: TEST_TIMEOUT },
    () => {
      const specFile = writeSpec('search.openapi.json', SEARCH_OPENAPI);
      const dataServiceFile = 'src/app/features/search/services/search/search.data.service.ts';

      // An unknown resource: the tag is `search`, not `customers`.
      resetGenerated();
      generateClient(specFile);
      const unknown = ng(['generate', 'angular-django2:data-service', 'customer']);
      expect(unknown.status).not.toBe(0);
      expect(unknown.output).toContain('does not export CustomerApiService');
      expect(unknown.output).toContain('SearchApiService');
      expect(fs.existsSync(resolve('src/app/features/customer'))).toBe(false);

      // `services: false` generates no services to wrap.
      resetGenerated();
      generateClient(specFile);
      const configPath = resolve('ng-openapi-gen.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as object;
      fs.writeFileSync(configPath, JSON.stringify({ ...config, services: false }));
      const disabled = ng(['generate', 'angular-django2:data-service', 'search']);
      expect(disabled.status).not.toBe(0);
      expect(disabled.output).toContain('"services": false');
      expect(fs.existsSync(resolve(dataServiceFile))).toBe(false);

      // A client without strict-http-response.ts.
      resetGenerated();
      generateClient(specFile);
      fs.rmSync(resolve('src/app/api/strict-http-response.ts'));
      const incomplete = ng(['generate', 'angular-django2:data-service', 'search']);
      expect(incomplete.status).not.toBe(0);
      expect(incomplete.output).toContain('strict-http-response.ts does not exist');
      expect(fs.existsSync(resolve(dataServiceFile))).toBe(false);

      // A client that is not generated yet: a warning, and the computed path is written.
      resetGenerated();
      ngSucceeds(['generate', 'angular-django2:openapi-setup', '--skip-helpers']);
      const missing = ng(['generate', 'angular-django2:data-service', 'search']);
      expect(missing.status, missing.output).toBe(0);
      expect(missing.output).toContain('npm run generate:api');
      expect(read(dataServiceFile)).toContain("from '../../../../api/services';");
    },
  );

  it('INT-DS-API-05: the generated data service spec compiles', { timeout: TEST_TIMEOUT }, () => {
    resetGenerated();
    const specFile = writeSpec('search.openapi.json', SEARCH_OPENAPI);

    generateClient(specFile);
    ngSucceeds(['generate', 'angular-django2:data-service', 'search']);

    const specPath = 'src/app/features/search/services/search/search.data.service.spec.ts';
    expect(fs.existsSync(resolve(specPath))).toBe(true);
    expect(compile([specPath], ['jasmine'])).toEqual([]);
  });
});
