# complex-component

Generate, update, or remove an advanced standalone OnPush Angular Material
component. It composes the collection's [`component`](component.md) and
[`embed-component`](embed-component.md) schematics rather than reimplementing
their child wiring.

```bash
ng generate angular-django2:complex-component dashboard-card \
  --project=my-app \
  --path=src/app/features/dashboard \
  --features=mixins,nested,projection,cdk-overlay
```

`--name`, `--path`, and `--features` are required. Names must be kebab-case and
the path must remain inside the selected application's `sourceRoot`. When the
workspace has more than one application source root, pass `--project`.

Features are comma-separated and limited to:

- `mixins`: creates `_<name>-theme.scss` next to the component and registers its
  named Angular Material theme mixin in the application's SCSS theme entry point.
- `nested`: creates focused `<name>-header` and `<name>-content` children below
  the parent directory, then wires them into the parent through
  `embed-component`.
- `projection`: documents and creates header, default, and actions projection
  slots.
- `cdk-overlay`: adds explicit CDK overlay and Material button imports plus a
  minimal connected-overlay example.

The component source documents its public inputs, outputs, and projection slots.
`@angular/material` and `@angular/cdk` must already be installed.

Use `--mode=modify` to apply additional selected features to an existing complex
component. Use `--mode=delete --confirm=true` to remove its generated directory
and its registered theme mixin.
