import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { getRepoRoot, createTempDir, deleteTempDir } from './tmpfiles';

describe('getRepoRoot', () => {
  it('returns the repository root directory as an absolute path', () => {
    const root = getRepoRoot();
    expect(path.isAbsolute(root)).toBe(true);
  });

  it('points to a directory containing the workspace root files', () => {
    const root = getRepoRoot();
    // Validate we are actually at the top level of angular-django2 repo
    expect(fs.existsSync(path.join(root, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'angular.json'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'AGENTS.md'))).toBe(true);
  });
});

describe('createTempDir', () => {
  it('creates a temporary directory with the given prefix', () => {
    const root = getRepoRoot();
    const testDirBase = path.join(root, 'tests');
    const tempDir = createTempDir(testDirBase, 'test-prefix-');
    
    expect(fs.existsSync(tempDir)).toBe(true);
    expect(path.basename(tempDir).startsWith('test-prefix-')).toBe(true);
    
    // cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

describe('deleteTempDir', () => {
  it('deletes a directory safely within the repo root', () => {
    const root = getRepoRoot();
    const testDirBase = path.join(root, 'tests');
    const tempDir = createTempDir(testDirBase, 'test-del-prefix-');
    
    expect(fs.existsSync(tempDir)).toBe(true);
    
    deleteTempDir(tempDir, root);
    expect(fs.existsSync(tempDir)).toBe(false);
  });

  it('throws an error when attempting to delete outside the repo root', () => {
    const root = getRepoRoot();
    const outsideDir = path.resolve(root, '..', 'some-outside-dir');
    
    expect(() => {
      deleteTempDir(outsideDir, root);
    }).toThrow(/Refusing to delete outside repo root/);
  });
});

