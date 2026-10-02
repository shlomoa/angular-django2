# stepper

Compile an OpenUI `Stepper` element into a standalone `OnPush` Angular Material
stepper component.

```bash
ng generate angular-django2:stepper \
  --document=src/app/checkout.openui.json \
  --node-id=checkout
```

The schematic is document-driven: `--document` is required and there is no
CLI-only mode. It compiles the `Stepper` element of the
[`widgets/stepper`](https://github.com/shlomoa/openui-spec/blob/main/spec/scopes/Widgets/stepper.scope.md)
scope from a
[concrete UI document](https://github.com/shlomoa/openui-spec/blob/main/spec/scopes/scope.md#concrete-ui-document).

## Options

| Option       | Required | Default            | Description                                                                                |
| ------------ | -------- | ------------------ | ------------------------------------------------------------------------------------------ |
| `--document` | yes      | —                  | Workspace-relative path to a canonical OpenUI JSON document (`*.openui.json` or `*.json`). |
| `--node-id`  | no       | first `Stepper`    | Element id of the `Stepper` to compile. Requires `--document`.                             |
| `name`       | no       | dasherized node id | Kebab-case component name.                                                                 |
| `--path`     | no       | `<sourceRoot>/app` | Destination directory inside the selected application's source root.                       |
| `--project`  | no       | inferred           | Angular application project; required when the workspace has more than one application.    |

The document is validated with `@shlomoa/openui-spec` before any file is
written, as are the stepper attributes, its steps and the step content.

## Generated artifacts

For a `Stepper` with the id `checkout`, the schematic creates a `checkout`
directory with:

- `checkout.ts` — a standalone `OnPush` component importing `MatStepperModule`
  and `MatButtonModule`, with the embedding markers of
  [`component`](component.md#embedding-markers)
- `checkout.html` — a `mat-stepper` with one `mat-step` per `step`
- the stylesheet and spec file Angular generates for a component
- one subdirectory per compiled step child (see [Step content](#step-content))

Each step ends with navigation buttons: **Back** on every step but the first,
**Next** on every step but the last, and **Finish** on the last step when the
node declares `produces.complete`.

## OpenUI stepper nodes

| Attribute                  | Value                                       | Generated                                                                  |
| :------------------------- | :------------------------------------------ | :------------------------------------------------------------------------- |
| `uses.selectedIndex`       | integer, `"1"` (default `0`)                | `selectedIndex` `model()`, initial value; must name one of the steps       |
| `uses.linear`              | boolean, `"true"` (default `"false"`)       | `linear` `input()`, initial value; `[linear]` on the `mat-stepper`         |
| `uses.orientation`         | enum, `"\"vertical\""` (default horizontal) | `orientation` `input()`, initial value; `horizontal` or `vertical`         |
| `produces.selectionChange` | `null` marker                               | `selectionChange` `output()` carrying the Material `StepperSelectionEvent` |
| `produces.complete`        | `null` marker                               | `complete` `output()` and a **Finish** button on the last step             |

An attribute value is a string or `null`: an enum value is a quoted literal
(`"\"vertical\""`), a boolean or integer is an unquoted string (`"true"`, `"1"`),
and a `produces.*` event is the `null` marker, as for `produces.activate` in
[`material-app`](material-app.md#openui-application-documents). The schematic
needs `uses.selectedIndex`, `uses.linear` and `uses.orientation` at generation
time, so it accepts only a literal, not an expression.

`uses.branching` is declared by the catalog but **not supported** in this
version: the schematic rejects it, whatever its value, because steps always
follow one another in document order. Every other attribute is rejected as
unsupported too; a plain key without a category is rejected the same way.

### Steps

The only child type is `step`, one or more, shown in document order. The
catalog declares no attribute for `step`; the schematic reads two
`angular-django2` extensions:

| Attribute       | Value                            | Generated                                    |
| :-------------- | :------------------------------- | :------------------------------------------- |
| `uses.label`    | quoted literal, `"\"Shipping\""` | the step header; defaults to the id as words |
| `uses.optional` | boolean, `"true"`                | `[optional]="true"` on the `mat-step`        |

Any other child type, a stepper without steps, and any other step attribute
(including `uses.slot`) are rejected.

### Step content

The children of a `step` are the step content. They are compiled and embedded
with the same composition engine as [`component`](component.md#openui-surface-containers):
each child becomes its own component in a subdirectory and is embedded in
document order into the section of its `uses.slot`. A step has three
sections:

| Child `uses.slot`       | Step section (`step-<id>-…`) | Template                                  |
| :---------------------- | :--------------------------- | :---------------------------------------- |
| `"\"header\""`          | `header`                     | `<header>`                                |
| none or `"\"content\""` | `children`                   | the step body                             |
| `"\"actions\""`         | `actions`                    | `<footer>`, before the navigation buttons |

Supported children are `SurfaceContainers` (recursively), `Form`
(see [`reactive-form`](reactive-form.md)), and `TextInputs` / `RangeControl`
(see [`form-field`](form-field.md)); any other type is rejected. A child's
`uses.` attributes that name one of its inputs are bound as described for
[`component`](component.md#openui-surface-containers).

## Prerequisites

- a selected Angular application project with `sourceRoot`
- `@angular/material` and `@angular/cdk` installed; run `ng add @angular/material`
  first

## Limitations

- A `Stepper` can be compiled on its own only; it is not yet a supported child
  of `SurfaceContainers` or `DashboardPage`.
- A wizard (a stepper hosted in a dialog) needs the `dialog` schematic, which is
  not built yet.
- The generated stepper does not bind a `stepControl` to a step's form. In a
  `linear` stepper a step completes when the user leaves it with **Next**.
