# GEMINI.md

This repository hosts `angular-django2`, an Angular 21 library workspace for a Django-friendly npm package.

`AGENTS.md` is the canonical shared instruction file for this repository.

## Repo Reality

- Library source: `projects/angular-django2`
- Build output: `dist/angular-django2`
- Standard verification: `npm run format:check`, `npm run test:ci`, `npm run build`

## Coding Expectations

- Optimize for an Angular library package, not an application scaffold.
- Prefer explicit integration points with Django over hidden behavior.
- Keep the public API small, typed, and intentional.
- Use Angular.dev-style examples based on standalone bootstrap and provider functions.
