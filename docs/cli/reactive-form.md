# reactive-form

Generate a typed standalone, `OnPush` Angular Material **reactive form** from a
single JSON definition. The generated component creates one Django REST
Framework resource; it is not a CRM resource shell, and it does not generate a
list, retrieve, update, or delete flow.

```bash
ng generate angular-django2:reactive-form contact \
  --definition=forms/contact-form.json \
  --project=my-app \
  --path=src/app/features \
  --primitives-path=src/app/shared/form-helpers
```

`--name` must be kebab-case. `--definition` is required and is a
workspace-relative path to a `.json` file that already exists in the workspace.
Select `--project` when the workspace has more than one application. The
schematic requires `@angular/forms`, `@angular/material`, and `@angular/cdk`
before it writes output.

Supported options are limited to:

- `--definition=<path>` (required) — workspace-relative `.json` definition file
- `--path=<path>` (default `src/app/features`) — output directory, which must
  remain within the selected application's `sourceRoot`
- `--primitives-path=<path>` (default `src/app/shared/form-helpers`) — directory
  searched for reusable field primitives
- `--project=<name>` — target application

## Definition contract

The definition file describes exactly one form. Its contract is published with
the schematic in `reactive-form/schema.json` under
`definitions/reactiveFormDefinition`, so editors that resolve `$schema` can
validate the file before it is used.

```json
{
  "$schema": "./node_modules/angular-django2/schematics/reactive-form/schema.json#/definitions/reactiveFormDefinition",
  "title": "Create contact",
  "endpoint": "/api/contacts/",
  "submitLabel": "Create contact",
  "fields": [
    {
      "name": "email",
      "label": "Email",
      "control": "email",
      "required": true,
      "autocomplete": "email"
    },
    {
      "name": "fullName",
      "label": "Full name",
      "control": "text",
      "initialValue": "Jane Doe",
      "validators": [
        { "type": "required" },
        { "type": "minLength", "value": 2 },
        { "type": "maxLength", "value": 120 },
        { "type": "pattern", "value": "^[A-Za-z .-]+$" }
      ]
    },
    {
      "name": "headcount",
      "label": "Headcount",
      "control": "number",
      "initialValue": 1,
      "validators": [
        { "type": "min", "value": 1 },
        { "type": "max", "value": 500 }
      ]
    },
    { "name": "notes", "label": "Notes", "control": "textarea", "hint": "Optional context" }
  ]
}
```

| Key           | Required | Purpose                                                            |
| ------------- | -------- | ------------------------------------------------------------------ |
| `title`       | yes      | Rendered heading and default submit label                          |
| `endpoint`    | yes      | Absolute Django path the form creates against; must start with `/` |
| `fields`      | yes      | Non-empty list of unique field definitions                         |
| `submitLabel` | no       | Overrides the submit button label                                  |
| `integration` | no       | Wires the form to one existing typed artifact (see below)          |

Each field accepts `name` (camelCase, matching the serializer field), `label`,
`control` (`text`, `email`, `password`, `number`, or `textarea`), and the
optional `initialValue`, `required`, `validators`, `hint`, `placeholder`, and
`autocomplete` keys.

### Initial values

`initialValue` seeds the generated control and must match the control's value
model: a `number` control takes a number, every other control takes a string,
and `null` (the default) means "empty". Declared initial values are also
restored by `completeSubmit()` after an accepted create, so the form returns to
its documented starting state instead of an empty one.

### Validators

`validators` is a list using one object shape, `{ "type": ..., "value": ... }`:

| `type`      | `value`                   | Applies to        | Emitted call                |
| ----------- | ------------------------- | ----------------- | --------------------------- |
| `required`  | not allowed               | any control       | `Validators.required`       |
| `email`     | not allowed               | string controls   | `Validators.email`          |
| `minLength` | non-negative integer      | string controls   | `Validators.minLength(n)`   |
| `maxLength` | non-negative integer      | string controls   | `Validators.maxLength(n)`   |
| `min`       | number                    | `number` controls | `Validators.min(n)`         |
| `max`       | number                    | `number` controls | `Validators.max(n)`         |
| `pattern`   | regular-expression string | string controls   | `Validators.pattern('...')` |

