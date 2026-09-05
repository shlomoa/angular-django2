# service

Generate an Angular service through Angular CLI. This collection wrapper only
adjusts an explicit path relative to a selected project, then delegates the
remaining behavior to `@schematics/angular:service`.

## Prerequisites

Run in an Angular workspace. To have a path resolved relative to a project,
provide both `--project` and `--path`.

## Command synopsis

```bash
ng generate angular-django2:service users --project=my-app --path=src/app/core
```

## Options and output

| Option      | Default  | Constraint or effect                                                                      |
| ----------- | -------- | ----------------------------------------------------------------------------------------- |
| `name`      | Required | Service name.                                                                             |
| `--path`    | —        | Destination path. With `--project`, a path outside the project root is resolved below it. |
| `--project` | —        | Target project used with `--path` resolution.                                             |

The wrapper accepts additional options and forwards them unchanged. Angular
CLI's [`service` documentation](https://angular.dev/cli/generate/service)
defines their defaults, constraints, and generated files.

## Related commands

Use [`data-service`](data-service.md) instead when wrapping an
OpenAPI-generated API service with Django-oriented CRUD helpers.
