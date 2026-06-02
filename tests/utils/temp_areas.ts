import { execFileSync, execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export type TestTempAreaMode = 'persistent' | 'non-persistent';

export interface TestTempAreaOptions {
  mode?: TestTempAreaMode;
  areaName?: string;
  prefix?: string;
  tempRoot?: string;
}

export interface ResolvedTestTempAreaOptions {
  mode: TestTempAreaMode;
  areaName?: string;
  prefix: string;
  tempRoot: string;
}

export interface TestTempAreaHandle {
  path: string;
  mode: TestTempAreaMode;
  areaName: string;
  cleanup: () => void;
}

export const TEST_TEMP_AREA_MODE_ENV = 'ANGULAR_DJANGO2_TEST_MODE';
export const TEST_TEMP_AREA_NAME_ENV = 'ANGULAR_DJANGO2_TEST_AREA_NAME';
export const E2E_DEBUG_ENV = 'ANGULAR_DJANGO2_E2E_DEBUG';
export const E2E_TEMP_AREA_PREFIX = 'ngdj-e2e-';
export const DEFAULT_EXEC_COMMAND_MAX_BUFFER = 10 * 1024 * 1024;
export const DEFAULT_E2E_TIMEOUT = 5 * 60 * 1000;
export const VITEST_E2E_CONFIG = 'vitest.e2e.config.mts';

const DEFAULT_TEMP_ROOT = join(tmpdir(), 'angular-django2-test');
const DEFAULT_PREFIX = 'tmp-area-';
const REPO_ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));

type TempAreaCliCommand = 'cleanup' | 'debug' | 'run' | 'watch';

export interface ExecCommandOptions {
  throwOnError?: boolean;
  stdio?: 'ignore' | 'inherit' | 'pipe';
  maxBuffer?: number;
}

export interface NodeScriptInvocation {
  command: string;
  args: string[];
}

export type VitestInvocation = NodeScriptInvocation;
export type AngularCliInvocation = NodeScriptInvocation;

function quoteShellArgument(argument: string): string {
  if (!argument) {
    return '""';
  }

  if (!/[\s"]/.test(argument)) {
    return argument;
  }

  return `"${argument.replace(/"/g, '\\"')}"`;
}

function isWithinRoot(targetPath: string, rootPath: string): boolean {
  const relativePath = relative(rootPath, targetPath);

  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}

function isValidMode(mode: string): mode is TestTempAreaMode {
  return mode === 'persistent' || mode === 'non-persistent';
}

function sanitizeAreaName(areaName: string): string {
  const trimmedName = areaName.trim();

  if (!trimmedName) {
    throw new Error('Temp area name cannot be empty.');
  }

  return Array.from(trimmedName, (character) => {
    const codePoint = character.charCodeAt(0);

    if (/[<>:"/\\|?*]/.test(character) || codePoint < 0x20) {
      return '-';
    }

    return character;
  }).join('');
}

export function resolveTempAreaOptions(
  options: TestTempAreaOptions = {},
): ResolvedTestTempAreaOptions {
  const requestedMode = options.mode ?? process.env[TEST_TEMP_AREA_MODE_ENV] ?? 'non-persistent';

  if (!isValidMode(requestedMode)) {
    throw new Error(
      `Unsupported temp area mode "${requestedMode}". Expected "persistent" or "non-persistent".`,
    );
  }

  const requestedAreaName = options.areaName ?? process.env[TEST_TEMP_AREA_NAME_ENV];

  return {
    mode: requestedMode,
    areaName: requestedAreaName ? sanitizeAreaName(requestedAreaName) : undefined,
    prefix: options.prefix ?? DEFAULT_PREFIX,
    tempRoot: options.tempRoot ?? DEFAULT_TEMP_ROOT,
  };
}

export function deleteTempArea(dirPath: string, tempRoot = DEFAULT_TEMP_ROOT): void {
  const resolvedDirPath = resolve(dirPath);
  const resolvedTempRoot = resolve(tempRoot);

  if (!isWithinRoot(resolvedDirPath, resolvedTempRoot)) {
    throw new Error(`Refusing to delete outside temp root: ${resolvedDirPath}`);
  }

  try {
    rmSync(resolvedDirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 2000 });
  } catch (error) {
    console.error(
      `[Cleanup] Failed to delete ${resolvedDirPath} due to a Windows file lock. Leaving temp directory behind.`,
      error,
    );
  }
}

export function createTempArea(options: TestTempAreaOptions = {}): TestTempAreaHandle {
  const resolvedOptions = resolveTempAreaOptions(options);

  mkdirSync(resolvedOptions.tempRoot, { recursive: true });

  let tempAreaPath: string;
  let tempAreaName: string;

  if (resolvedOptions.mode === 'persistent' && resolvedOptions.areaName) {
    tempAreaName = resolvedOptions.areaName;
    tempAreaPath = join(resolvedOptions.tempRoot, tempAreaName);
    mkdirSync(tempAreaPath, { recursive: true });
  } else {
    tempAreaPath = mkdtempSync(join(resolvedOptions.tempRoot, resolvedOptions.prefix));
    tempAreaName = basename(tempAreaPath);
  }

  return {
    path: tempAreaPath,
    mode: resolvedOptions.mode,
    areaName: tempAreaName,
    cleanup: () => {
      if (resolvedOptions.mode === 'non-persistent' && existsSync(tempAreaPath)) {
        deleteTempArea(tempAreaPath, resolvedOptions.tempRoot);
      }
    },
  };
}

export function getRepoRoot(): string {
  return REPO_ROOT;
}

export function execCommand(
  command: string,
  cwd: string,
  options: ExecCommandOptions = {},
): string {
  const throwOnError = options.throwOnError ?? true;

  try {
    return execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: options.stdio ?? (throwOnError ? 'pipe' : 'ignore'),
      maxBuffer: options.maxBuffer ?? DEFAULT_EXEC_COMMAND_MAX_BUFFER,
    });
  } catch (error) {
    if (throwOnError) {
      console.error(`Command failed: ${command}`);
      console.error(`Working directory: ${cwd}`);

      if (error instanceof Error && 'stdout' in error && 'stderr' in error) {
        console.error('stdout:', (error as Error & { stdout: unknown }).stdout);
        console.error('stderr:', (error as Error & { stderr: unknown }).stderr);
      }

      throw error;
    }

    return '';
  }
}

