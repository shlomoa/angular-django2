# openapi-setup

Bootstrap `ng-openapi-gen` and generate Django integration helpers.

```bash
ng generate angular-django2:openapi-setup --openapi-spec-file=openapi.json
npm install
npm run generate:api
```

`openapi-setup` writes `ng-openapi-gen.json`, adds `ng-openapi-gen` to
`devDependencies`, and adds a `generate:api` npm script. It also generates
Django integration helpers under `--helpers-path` (default
`src/app/api-integration/`):

- `django-transport.ts` — `provideDjangoApiTransport()`, `readCsrfCookie()`,
  `djangoAuthInterceptor`, `djangoCredentialsInterceptor()`, and the
  `DJANGO_AUTH_TOKEN` bearer-token seam.
- `resource-adapter.ts` — `ResourceAdapter<T>` base with DRF-style
  `PaginatedResult` and `ResourceQuery`, plus shared `catchError` handling.
- `index.ts` — barrel re-export for the above files, with co-located specs.

Compose `provideDjangoApiTransport` at application bootstrap:

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideDjangoApiTransport({ csrfCookieName: 'csrftoken' }),
    { provide: DJANGO_AUTH_TOKEN, useValue: () => sessionStore.token() },
  ],
};
```

Pass `--skip-helpers` to omit helper generation, or `--skip-tests` to omit the
co-located spec files.

Options:

| Option                | Default                   | Description                                                                          |
| --------------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| `--openapi-spec-file` | `openapi.json`            | Path to the OpenAPI schema file.                                                     |
| `--output-path`       | `src/app/api`             | Output directory for `ng-openapi-gen` generated services.                            |
| `--helpers-path`      | `src/app/api-integration` | Directory for the generated Django auth/CSRF/transport and resource adapter helpers. |
| `--skip-helpers`      | `false`                   | Skip generating the Django integration helpers.                                      |
| `--skip-tests`        | `false`                   | Do not generate spec files alongside the integration helpers.                        |

After generating typed services from your OpenAPI schema, wrap one with
[`data-service`](data-service.md).
