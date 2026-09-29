import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Pin the root so the suite is found however and from wherever Vitest is launched.
  root: projectRoot,
  test: {
    environment: 'node',
    include: ['e2e/schematics.e2e.spec.ts', 'e2e/test_application.spec.ts'],
    globalSetup: [fileURLToPath(new URL('./e2e/utils/global-setup.ts', import.meta.url))],
  },
});
