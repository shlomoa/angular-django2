# field-component

Generate a simple typed Angular Material field-control convenience component.
It delegates to the canonical `form-field` implementation with `fill`
appearance and `fixed` subscript sizing.

```bash
ng generate angular-django2:field-component email-field --kind=email
```

By default, output is written below the selected application's
`src/app/shared/form-helpers/<name>-field/` directory. Use `--path` for another
directory below that application's source root, and use `--project` when the
workspace has more than one application.

## Options

- `--name` (required): non-empty kebab-case component name.
- `--path`: destination within the selected application source tree.
- `--project`: selected Angular application project.
- `--kind`: one of `text` (default), `email`, `password`, or `textarea`.

Every supported control kind uses a string value model. The generated component
exposes `fieldId`, `label`, `required`, `disabled`, `hint`, `placeholder`,
`controlType`, `appearance`, `subscriptSizing`, and `serverErrors` inputs,
implements `ControlValueAccessor`, and can be used directly with a typed
`FormControl<string>` or `FormGroup`.

The generated Material field keeps a native `input` or `textarea`, uses
`mat-label` for the associated label, reports `aria-invalid` after the form
control is touched or dirty and invalid, and displays `mat-error` from the
typed `errorMessage` input.

`@angular/forms`, `@angular/material`, and `@angular/cdk` must already be
installed. Run `ng add @angular/material` before generation. Existing output is
rejected before writes to avoid overwriting or duplicating a component.
