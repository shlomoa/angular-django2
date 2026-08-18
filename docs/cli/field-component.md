# field-component

Generate a reusable standalone OnPush Angular Material field control with a
typed string `ControlValueAccessor` API.

```bash
ng generate angular-django2:field-component email-field --kind=email
```

By default, output is written below the selected application's
`src/app/shared/ui/form-helpers/<name>/` directory. Use `--path` for another
directory below that application's source root, and use `--project` when the
workspace has more than one application.

## Options

- `--name` (required): non-empty kebab-case component name.
- `--path`: destination within the selected application source tree.
- `--project`: selected Angular application project.
- `--kind`: one of `text` (default), `email`, `password`, or `textarea`.

Every supported control kind uses a string value model. The generated
component exposes typed `label`, `required`, `disabled`, `hint`, `placeholder`,
and `errorMessage` inputs, implements `ControlValueAccessor`, and can be used
directly with a typed `FormControl<string>` or `FormGroup`.

The generated Material field keeps a native `input` or `textarea`, uses
`mat-label` for the associated label, reports `aria-invalid` after the form
control is touched or dirty and invalid, and displays `mat-error` from the
typed `errorMessage` input.

`@angular/material` and `@angular/cdk` must already be installed. Run
`ng add @angular/material` before generation. Existing output is rejected to
avoid overwriting or duplicating a component.