export function execFileCommand(
  command: string,
  args: readonly string[],
  cwd: string,
  options: ExecCommandOptions = {},
): string {
  const throwOnError = options.throwOnError ?? true;

  try {
    return execFileSync(command, args, {
      cwd,
      encoding: 'utf8',
      stdio: options.stdio ?? (throwOnError ? 'pipe' : 'ignore'),
      maxBuffer: options.maxBuffer ?? DEFAULT_EXEC_COMMAND_MAX_BUFFER,
    });
  } catch (error) {
    if (throwOnError) {
      console.error(`Command failed: ${command} ${args.join(' ')}`);
      console.error(`Working directory: ${cwd}`);

      if (error instanceof Error && 'stdout' in error && 'stderr' in error) {
        console.error('stdout:', (error as Error & { stdout: unknown }).stdout);
        console.error('stderr:', (error as Error & { stderr: unknown }).stderr);
      }

      throw error;
    }

    return '';
  }
}

export function createTempDir(tempRoot: string, prefix = DEFAULT_PREFIX): string {
  return createTempArea({ mode: 'non-persistent', prefix, tempRoot }).path;
}

export function deleteTempDir(dirPath: string, tempRoot: string): void {
  deleteTempArea(dirPath, tempRoot);
}

export function cleanupTempAreas(
  tempRoot: string,
  prefixes: readonly string[] = [E2E_TEMP_AREA_PREFIX],
): string[] {
  if (!existsSync(tempRoot)) {
    return [];
  }

  const deletedDirectories: string[] = [];

  for (const entry of readdirSync(tempRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !prefixes.some((prefix) => entry.name.startsWith(prefix))) {
      continue;
    }

    const dirPath = join(tempRoot, entry.name);
    deleteTempArea(dirPath, tempRoot);

    if (!existsSync(dirPath)) {
      deletedDirectories.push(dirPath);
    }
  }

  return deletedDirectories;
}

