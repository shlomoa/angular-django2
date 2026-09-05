# material-setup

Configure Angular Material styling and an animation provider in an existing
Angular project. Use it after [`application`](application.md), or use
[`material-app`](material-app.md) when that composite flow is more suitable.

## Prerequisites

- An Angular workspace containing the target project and its build options.
- `@angular/material` installed before the generated Sass and imports are
  compiled.

## Command synopsis

```bash
ng generate angular-django2:material-setup --project=my-app
```

## Options

| Option         | Default       | Constraint or effect                                                                    |
| -------------- | ------------- | --------------------------------------------------------------------------------------- |
| `--project`    | Required      | Existing Angular project name.                                                          |
| `--theme`      | `indigo-pink` | One of `indigo-pink`, `deeppurple-amber`, `pink-bluegrey`, `purple-green`, or `custom`. |
| `--typography` | `true`        | Includes Material typography in a generated custom theme.                               |
| `--animations` | `true`        | Adds `provideAnimations()`; `false` adds `provideNoopAnimations()` instead.             |

## Generated and modified output

For a prebuilt theme, the schematic adds its stylesheet to the target build's
`angular.json` `styles` array. For `custom`, it writes the Material Sass theme
to the project's `src/styles.scss`; otherwise it records that the theme is
loaded through `angular.json`. When `src/app/app.config.ts` exists and has a
providers array, it adds the selected animation provider. Existing Material
style or animation-provider configuration is left unchanged.

## Related commands

- [`application`](application.md) creates the Angular project this configures.
- [`project-structure`](project-structure.md) adds the collection's standard
  application directories.
- [`material-app`](material-app.md) composes those setup stages and adds the
  Material sidenav layout.
