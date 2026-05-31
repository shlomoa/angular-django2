import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

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

const DEFAULT_TEMP_ROOT = join(tmpdir(), 'angular-django2-test');
const DEFAULT_PREFIX = 'tmp-area-';

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

  if (!resolvedDirPath.startsWith(resolvedTempRoot)) {
    throw new Error(`Refusing to delete outside temp root: ${resolvedDirPath}`);
  }

  rmSync(resolvedDirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
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