export function isE2EDebugMode(env: Record<string, string | undefined> = process.env): boolean {
  const value = env[E2E_DEBUG_ENV]?.trim().toLowerCase();

  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

export function createE2ETempArea(
  repoRoot: string,
  debugMode = isE2EDebugMode(),
): TestTempAreaHandle {
  return createTempArea({
    mode: debugMode ? 'persistent' : 'non-persistent',
    prefix: E2E_TEMP_AREA_PREFIX,
    tempRoot: repoRoot,
  });
}

export function getAngularCliInvocation(repoRoot = getRepoRoot()): AngularCliInvocation {
  const angularCliEntrypoint = join(repoRoot, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');

  if (!existsSync(angularCliEntrypoint)) {
    throw new Error(
      `Angular CLI entrypoint not found at ${angularCliEntrypoint}. Run npm install first.`,
    );
  }

  return {
    command: process.execPath,
    args: [angularCliEntrypoint],
  };
}

function getAngularCliPackageSpecifier(repoRoot = getRepoRoot()): string {
  const angularCliPackageJsonPath = join(
    repoRoot,
    'node_modules',
    '@angular',
    'cli',
    'package.json',
  );

  if (!existsSync(angularCliPackageJsonPath)) {
    throw new Error(
      `Angular CLI package metadata not found at ${angularCliPackageJsonPath}. Run npm install first.`,
    );
  }

  const angularCliPackageJson = JSON.parse(readFileSync(angularCliPackageJsonPath, 'utf8')) as {
    version?: string;
  };

  if (!angularCliPackageJson.version) {
    throw new Error(`Angular CLI package version missing in ${angularCliPackageJsonPath}.`);
  }

  return `@angular/cli@${angularCliPackageJson.version}`;
}

export function execAngularCli(
  args: readonly string[],
  cwd: string,
  options: ExecCommandOptions = {},
  repoRoot = getRepoRoot(),
): string {
  if (args[0] === 'new') {
    const packageSpecifier = getAngularCliPackageSpecifier(repoRoot);
    const command = ['npx', '--yes', packageSpecifier, ...args].map(quoteShellArgument).join(' ');

    return execCommand(command, cwd, options);
  }

  const invocation = getAngularCliInvocation(repoRoot);

  return execFileCommand(invocation.command, [...invocation.args, ...args], cwd, options);
}

export function getVitestInvocation(
  command: Exclude<TempAreaCliCommand, 'cleanup'>,
  repoRoot = getRepoRoot(),
): VitestInvocation {
  const vitestEntrypoint = join(repoRoot, 'node_modules', 'vitest', 'vitest.mjs');

  if (!existsSync(vitestEntrypoint)) {
    throw new Error(`Vitest entrypoint not found at ${vitestEntrypoint}. Run npm install first.`);
  }

  return {
    command: process.execPath,
    args:
      command === 'watch'
        ? [vitestEntrypoint, '--config', VITEST_E2E_CONFIG]
        : [vitestEntrypoint, 'run', '--config', VITEST_E2E_CONFIG],
  };
}

function runVitest(command: Exclude<TempAreaCliCommand, 'cleanup'>, env = process.env): number {
  const invocation = getVitestInvocation(command);

  const result = spawnSync(invocation.command, invocation.args, {
    cwd: getRepoRoot(),
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });

  if (result.error) {
    console.error('[E2E] Failed to launch Vitest:', result.error);
    return 1;
  }

  return result.status ?? 1;
}

export function main(args: string[] = process.argv.slice(2)): number {
  const command = (args[0] ?? 'run') as TempAreaCliCommand;
  const repoRoot = getRepoRoot();

  switch (command) {
    case 'cleanup': {
      const deletedDirectories = cleanupTempAreas(repoRoot);

      if (deletedDirectories.length > 0) {
        console.log(`[E2E] Removed ${deletedDirectories.length} stale temp area(s).`);
      } else {
        console.log('[E2E] No stale temp areas found.');
      }

      return 0;
    }

    case 'run':
    case 'watch': {
      cleanupTempAreas(repoRoot);
      return runVitest(command);
    }

    case 'debug': {
      return runVitest('run', { ...process.env, [E2E_DEBUG_ENV]: '1' });
    }

    default:
      console.error(`Unsupported temp-area command "${command}".`);
      return 1;
  }
}

export async function withTempArea<T>(
  run: (tempArea: TestTempAreaHandle) => Promise<T> | T,
  options: TestTempAreaOptions = {},
): Promise<T> {
  const tempArea = createTempArea(options);

  try {
    return await run(tempArea);
  } finally {
    tempArea.cleanup();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
