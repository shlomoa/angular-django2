import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  cleanupTempAreas,
  createE2ETempArea,
  createTempArea,
  createTempDir,
  deleteTempArea,
  deleteTempDir,
  E2E_APPLICATION_TEMP_AREA_PREFIX,
  E2E_DEBUG_ENV,
  E2E_TEMP_AREA_PREFIX,
  E2E_TEMP_AREA_PREFIXES,
  execAngularCli,
  getRepoRoot,
  getAngularCliInvocation,
  getVitestInvocation,
  isE2EDebugMode,
  sweepE2ETempAreas,
  VITEST_E2E_CONFIG,
  withTempArea,
} from '../../e2e/utils/temp_areas';
import { createE2EGlobalSetup } from '../../e2e/utils/global-setup';

describe('temp_areas', () => {
  // Every directory these tests create lives here, never in the repository.
  let scratchRoot = '';

  beforeAll(() => {
    scratchRoot = mkdtempSync(path.join(tmpdir(), 'ngdj-temp-areas-spec-'));
  });

  afterAll(() => {
    rmSync(scratchRoot, { recursive: true, force: true });
  });

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
    const testDirBase = scratchRoot;
    const tempDir = createTempDir(testDirBase, 'test-prefix-');

    try {
      expect(existsSync(tempDir)).toBe(true);
      expect(path.basename(tempDir).startsWith('test-prefix-')).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('deletes a directory safely within the provided root', () => {
    const testDirBase = scratchRoot;
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
    const testDirBase = scratchRoot;
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

  describe('E2E temp-area cleanup', () => {
    /** A scratch stand-in for the repository root, holding one area per E2E prefix plus a bystander. */
    function createFakeRepoRoot(): string {
      const root = mkdtempSync(path.join(scratchRoot, 'fake-repo-'));

      for (const prefix of E2E_TEMP_AREA_PREFIXES) {
        mkdirSync(path.join(root, `${prefix}left-behind`), { recursive: true });
      }
      mkdirSync(path.join(root, 'projects'), { recursive: true });

      return root;
    }

    function tempAreaNames(root: string): string[] {
      return E2E_TEMP_AREA_PREFIXES.flatMap((prefix) =>
        existsSync(path.join(root, `${prefix}left-behind`)) ? [`${prefix}left-behind`] : [],
      );
    }

    it('sweeps every E2E prefix by default, including application temp areas', () => {
      expect(E2E_TEMP_AREA_PREFIXES).toContain(E2E_TEMP_AREA_PREFIX);
      expect(E2E_TEMP_AREA_PREFIXES).toContain(E2E_APPLICATION_TEMP_AREA_PREFIX);

      const root = createFakeRepoRoot();
      const removed = cleanupTempAreas(root).map((dirPath) => path.basename(dirPath));

      expect(removed.sort()).toEqual(
        [...E2E_TEMP_AREA_PREFIXES].map((prefix) => `${prefix}left-behind`).sort(),
      );
      expect(existsSync(path.join(root, 'projects'))).toBe(true);
    });

    it('keeps every temp area when E2E debug mode is on', () => {
      const root = createFakeRepoRoot();

      expect(sweepE2ETempAreas(root, { [E2E_DEBUG_ENV]: '1' })).toEqual([]);
      expect(tempAreaNames(root)).toHaveLength(E2E_TEMP_AREA_PREFIXES.length);

      expect(sweepE2ETempAreas(root, {})).toHaveLength(E2E_TEMP_AREA_PREFIXES.length);
      expect(tempAreaNames(root)).toEqual([]);
    });

    it('global setup removes areas an earlier run left, then removes the areas this run leaves', () => {
      const root = createFakeRepoRoot();
      const messages: string[] = [];
      const teardown = createE2EGlobalSetup({
        repoRoot: root,
        env: {},
        log: (m) => messages.push(m),
      })();

      expect(tempAreaNames(root)).toEqual([]);
      expect(messages[0]).toContain('left by an earlier run');

      // The run leaves areas behind, as when a test fails before its finally block.
      for (const prefix of E2E_TEMP_AREA_PREFIXES) {
        mkdirSync(path.join(root, `${prefix}left-behind`), { recursive: true });
      }
      teardown();

      expect(tempAreaNames(root)).toEqual([]);
      expect(messages[1]).toContain('at the end of the run');
    });

    it('global setup removes the temp areas and exits with the conventional code when interrupted', () => {
      const cases = [
        ['SIGINT', 130],
        ['SIGTERM', 143],
        ['SIGHUP', 129],
      ] as const;

      for (const [signal, exitCode] of cases) {
        const root = createFakeRepoRoot();
        const source = new EventEmitter();
        const exits: number[] = [];
        const messages: string[] = [];
        createE2EGlobalSetup({
          repoRoot: root,
          env: {},
          log: (m) => messages.push(m),
          signals: source,
          exit: (code) => exits.push(code),
        })();

        // The run creates a workspace, then the user presses Ctrl-C before any teardown can run.
        for (const prefix of E2E_TEMP_AREA_PREFIXES) {
          mkdirSync(path.join(root, `${prefix}left-behind`), { recursive: true });
        }
        source.emit(signal);

        expect(tempAreaNames(root), signal).toEqual([]);
        expect(exits, signal).toEqual([exitCode]);
        expect(messages.at(-1), signal).toContain('after an interrupt');
      }
    });

    it('global setup stops listening for signals once the run has ended', () => {
      const source = new EventEmitter();
      const teardown = createE2EGlobalSetup({
        repoRoot: createFakeRepoRoot(),
        env: {},
        log: () => undefined,
        signals: source,
        exit: () => undefined,
      })();

      expect(source.listenerCount('SIGINT')).toBe(1);
      teardown();
      expect(source.listenerCount('SIGINT')).toBe(0);
      expect(source.listenerCount('SIGTERM')).toBe(0);
      expect(source.listenerCount('SIGHUP')).toBe(0);
    });

    it('global setup keeps everything in debug mode', () => {
      const root = createFakeRepoRoot();
      const messages: string[] = [];
      const teardown = createE2EGlobalSetup({
        repoRoot: root,
        env: { [E2E_DEBUG_ENV]: '1' },
        log: (m) => messages.push(m),
      })();
      teardown();

      expect(tempAreaNames(root)).toHaveLength(E2E_TEMP_AREA_PREFIXES.length);
      expect(messages).toEqual([expect.stringContaining('Debug mode enabled')]);
    });

    it('sweeps every prefix the E2E specs create temp areas with', () => {
      // A spec that invents its own prefix would leak, because no sweep would know it.
      const e2eDirectory = path.resolve(__dirname, '../../e2e');
      const specs = ['schematics.e2e.spec.ts', 'test_application.spec.ts'];
      const literalPrefixes = specs.flatMap((spec) =>
        [
          ...readFileSync(path.join(e2eDirectory, spec), 'utf8').matchAll(
            /['"`](ngdj-[a-z0-9-]*-)/g,
          ),
        ].map((match) => match[1]),
      );

      expect(literalPrefixes.filter((prefix) => !E2E_TEMP_AREA_PREFIXES.includes(prefix))).toEqual(
        [],
      );
    });

    it('is launched through a configuration that finds the suite and owns the cleanup', async () => {
      // `npm run test:e2e` once ran zero tests because the config it loaded pointed at a missing folder.
      const repoRoot = getRepoRoot();
      const projectConfig = (await import('../../vitest.e2e.config.mts')).default;
      const rootConfig = (await import(path.join(repoRoot, VITEST_E2E_CONFIG))).default;

      expect(rootConfig).toBe(projectConfig);
      expect(projectConfig.root).toBe(path.resolve(__dirname, '../..'));

      const test = projectConfig.test!;
      expect(test.include!.length).toBeGreaterThan(0);
      for (const include of test.include!) {
        expect(existsSync(path.join(projectConfig.root!, include)), include).toBe(true);
      }
      expect(test.globalSetup).toEqual([
        path.join(projectConfig.root!, 'e2e', 'utils', 'global-setup.ts'),
      ]);
      expect(existsSync((test.globalSetup as string[])[0])).toBe(true);
    });
  });
});
