# form-field

Generate a configurable typed standalone, `OnPush` Angular Material form-field
component with a `ControlValueAccessor` boundary. Use it instead of
`field-component` when number controls, appearance or subscript sizing choices,
or server validation errors need explicit configuration.

```bash
ng generate angular-django2:form-field email \
  --project=my-app \
  --path=src/app/shared/form-helpers \
  --control-type=email \
  --appearance=outline \
  --subscript-sizing=dynamic
```

`--name` must be kebab-case. `--path` defaults to
`src/app/shared/form-helpers` and must remain within the selected application's
`sourceRoot`. Select `--project` when the workspace has more than one
application. The schematic requires `@angular/forms`, `@angular/material`, and
`@angular/cdk` before it writes output.

Supported options are limited to:

- `--control-type=text|email|password|number|textarea` (default `text`)
- `--appearance=fill|outline` (default `fill`)
- `--subscript-sizing=fixed|dynamic` (default `fixed`)

The generated `<app-<name>-field>` exposes `fieldId`, `label`, `required`,
`disabled`, `hint`, `placeholder`, `controlType`, `appearance`, and
`subscriptSizing` inputs, plus `serverErrors` for server-returned messages.
Host control errors with `server`, `detail`, or `non_field_errors` keys also
render through `mat-error`. Native Material inputs preserve keyboard behavior,
and the generated label, error association, and `aria-invalid` state provide
the baseline accessible configuration.

```html
<app-email-field
  [formControl]="email"
  fieldId="profile-email"
  label="Email"
  hint="We use this for account notices"
  [serverErrors]="serverErrors"
></app-email-field>
```

Text, email, password, and textarea output declares `FormFieldValue` as
`string`; number output declares `string | number | null`. Use a matching typed
`FormControl`.
