import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['projects/angular-django-validation/unit/**/*.spec.ts'],
    exclude: ['projects/angular-django-validation/e2e/**'],
  },
});
