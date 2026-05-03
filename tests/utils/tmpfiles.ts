import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * Returns the absolute path to the root directory of the git repository.
 * This provides an OS-independent way to anchor workspace paths.
 */
export function getRepoRoot(): string {
  return execSync('git rev-parse --show-toplevel')
    .toString()
    .trim();
}

/**
 * Creates a unique temporary directory inside the specified repository root.
 * 
 * @param repoRoot - The directory where the temp folder should be created.
 * @param prefix - A prefix for the temporary directory name (default: 'tmp-').
 * @returns The absolute path to the newly created temporary directory.
 */
export function createTempDir(repoRoot: string, prefix = 'tmp-'): string {
  // mkdtemp requires the prefix to be part of the full path
  const base = join(repoRoot, prefix);

  const parentDir = dirname(base);
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }

  return mkdtempSync(base);
}

/**
 * Deletes a temporary directory. Includes a safety guard to ensure 
 * the deleted directory is inside the allowed repository root.
 * 
 * @param dirPath - The path of the directory to be deleted.
 * @param repoRoot - The repository root path, acting as a safety boundary.
 * @throws Error if the directory to delete is outside the specified repository root.
 */
export function deleteTempDir(dirPath: string, repoRoot: string): void {
  const resolvedDir = resolve(dirPath);
  const resolvedRoot = resolve(repoRoot);

  // Safety guard: only allow deletion inside repo root
  if (!resolvedDir.startsWith(resolvedRoot)) {
    throw new Error(`Refusing to delete outside repo root: ${resolvedDir}`);
  }

  try {
    rmSync(resolvedDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 2000 });
  } catch (error) {
    if (
      process.platform === 'win32' &&
      error instanceof Error &&
      'code' in error &&
      (error.code === 'EPERM' || error.code === 'EBUSY' || error.code === 'ENOTEMPTY')
    ) {
      console.error(
        `[Cleanup] Failed to delete ${resolvedDir} due to a Windows file lock. Leaving temp directory behind.`,
      );
      return;
    }

    throw error;
  }
}
