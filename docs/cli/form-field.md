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

`--name` must be kebab-case; with `--document` it defaults to the node's
dasherized `uses.name` attribute or id. `--path` defaults to
`src/app/shared/form-helpers` and must remain within the selected application's
`sourceRoot`. Select `--project` when the workspace has more than one
application. The schematic requires `@angular/forms`, `@angular/material`, and
`@angular/cdk` before it writes output.

Supported options are limited to:

- `--control-type=text|email|password|number|textarea` (default `text`)
- `--appearance=fill|outline` (default `fill`)
- `--subscript-sizing=fixed|dynamic` (default `fixed`)
- `--document=<path>` — OpenUI document; replaces the three options above
- `--node-id=<id>` — control element to compile; defaults to the first
  `TextInputs` or `RangeControl` (requires `--document`)

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

## OpenUI control nodes

With `--document`, the schematic compiles one OpenUI control node. `form-field`,
`field-component`, and `reactive-form` share this vocabulary, so one document
drives both the reusable primitive and the form that composes it.

```bash
ng generate angular-django2:form-field --document=src/app/app.openui.json --node-id=workEmail
```

| Node type      | Control kinds                                                    | Default  |
| :------------- | :--------------------------------------------------------------- | :------- |
| `TextInputs`   | `uses.type` `text`, `email`, `password`; `uses.multiline` `true` | `text`   |
| `RangeControl` | `uses.type` `number`                                             | `number` |

A textarea is `"uses.multiline": true`: the catalog's `uses.type` enum has no
`textarea`. The catalog also declares the `search`, `tel`, and `url` types; they
pass validation but are not generated and are reported as unsupported control
types.

String values are quoted inside the string (`"uses.label": "\"Email\""`);
booleans and numbers are JSON values. The catalog declares some of these
attributes (`TextInputs`: `uses.label`, `uses.value`, `uses.placeholder`,
`uses.type`, `uses.multiline`, `uses.maxLength`, `uses.required`; `RangeControl`:
`uses.label`, `uses.value`, `uses.min`, `uses.max`); the others are extensions the
schematics define (see the
[mapping document](https://github.com/shlomoa/angular-django2/blob/main/docs/ngdj-openui-spec-mapping.md)).

| Attribute                                                                            | Used by                         |
| :----------------------------------------------------------------------------------- | :------------------------------ |
| `uses.type`, `uses.multiline`, `uses.name`                                           | all                             |
| `uses.appearance`, `uses.subscriptSizing`                                            | `form-field`, `field-component` |
| `uses.label`, `uses.value`, `uses.hint`, `uses.placeholder`, `uses.autocomplete`     | `reactive-form`                 |
| `uses.required`, `uses.email` (JSON `true` / `false`)                                | `reactive-form`                 |
| `uses.minLength`, `uses.maxLength`, `uses.min`, `uses.max` (numbers), `uses.pattern` | `reactive-form`                 |

Any other attribute is rejected. `--control-type`, `--appearance`, and
`--subscript-sizing` cannot be combined with `--document`.
