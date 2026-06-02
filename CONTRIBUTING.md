# Contributing

Contact shlomoa@lightmoneysw.com with questions about contributing and before opening a PR and the project in general.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Use the formatting commands as needed:

   ```bash
   npm run format:check
   npm run format
   ```

   `npm run format:check` checks file formatting. `npm run format` fixes file
   formatting.

3. Run the main verification commands as needed:

   ```bash
   npm run format:check
   ng lint
   npm run test:node
   npm run test:ci
   npm run build
   ```

## Project Layout

- `projects/angular-django2`: publishable Angular library source and schematics
- `dist/angular-django2`: generated package output after a build
- `.github/workflows`: CI and publishing automation
- `tools`: small repository automation scripts

## Development Notes

- Keep the public API in `projects/angular-django2/src/public-api.ts` intentional and small.
- Prefer standalone Angular patterns and provider functions over module-centric APIs.
- Keep Django-related concerns explicit, especially config, URL handling, and CSRF naming.
- Keep schematics thin wrappers around Angular CLI behavior until you have a concrete customization to add.
- Update documentation when commands or package behavior change.

## Release Prep

Use the documented release flow in [docs/RELEASING.md](./docs/RELEASING.md).
