import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createTempArea, deleteTempArea, withTempArea } from './utils/temp_areas';

describe('test temp area harness', () => {
  it('creates a new persistent temp area when no explicit name is provided', async () => {
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

  it('keeps a persistent temp area when an explicit name is provided', async () => {
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
});
