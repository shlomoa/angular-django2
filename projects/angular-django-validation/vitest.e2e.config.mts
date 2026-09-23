import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['e2e/schematics.e2e.spec.ts', 'e2e/test_application.spec.ts'],
  },
});
