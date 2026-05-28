# angular django2 repo Repo Instructions

Read [these instructions first](https://github.com/shlomoa/internal/blob/main/github/copilot-instructions.md)

## Repository Status

**Library (`projects/angular-django2/src/lib`) — implemented:**

- `AngularDjango2Config` interface (`apiBaseUrl`, `csrfCookieName`, `csrfHeaderName`, `withCredentials`)
- `DEFAULT_ANGULAR_DJANGO2_CONFIG` with Django-convention defaults (`csrftoken` / `X-CSRFToken`, `withCredentials: true`)
- `ANGULAR_DJANGO2_CONFIG` injection token with default factory
- `provideAngularDjango2(config?)` provider function — the public API entry point
- `AngularDjango2Service` with `buildUrl(path)` and `csrfHeader(token)` utilities

**Not yet implemented:**

- HTTP interceptor for CSRF injection and `withCredentials` — `csrfHeader()` exists but no interceptor wires it
- No HTTP client integration beyond manual utilities
- When asked about CSRF or HTTP integration, propose a functional `HttpInterceptorFn` that reads the CSRF cookie (per `ANGULAR_DJANGO2_CONFIG`) and injects the header on unsafe methods (`POST`/`PUT`/`PATCH`/`DELETE`), registered via `provideHttpClient(withInterceptors([...]))`.

**Schematics (`projects/angular-django2/schematics`):**

- `ng-add` — registers the collection in `angular.json`; unit tests and `CONTRACT.md`
- `application` — Angular app with `standalone: true`, `routing: true`, `style: 'scss'` defaults
- `material-setup` — configures Angular Material theming and providers in an existing project
- `project-structure` — creates `core/`, `shared/components/`, `shared/pipes/`, `features/` with barrel exports
- `component` — Angular component with `standalone: true` and `changeDetection: OnPush` defaults
- `app-shell`, `service`, `class` — pass-through to Angular CLI schematics
- `ng-app` — combined schematic: runs `application` + installs Material deps + configures theming + creates directory structure + writes a sidenav app shell
- `ng-api` — bootstraps ng-openapi-gen: adds devDependency, writes `ng-openapi-gen.json`, adds `generate:api` npm script
- `data-service` — generates a typed `*DataService` wrapper around an ng-openapi-gen `*ApiService` with search/CRUD helpers

**Release state:** v0.1.3, pre-release; published to npm as [`angular-django2`](https://www.npmjs.com/package/angular-django2) — not production-ready
Pre-1.0: breaking changes are allowed in minor versions but must be called out in PR descriptions and `CHANGELOG.md`.

## Testing

- Use Vitest-based tests, including schematic tests that use `SchematicTestRunner` conventions already used in this repo.
- New schematics should include unit tests following the `ng-add` testing pattern.

## What To Optimize For

- Treat this as an Angular library package unless the user explicitly asks for an application.
- If the user's request is ambiguous between library and application scope, ask one clarifying question before generating code.
- Keep Django integration boundaries explicit: configuration, auth boundaries, CSRF naming, and serialization behavior should be visible in code.
- Prefer clear TypeScript APIs, narrow public exports, and maintainable Angular patterns.
- All public exports must go through `projects/angular-django2/src/public-api.ts`. Do not export internal helpers; mark internal symbols with `@internal`.
- Use Angular's modern standalone components and provider functions (no NgModules). Do not fabricate Angular.dev URLs; only reference documentation when the user asks.

---
