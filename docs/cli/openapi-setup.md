# openapi-setup

Bootstrap `ng-openapi-gen` and generate Django integration helpers.

```bash
ng generate angular-django2:openapi-setup --openapi-spec-file=openapi.json
npm install
npm run generate:api
```

`openapi-setup` writes `ng-openapi-gen.json` (`input`, `output`, `services: true`
and `serviceSuffix: "ApiService"`, so `ng-openapi-gen` 1.x generates one
`<Tag>ApiService` per OpenAPI tag for [`data-service`](data-service.md) to wrap),
adds `ng-openapi-gen` to
`devDependencies`, and adds a `generate:api` npm script. It also generates
Django integration helpers under `--helpers-path` (default
`src/app/api-integration/`):

- `django-transport.ts` — `provideDjangoApiTransport()`, `readCsrfCookie()`,
  `djangoAuthInterceptor`, `djangoCredentialsInterceptor()`, and the
  `DJANGO_AUTH_TOKEN` credential seam (a bearer token, or Basic credentials
  with `--auth-scheme=basic`).
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

### Authorization scheme

`--auth-scheme` selects the `Authorization` header form the generated
`djangoAuthInterceptor` sends, matching the security scheme your OpenAPI
contract advertises. `DJANGO_AUTH_TOKEN` stays the single seam; the value its
factory returns depends on the scheme, and returning `null` sends no header.

| `--auth-scheme`    | Factory returns                  | Header sent                                          |
| ------------------ | -------------------------------- | ---------------------------------------------------- |
| `bearer` (default) | `string \| null` (the token)     | `Authorization: Bearer <token>`                      |
| `basic`            | `{ username, password } \| null` | `Authorization: Basic <base64 of username:password>` |

```bash
ng generate angular-django2:openapi-setup --auth-scheme=basic
```

```typescript
{ provide: DJANGO_AUTH_TOKEN, useValue: () => session.credentials() }
```

With `basic`, the credentials are encoded as UTF-8 and the factory is read on
every request, so keep them in memory and clear them on logout. The scheme is
fixed when `django-transport.ts` is first written: an existing file is skipped
on a re-run, so remove the file to regenerate it for another scheme.

Pass `--skip-helpers` to omit helper generation, or `--skip-tests` to omit the
co-located spec files.

Options:

| Option                | Default                   | Description                                                                          |
| --------------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| `--openapi-spec-file` | `openapi.json`            | Path to the OpenAPI schema file.                                                     |
| `--output-path`       | `src/app/api`             | Output directory for `ng-openapi-gen` generated services.                            |
| `--helpers-path`      | `src/app/api-integration` | Directory for the generated Django auth/CSRF/transport and resource adapter helpers. |
| `--auth-scheme`       | `bearer`                  | Authorization scheme of the generated interceptor: `bearer` or `basic`.              |
| `--skip-helpers`      | `false`                   | Skip generating the Django integration helpers.                                      |
| `--skip-tests`        | `false`                   | Do not generate spec files alongside the integration helpers.                        |

After generating typed services from your OpenAPI schema, wrap one with
[`data-service`](data-service.md).
