# embed-component

Embed a component into a parent component.

```bash
ng generate angular-django2:embed-component --component=<path> --parent=<path>
```

## Modes

**File mode** (default) wires a locally generated component into the parent:

- `--component` — workspace-relative path to the child `.ts` file.
- `--parent` — workspace-relative path to the parent `.ts` file.

In file mode the child's `selector`, `input()`/`model()` inputs, and `output()`
outputs are auto-discovered from the child source; `--selector`, `--inputs`,
and `--outputs` are ignored.

**Package mode** (add `--from`) wires an existing exported component — such as
an Angular Material component — into the parent:

- `--component` — exported class name (e.g. `MatDateRangePicker`).
- `--from` — module specifier to import the class from (e.g.
  `@angular/material/datepicker`).
- `--selector` — element selector; defaults to the dasherized class name (e.g.
  `mat-date-range-picker`).
- `--inputs`, `--outputs` — comma-separated names wired on the element.

## What it does

- Adds the child element after the parent template's
  `<!-- Begin children section -->` marker, feeding each input as
  `[input]="undefined"` and binding each output to `(output)="on<Output>($event)"`.
- Imports the child class and registers it in the parent's standalone `imports`
  array (after the `// End import section` marker when present).
- Adds stub `on<Output>()` handlers that `throw` a "not implemented" error, so
  the wired output is scaffolding you complete.

Every transformation is idempotent; embedding the same child twice does not
duplicate wiring.

## Requirements

- The parent must declare an **external template** via `templateUrl`. When the
  parent uses an inline `template:`, the schematic logs a warning and skips HTML
  embedding (the TypeScript import and `imports` entry are still applied).
- Marker-based edits target the markers produced by the
  [`component`](component.md) schematic (`<!-- Begin children section -->` and
  `// End import section`). When a marker is absent, the schematic falls back to
  appending after the import block or at the end of the template.

Use this to wire a component generated with [`component`](component.md) into a
parent using its embedding markers.
