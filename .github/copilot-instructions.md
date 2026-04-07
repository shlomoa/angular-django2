# GitHub Copilot Instructions

This repository is for `angular-django2`, an Angular 21 library workspace for a Django-friendly npm package.

## Repository Status

The library source is in `projects/angular-django2`, the build output is `dist/angular-django2`, and the root `package.json` scripts are the source of truth for format, test, build, and release preparation.

## What To Optimize For

- Treat this as an Angular library package unless the user explicitly asks for an application.
- Keep Django integration boundaries explicit: configuration, auth boundaries, CSRF naming, and serialization behavior should be visible in code.
- Prefer clear TypeScript APIs, narrow public exports, and maintainable Angular patterns.
- Prefer standalone/provider-style Angular examples from Angular.dev.

## Change Behavior

- Prefer small, focused edits.
- Use existing files as the source of truth.
- Keep README and developer instructions synchronized with the actual repo contents.

## Verification

- Only report commands as passing if they were actually run.
- Use root package scripts instead of ad hoc commands whenever possible.
