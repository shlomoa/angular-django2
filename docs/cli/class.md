# class

Generate an Angular class through Angular CLI. This collection wrapper only
adjusts an explicit path relative to a selected project, then delegates the
remaining behavior to `@schematics/angular:class`.

## Prerequisites

Run in an Angular workspace. To have a path resolved relative to a project,
provide both `--project` and `--path`.

## Command synopsis

```bash
ng generate angular-django2:class user-model --project=my-app --path=src/app/core/models
```

## Options and output

| Option      | Default  | Constraint or effect                                                                      |
| ----------- | -------- | ----------------------------------------------------------------------------------------- |
| `name`      | Required | Class name.                                                                               |
| `--path`    | —        | Destination path. With `--project`, a path outside the project root is resolved below it. |
| `--project` | —        | Target project used with `--path` resolution.                                             |

The wrapper accepts additional options and forwards them unchanged. Angular
CLI's [`class` documentation](https://angular.dev/cli/generate/class) defines
their defaults, constraints, and generated files.

## Related commands

Use [`service`](service.md) to create Angular services through the companion
pass-through wrapper.
