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

`--path` is required. `--name` and `--features` are required unless
`--document` is given (see [OpenUI composite containers](#openui-composite-containers)). Names must be kebab-case and
the path must remain inside the selected application's `sourceRoot`. When the
workspace has more than one application source root, pass `--project`.

Features are comma-separated and limited to:

- `mixins`: creates `_<name>-theme.scss` next to the component and registers its
  named Angular Material theme mixin in the application's SCSS theme entry point.
- `nested`: creates focused `<name>-header` and `<name>-content` children below
  the parent directory, then wires them into the parent through
  `embed-component`.
- `projection`: documents and creates header, default, and actions projection
  slots. Consumers should project multiple sibling elements via `<ng-container <name>-actions>` or `<ng-container <name>-header>` to avoid layout-distorting wrapper `<div>` tags.
- `cdk-overlay`: adds explicit CDK overlay and Material button imports plus a
  minimal connected-overlay example.

The component source documents its public inputs, outputs, projection slots, and `<ng-container>` projection BKM.
`@angular/material` and `@angular/cdk` must already be installed.

Use `--mode=modify` to apply additional selected features to an existing complex
component. Use `--mode=delete --confirm=true` to remove its generated directory
and its registered theme mixin.

## OpenUI composite containers

With `--document`, the component is compiled from an OpenUI `SurfaceContainers`
node instead of a feature list. `--features` is not allowed, only
`--mode=create` is supported, and `--name` defaults to the dasherized node id.

```bash
ng generate angular-django2:complex-component --document=src/app/app.openui.json \
  --node-id=profileCard --path=src/app/features
```

The node becomes a Material card whose header, content, and actions each keep a
consumer projection slot and host the embedded document children:

- `[title]` becomes `<mat-card-title>`.
- Children are placed by `[slot]` (`header`, `content`, or `actions`; default
  `content`) and compiled as described for [`component`](component.md#openui-surface-containers).
  A `Form` child with `TextInputs` children produces Card → Form → Controls.
- One optional `OverlayContainers` child adds the CDK connected overlay: its
  `[label]` is the toggle button text (default `Toggle details`) and its
  children are embedded inside the overlay card. Overlay children cannot set
  `[slot]`.
