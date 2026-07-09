# ng-api

Bootstrap `ng-openapi-gen` and generate Django integration helpers.

```bash
ng generate angular-django2:ng-api --inputPath=openapi.json
npm install
npm run generate:api
```

`ng-api` writes `ng-openapi-gen.json`, adds `ng-openapi-gen` to
`devDependencies`, and adds a `generate:api` npm script. It also generates
Django integration helpers under `--helpersPath` (default
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

Pass `--skipHelpers` to omit helper generation, or `--skipTests` to omit the
co-located spec files.

Options:

| Option          | Default                   | Description                                                                          |
| --------------- | -------------------------- | -------------------------------------------------------------------------------------- |
| `--inputPath`   | `openapi.json`             | Path to the OpenAPI schema file.                                                       |
| `--outputPath`  | `src/app/api`              | Output directory for `ng-openapi-gen` generated services.                             |
| `--helpersPath` | `src/app/api-integration`  | Directory for the generated Django auth/CSRF/transport and resource adapter helpers.  |
| `--skipHelpers` | `false`                     | Skip generating the Django integration helpers.                                       |
| `--skipTests`   | `false`                     | Do not generate spec files alongside the integration helpers.                          |

After generating typed services from your OpenAPI schema, wrap one with
[`data-service`](data-service.md).
