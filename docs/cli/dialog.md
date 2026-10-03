# dialog

Compile an OpenUI `dialog` element (`widgets/dialog`) into a standalone `OnPush`
Angular Material dialog component. The schematic is OpenUI-only: a dialog is
described by a document, so `--document` is required.

```bash
ng generate angular-django2:dialog --document=src/app/confirm-delete.openui.json \
  --node-id=confirmDelete --project=my-app --path=src/app/features
```

## Options

| Option       | Required | Default                | Description                                                                                    |
| ------------ | -------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| `--document` | yes      | —                      | Workspace-relative path to an OpenUI JSON document.                                            |
| `--node-id`  | no       | first `dialog` element | Element id of the `dialog` to compile.                                                         |
| `name`       | no       | dasherized node id     | Kebab-case name of the component and its directory.                                            |
| `--path`     | no       | `<sourceRoot>/app`     | Directory that receives the dialog directory, inside the selected application source root.     |
| `--project`  | no       | inferred               | Angular application project; required when more than one application source root is available. |

`@angular/material` and `@angular/cdk` must already be installed. The document is
loaded and validated with `@shlomoa/openui-spec`, and everything else is validated
before the first file is written.

## OpenUI dialog nodes

| `dialog` attribute | Type    | Generated                                                                  | Default |
| :----------------- | :------ | :------------------------------------------------------------------------- | :------ |
| `uses.open`        | boolean | `open = model(<value>)`: whether the dialog is shown; bind with `[(open)]` | `false` |
| `uses.modal`       | boolean | `modal = input(<value>)`: backdrop and `aria-modal` while modal            | `true`  |
| `produces.close`   | `null`  | `closed = output<void>()`, only when the node declares it                  | none    |
| `produces.cancel`  | `null`  | `cancelled = output<void>()`, only when the node declares it               | none    |

`uses.open` and `uses.modal` are written as the unquoted strings `"true"` or
`"false"`; any other expression cannot be evaluated at generation time and is
rejected. A `produces.` attribute is a `null` marker, and any other value is
rejected. Every other attribute is rejected as unsupported, never ignored.

A dialog owns three ordered regions, each at most once, in this order:

| Region child                  | Type      | Generated                                                            |
| :---------------------------- | :-------- | :------------------------------------------------------------------- |
| `dialogTitle` (0..1)          | `header`  | `<h2 mat-dialog-title>` from `uses.title`†, and the `header` section |
| `dialogContent` (exactly one) | `section` | `<mat-dialog-content>` and the `children` section                    |
| `dialogActions` (0..1)        | `footer`  | `<mat-dialog-actions>` and the `actions` section                     |

† `uses.title` (a quoted literal, not empty) is an `angular-django2` extension:
the catalog declares no attribute for `header`. The region ids are free.

The children of a region are compiled and embedded exactly as the slot children of
a [`component`](component.md#openui-surface-containers) node: `SurfaceContainers`
(recursively), `Form` and `TextInputs` / `RangeControl`, each in its own component
in a subdirectory, in document order within the region's section. A region child
cannot set `uses.slot`, because the region decides its slot. Other child types are
rejected.

## Generated artifacts

For `confirmDelete` at `src/app/features`:

- `confirm-delete/confirm-delete.ts`: the standalone `OnPush` component
  `ConfirmDelete`, importing `MatDialogModule`. It keeps the `import`, `injected
services`, `input signals` and `output signals` hooks of [`component`](component.md).
- `confirm-delete/confirm-delete.html`: an `ng-template` that the component opens
  with `MatDialog`, holding the three regions with their section markers.
- `confirm-delete/confirm-delete.<style>` and `confirm-delete.spec.ts` from
  Angular's `component` schematic.
- One subdirectory per region child.

The reference app demonstrates the result at `/demos/dialog`
(`projects/angular-django2-reference/src/app/demos/dialog`).

## Behavior

- **Modal.** A modal dialog (`modal` is `true`) has a backdrop and sets
  `aria-modal="true"`. A non-modal dialog has neither. In both cases the Material
  dialog container moves focus into the dialog, keeps it there until the dialog
  closes and then returns it to the element that had it.
- **Names.** The dialog is labelled by its title (`aria-labelledby`, from
  `mat-dialog-title`) and described by its content region (`aria-describedby`).
  A dialog without a title region is named by its component name instead.
- **Outcomes.** Escape or a backdrop click dismisses the dialog and emits
  `cancelled`; any other closing emits `closed`, whether a `mat-dialog-close`
  button or `open.set(false)` caused it. A closing emits one of them, never both.
  `open` is set to `false` in every case, so a consumer that binds it one way must
  reset its own state in a handler.
- **Buttons.** The actions region has no standalone action-control generator, so
  add buttons to the actions section yourself, for example
  `<button mat-button mat-dialog-close>Close</button>` with `MatButtonModule`.

## Modal overlay behavior

Modal focus and dismissal follow the Modal overlay behavior (`behaviors/modalOverlay`),
which has no schematic of its own. The dialog implements only what the dialog scope
requires: `uses.modal`, focus moved in, held and restored, Escape dismissal, and
`produces.cancel`. A `ModalOverlay` element whose `uses.target` is the dialog is
rejected, and so are `uses.initialFocus`, `uses.restoreFocus`, `uses.dismissOnEscape`
and `produces.dismissRequest` on the dialog itself. Remove them: the Material defaults
already restore focus and dismiss on Escape.

## Relationship to `complex-component`

[`complex-component`](complex-component.md) with an `OverlayContainers` child adds a
CDK connected overlay that a button toggles. It has no dialog lifecycle, focus handling,
outputs or accessible name, and it is unchanged. Use `dialog` for a Material dialog.
A `dialog` node is not yet a child that `component`, `complex-component` or `page`
compile; generate it on its own and place its selector in the parent template.
