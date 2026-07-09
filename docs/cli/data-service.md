# data-service

Generate a typed `*DataService` wrapper around a generated OpenAPI service.

```bash
ng generate angular-django2:data-service users
```

Use this after bootstrapping [`ng-api`](ng-api.md) and running
`npm run generate:api` to produce the underlying `*ApiService`:

```bash
ng generate angular-django2:ng-api --inputPath=openapi.json
npm install
npm run generate:api
ng generate angular-django2:data-service users
```

Options:

| Option         | Default                      | Description                                                                |
| -------------- | ------------------------------ | ---------------------------------------------------------------------------- |
| `name`         | Required positional argument   | Resource name, such as `users`, used for the generated `UsersDataService`. |
| `--project`    | Current Angular project        | Target project.                                                             |
| `--path`       | Angular CLI default path       | Destination path for the data service.                                     |
| `--apiService` | Inferred from `name`           | Generated OpenAPI service class to wrap, such as `UsersApiService`.        |
| `--apiPath`    | `../api/services`              | Import path to the generated API services.                                 |
| `--flat`       | `false`                        | Create the service directly in `path` instead of a subdirectory.           |
| `--skipTests`  | `false`                        | Do not create a spec file.                                                 |
