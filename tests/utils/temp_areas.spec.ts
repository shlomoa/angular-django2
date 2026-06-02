import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  cleanupTempAreas,
  createE2ETempArea,
  createTempArea,
  createTempDir,
  deleteTempArea,
  deleteTempDir,
  E2E_DEBUG_ENV,
  E2E_TEMP_AREA_PREFIX,
  execAngularCli,
  getRepoRoot,
  getAngularCliInvocation,
  getVitestInvocation,
  isE2EDebugMode,
  VITEST_E2E_CONFIG,
  withTempArea,
} from './temp_areas';

describe('temp_areas', () => {
  it('returns the repository root directory as an absolute path', () => {
    const root = getRepoRoot();

    expect(path.isAbsolute(root)).toBe(true);
    expect(existsSync(path.join(root, 'package.json'))).toBe(true);
    expect(existsSync(path.join(root, 'angular.json'))).toBe(true);
    expect(existsSync(path.join(root, 'AGENTS.md'))).toBe(true);
  });

  it('creates a new persistent temp area when no explicit name is provided', () => {
    const persistentArea = createTempArea({
      mode: 'persistent',
      prefix: 'persistent-generated-',
    });

    try {
      expect(existsSync(persistentArea.path)).toBe(true);
      expect(path.basename(persistentArea.path)).toContain('persistent-generated-');

      persistentArea.cleanup();

      expect(existsSync(persistentArea.path)).toBe(true);
    } finally {
      deleteTempArea(persistentArea.path);
    }
  });

  it('keeps a persistent temp area when an explicit name is provided', () => {
    const areaName = `persistent-area-${Date.now().toString(36)}`;
    const persistentArea = createTempArea({
      mode: 'persistent',
      areaName,
      prefix: 'persistent-area-',
    });

    try {
      const markerFilePath = path.join(persistentArea.path, 'marker.txt');
      writeFileSync(markerFilePath, 'still here', 'utf8');

      expect(existsSync(persistentArea.path)).toBe(true);
      expect(existsSync(markerFilePath)).toBe(true);

      persistentArea.cleanup();

      expect(existsSync(persistentArea.path)).toBe(true);

      const reopenedArea = createTempArea({
        mode: 'persistent',
        areaName,
        prefix: 'persistent-area-',
      });

      expect(reopenedArea.path).toBe(persistentArea.path);
      expect(existsSync(path.join(reopenedArea.path, 'marker.txt'))).toBe(true);
    } finally {
      deleteTempArea(persistentArea.path);
    }
  });

  it('deletes a non-persistent temp area after the test finishes', async () => {
    let createdTempAreaPath = '';

    await withTempArea(
      (tempArea) => {
        createdTempAreaPath = tempArea.path;
        writeFileSync(path.join(tempArea.path, 'marker.txt'), 'temporary', 'utf8');

        expect(existsSync(tempArea.path)).toBe(true);
        expect(existsSync(path.join(tempArea.path, 'marker.txt'))).toBe(true);
      },
      {
        mode: 'non-persistent',
        prefix: 'non-persistent-area-',
      },
    );

    expect(createdTempAreaPath).toBeTruthy();
    expect(existsSync(createdTempAreaPath)).toBe(false);
  });

  it('creates a temp directory with the given prefix', () => {
    const root = getRepoRoot();
    const testDirBase = path.join(root, 'tests');
    const tempDir = createTempDir(testDirBase, 'test-prefix-');

    try {
      expect(existsSync(tempDir)).toBe(true);
      expect(path.basename(tempDir).startsWith('test-prefix-')).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('deletes a directory safely within the provided root', () => {
    const root = getRepoRoot();
    const testDirBase = path.join(root, 'tests');
    const tempDir = createTempDir(testDirBase, 'test-del-prefix-');

    expect(existsSync(tempDir)).toBe(true);

    deleteTempDir(tempDir, testDirBase);
    expect(existsSync(tempDir)).toBe(false);
  });

  it('throws an error when attempting to delete outside the provided root', () => {
    const root = getRepoRoot();
    const outsideDir = path.resolve(root, '..', 'some-outside-dir');

    expect(() => {
      deleteTempDir(outsideDir, root);
    }).toThrow(/Refusing to delete outside temp root/);
  });

  it('creates repo-root E2E temp areas that clean up in regular mode', () => {
    const repoRoot = getRepoRoot();
    const tempArea = createE2ETempArea(repoRoot, false);

    expect(path.basename(tempArea.path).startsWith(E2E_TEMP_AREA_PREFIX)).toBe(true);
    expect(existsSync(tempArea.path)).toBe(true);

    tempArea.cleanup();

    expect(existsSync(tempArea.path)).toBe(false);
  });

  it('preserves repo-root E2E temp areas in debug mode', () => {
    const repoRoot = getRepoRoot();
    const tempArea = createE2ETempArea(repoRoot, true);

    try {
      tempArea.cleanup();
      expect(existsSync(tempArea.path)).toBe(true);
    } finally {
      deleteTempArea(tempArea.path, repoRoot);
    }
  });

  it('deletes only matching stale temp areas inside the provided root', () => {
    const repoRoot = getRepoRoot();
    const testDirBase = path.join(repoRoot, 'tests');
    const cleanupRoot = createTempDir(testDirBase, 'e2e-cleanup-root-');
    const staleOne = path.join(cleanupRoot, `${E2E_TEMP_AREA_PREFIX}stale-one`);
    const staleTwo = path.join(cleanupRoot, `${E2E_TEMP_AREA_PREFIX}stale-two`);
    const keepDirectory = path.join(cleanupRoot, 'keep-me');

    try {
      mkdirSync(staleOne, { recursive: true });
      mkdirSync(staleTwo, { recursive: true });
      mkdirSync(keepDirectory, { recursive: true });

      const deletedDirectories = cleanupTempAreas(cleanupRoot, [E2E_TEMP_AREA_PREFIX])
        .map((dirPath) => path.basename(dirPath))
        .sort();

      expect(deletedDirectories).toEqual([
        `${E2E_TEMP_AREA_PREFIX}stale-one`,
        `${E2E_TEMP_AREA_PREFIX}stale-two`,
      ]);
      expect(existsSync(keepDirectory)).toBe(true);
    } finally {
      rmSync(cleanupRoot, { recursive: true, force: true });
    }
  });

  it('treats truthy E2E debug environment values as enabled', () => {
    expect(isE2EDebugMode({ [E2E_DEBUG_ENV]: '1' })).toBe(true);
    expect(isE2EDebugMode({ [E2E_DEBUG_ENV]: 'true' })).toBe(true);
    expect(isE2EDebugMode({ [E2E_DEBUG_ENV]: 'yes' })).toBe(true);
  });

  it('treats missing or falsy E2E debug environment values as disabled', () => {
    expect(isE2EDebugMode({})).toBe(false);
    expect(isE2EDebugMode({ [E2E_DEBUG_ENV]: '0' })).toBe(false);
    expect(isE2EDebugMode({ [E2E_DEBUG_ENV]: 'false' })).toBe(false);
  });

  it('launches E2E vitest through the Node entrypoint instead of npx.cmd', () => {
    const repoRoot = getRepoRoot();
    const invocation = getVitestInvocation('run', repoRoot);

    expect(invocation.command).toBe(process.execPath);
    expect(invocation.args).toEqual([
      path.join(repoRoot, 'node_modules', 'vitest', 'vitest.mjs'),
      'run',
      '--config',
      VITEST_E2E_CONFIG,
    ]);
  });

  it('launches Angular CLI through the local Node entrypoint instead of shell wrappers', () => {
    const repoRoot = getRepoRoot();
    const invocation = getAngularCliInvocation(repoRoot);

    expect(invocation.command).toBe(process.execPath);
    expect(invocation.args).toEqual([
      path.join(repoRoot, 'node_modules', '@angular', 'cli', 'bin', 'ng.js'),
    ]);
  });

  it('can execute Angular CLI via the shared cross-platform helper', () => {
    const repoRoot = getRepoRoot();
    const versionOutput = execAngularCli(['version'], repoRoot);

    expect(versionOutput).toContain('Angular CLI');
  });
});
