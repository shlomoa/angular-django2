# CLAUDE.md

This repository is `angular-django2`, an Angular 21 library workspace for a Django-friendly npm package.

Use [AGENTS.md](./AGENTS.md) as the canonical shared guidance.

## Repo Notes

- Library code lives in `projects/angular-django2`.
- The publishable package is built into `dist/angular-django2`.
- Root scripts are the source of truth for format, test, build, and release preparation.

## Coding Guidance

- Prefer standalone Angular patterns and provider functions.
- Keep Django-related configuration and CSRF behavior explicit.
- Keep the public API small and typed.
- Avoid speculative abstractions and unnecessary boilerplate.
