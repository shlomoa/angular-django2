# project-structure

Create the collection's standard application directory structure with empty
barrel exports. Use it after [`application`](application.md) and, when needed,
[`material-setup`](material-setup.md); [`material-app`](material-app.md)
performs those stages as part of its composite flow.

## Prerequisites

An Angular workspace containing the target project.

## Command synopsis

```bash
ng generate angular-django2:project-structure --project=my-app
```

## Options

| Option      | Default  | Constraint or effect                                           |
| ----------- | -------- | -------------------------------------------------------------- |
| `--project` | Required | Existing Angular project name.                                 |
| `--prefix`  | `app`    | Compatibility option forwarded by the application composition. |

## Generated and modified output

Under the selected project's `src/app`, the schematic creates or maintains
barrel `index.ts` files for `core`, `shared`, `shared/components`,
`shared/pipes`, and `features`. A non-empty existing barrel is left unchanged;
an empty or generated barrel is created or refreshed.

## Related commands

- [`application`](application.md) creates the target project.
- [`material-setup`](material-setup.md) configures Material separately.
- [`material-app`](material-app.md) combines application, Material, and
  directory setup, then writes a Material layout.