`required: true` remains supported as a shorthand for a `required` entry, and
`control: "email"` still contributes `Validators.email` on its own. To keep the
generated control free of duplicate validators, the contract rejects declaring
the same validator twice — including `required` through both the shorthand and
a validator entry, and `email` on a control that is already an `email` control.

Validators are emitted in the canonical order shown above, so generated output
does not depend on authoring order. Inline controls render a matching message
for each declared validator through `mat-error`.

The definition is validated **atomically, before any file is written**. The
schematic rejects — without creating output — invalid JSON, a file holding more
than one definition, unknown keys, duplicate or malformed field names, an
unsupported control, a relative endpoint, an initial value that does not match
its control, a malformed, unsupported, duplicated, or control-incompatible
validator entry, and CRM-style keys such as `resource`, `list`, `retrieve`,
`update`, `partialUpdate`, `destroy`, `delete`, `crud`, `operations`, or
`adapter`. Those keys are reported as create-only violations; use
[`data-service`](data-service.md) or [`openapi-setup`](openapi-setup.md) for
resource operations.

## Generated output

`<path>/<name>-form/` receives `<name>-form.ts`, `<name>-form.html`, and
`<name>-form.scss`. The component is standalone, `OnPush`, and typed:

- `form` is built with the injected `FormBuilder` and stays strictly typed:
  each control is created through `formBuilder.control<T>(initialValue,
validators)`, so `number` fields are `FormControl<number | null>` and
  text-like fields are `FormControl<string | null>`
- declared initial values are also emitted as a frozen `INITIAL_VALUES`
  constant typed as the payload, which `completeSubmit()` resets the form to
- `<Name>FormPayload` mirrors the serializer fields; `<Name>FormServerErrors`
  types the Django REST Framework error payload
- `endpoint` keeps the Django URL explicit on the component
- `status()` and `submitting()` expose the submit state, and the submit button
  is disabled while a create is in flight
- `submit()` marks the form touched, clears stale server errors, and emits the
  typed payload only when client-side validation passes
- `completeSubmit()` resets the form after an accepted create, back to the
  declared initial values when the definition provides them
- `failSubmit(errors)` maps serializer field errors onto the matching controls
  as a `server` error and routes `non_field_errors`, `detail`, and unknown keys
  to the form-level error list. **Entered values are retained** so the user can
  correct them

Accessible markup is generated by default: the form is labelled by its heading,
exposes `aria-busy` while submitting, renders form-level messages in a
`role="alert"` region and the success message in a `role="status"` region, and
associates every inline control with its `mat-error` through `aria-invalid` and
`aria-errormessage`. Required state is carried by `Validators.required` so
Material renders the asterisk and `aria-required` from the typed validators.

## Composing existing primitives

When `--primitives-path` contains a matching field primitive — for example one
generated by [`form-field`](form-field.md) — the form composes it instead of
inlining a Material control. A primitive qualifies only when its file
implements `ControlValueAccessor`, exports a class, and declares a selector.
Only inputs the primitive actually declares are bound (`fieldId`, `label`,
`required`, `hint`, `placeholder`, `controlType`, and `serverErrors`).

Discovery is deterministic: the schematic probes fixed candidate paths for the
field name. If two or more candidates qualify for the same field, generation
fails with an ambiguity error instead of guessing. Fields without a primitive
fall back to an inline `mat-form-field` control.

## Optional contract integration

`integration` is the only supported way to wire the form to a service, and it
requires an artifact that already exists locally:

```json
{
  "integration": {
    "artifact": "src/app/core/contacts-data-service.ts",
    "symbol": "ContactsDataService",
    "method": "create"
  }
}
```

The schematic verifies before mutation that the file exists, exports the named
symbol, and declares the named method. Otherwise generation fails. In
integration mode the component injects the artifact, calls
`<symbol>.<method>(payload)`, unsubscribes through
`takeUntilDestroyed(this.destroyRef)`, and maps failures through
`failSubmit()`. Without an `integration` block, the component emits a typed
`submitted` output and leaves transport to the caller.

## Create-only and idempotency

Generation is create-only and deterministic. Rerunning the schematic with the
same name and definition logs a warning and leaves existing files untouched. If
only part of the expected output exists, the run fails rather than merging into
an ambiguous state.

```html
<app-contact-form (submitted)="createContact($event)"></app-contact-form>
```
