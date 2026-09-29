// The E2E suite lives in the validation workspace. The temp-area entrypoint
// launches Vitest from the repository root with this file name, so it re-exports
// the real configuration instead of keeping a second, stale copy.
export { default } from './projects/angular-django-validation/vitest.e2e.config.mts';
