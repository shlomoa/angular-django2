# data-service

Generate a typed `*DataService` wrapper around a generated OpenAPI service.

```bash
ng generate angular-django2:data-service users
```

Use this after bootstrapping [`openapi-setup`](openapi-setup.md) and running
`npm run generate:api` to produce the underlying `*ApiService`:

```bash
ng generate angular-django2:openapi-setup --openapi-spec-file=openapi.json
npm install
npm run generate:api
ng generate angular-django2:data-service users
```

Options:

| Option          | Default                      | Description                                                                |
| --------------- | ---------------------------- | -------------------------------------------------------------------------- |
| `name`          | Required positional argument | Resource name, such as `users`, used for the generated `UsersDataService`. |
| `--project`     | Current Angular project      | Target project.                                                            |
| `--path`        | Angular CLI default path     | Destination path for the data service.                                     |
| `--api-service` | Inferred from `name`         | Generated OpenAPI service class to wrap, such as `UsersApiService`.        |
| `--api-path`    | From `ng-openapi-gen.json`   | Where the generated API services are: a relative specifier or an app path. |
| `--flat`        | `false`                      | Create the service directly in `path` instead of a subdirectory.           |
| `--skip-tests`  | `false`                      | Do not create a spec file.                                                 |

## Expected input

Run `data-service` after [`openapi-setup`](openapi-setup.md) and
`npm run generate:api`, with `ng-openapi-gen` 1.0.5 or later and `services: true`
(the `openapi-setup` default).

- The resource name maps to the OpenAPI tag. The wrapped class is
  `classify(name)` plus the `serviceSuffix` of `ng-openapi-gen.json`
  (`ApiService` by default), for example `search` wraps `SearchApiService`
  from `services/search-api.service.ts`. `--api-service` overrides the class.
- The barrel `services.ts` and `strict-http-response.ts` are in the output root
  of the client (`output` of `ng-openapi-gen.json`, default `src/app/api`).
- The client and the data service are in the same project. The import is a
  relative specifier; path aliases and `baseUrl` mappings are not used.
- `ng-openapi-gen` 1.x services return a `Promise`, but the callbacks passed to
  `search`, `list`, `get`, `create` and `update` return
  `Observable<StrictHttpResponse<T>>`; adapt with `from(...)`.

### Where the import points

Without `--api-path`, the import is computed from the data service file to
`<output>/services` and `<output>/strict-http-response`, with `output` read
from `ng-openapi-gen.json` (or `src/app/api` when the file is missing). With the
defaults, `src/app/features/search/services/search/search.data.service.ts`
imports `../../../../api/services`. `--api-path` is either:

- a relative specifier (starts with `.`), used verbatim, for example
  `../../../../api/services`; or
- an application path, relativized to the data service, for example
  `src/app/shared/api/services`.

### Checks

When the generated client is in the workspace, `data-service` fails before
writing a file if:

- `services.ts` does not export the wrapped class. The message lists the
  exported services, which catches `customer` against the tag `customers`;
- `strict-http-response.ts` is missing from the output root; or
- `ng-openapi-gen.json` sets `services: false`.

When the client has not been generated yet, `data-service` warns and writes
the file with the computed import.

## OpenUI data bindings

With `--document`, the service is generated for a node bound with
`uses.data` set to the unquoted expression `<apiPath>#<ApiService>` (the first
such node, or the one named by `--node-id`); `--api-service` and `--api-path` are not allowed.

```json
{
  "id": "orderRows",
  "type": "Table",
  "attrs": { "uses.data": "src/app/api/services#OrdersApiService" }
}
```

`<apiPath>` is the application path of the generated `services` module, turned
into an import relative to the generated service; `<ApiService>` is the service
class. `--name` defaults to the dasherized node id, and paths resolve inside the
selected project. `behaves.paginate`, `behaves.sort`, and `behaves.filter` are left to the widget
compilers.
