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
| `--api-path`    | `../api/services`            | Import path to the generated API services.                                 |
| `--flat`        | `false`                      | Create the service directly in `path` instead of a subdirectory.           |
| `--skip-tests`  | `false`                      | Do not create a spec file.                                                 |

## OpenUI data bindings

With `--document`, the service is generated for a node bound with
`[data]="<apiPath>#<ApiService>"` (the first such node, or the one named by
`--node-id`); `--api-service` and `--api-path` are not allowed.

```json
{
  "id": "orderRows",
  "type": "Table",
  "attrs": { "[data]": "src/app/api/services#OrdersApiService" }
}
```

`<apiPath>` is the application path of the generated `services` module, turned
into an import relative to the generated service; `<ApiService>` is the service
class. `--name` defaults to the dasherized node id, and paths resolve inside the
selected project. `(paginate)`, `(sort)`, and `(filter)` are left to the widget
compilers.
