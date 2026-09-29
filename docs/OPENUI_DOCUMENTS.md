# OpenUI documents

The UI schematics compile [OpenUI](https://github.com/shlomoa/openui-spec) JSON
documents (`--document=<path>`, and `--node-id=<id>` to choose an element). This
page is the reference for the documents `angular-django2` accepts: the attribute
language, the elements and attributes each schematic reads, and the diagnostics.
For complete documents and the commands that compile them, see
[OpenUI document examples](OPENUI_EXAMPLES.md).

`openui-spec` owns the vocabulary and the validator. `angular-django2` interprets a
document only where the specification leaves that to the generator, and says so
below. It adds no element types.

## Document shape

```json
{
  "version": "0.8.0",
  "id": "root",
  "type": "html",
  "children": [{ "id": "contact", "type": "Form", "attrs": {}, "children": [] }]
}
```

- `version` is the OpenUI version the tool implements, exactly. This release
  requires `0.8.0`; any other version is rejected with `document/unsupported-version`.
- The root has the id `root`. Every element has a unique camelCase `id` and a
  `type` that is an exact, case-sensitive literal of the OpenUI catalog. Configuration
  is in `attrs`, nested elements are in `children`, and nothing else is allowed.
- The document is validated before any file changes. A schematic then reads the
  element it compiles (`--node-id`, or the first element of a supported type).

## Attributes

An attribute key names its category with a prefix:

| Prefix            | Category | Meaning                                               |
| :---------------- | :------- | :---------------------------------------------------- |
| `uses.<name>`     | Uses     | An input: data, configuration, state, or a reference  |
| `behaves.<name>`  | Behaves  | An action or side effect, such as submitting a form   |
| `produces.<name>` | Produces | An emitted event, such as a toolbar action activating |

The bracket and parenthesis keys of earlier versions (`[title]`, `(submit)`) are not
keys any more. A key without a prefix carries no category, and the schematics reject it
as an unsupported attribute.

A value is a string, a number, `true`, `false`, `null`, or a list of these. The
specification lets a generator read a string either as a static literal or as an
expression in the target language. `angular-django2` generates static code, so:

| Value                | Write it as                                     | Example                                                            |
| :------------------- | :---------------------------------------------- | :----------------------------------------------------------------- |
| String (`uses.*`)    | A quoted literal: quotes inside the JSON string | `"uses.title": "\"Contact us\""`                                   |
| Boolean (`uses.*`)   | `true` or `false`                               | `"uses.required": true`                                            |
| Number (`uses.*`)    | A JSON number                                   | `"uses.maxLength": 120`                                            |
| Reference (`uses.*`) | A quoted element id, resolved by the validator  | `"uses.route": "\"homeRoute\""`                                    |
| Behavior             | An unquoted expression                          | `"behaves.submit": "src/app/api/contact.ts#ContactService.create"` |
| Event                | `null`, a marker that the event is exposed      | `"produces.activate": null`                                        |

An unquoted string in a `uses.*` attribute is a binding expression. The validator
accepts it, and the schematics reject it, because there is no code to generate from
an expression. Booleans and numbers written as strings (`"true"`, `"120"`) are
rejected for the same reason.

## What the schematics read

An attribute that a schematic does not read on an element is rejected, never ignored.
The _Origin_ column says whether the OpenUI catalog declares the attribute
(_catalog_) or `angular-django2` defines it (_ngdj_): the specification lets a
document carry attributes a type does not declare, but another generator will not
know the ngdj ones.

### Application

| Element        | Attribute                               | Value                          | Origin  | Read by                                                          |
| :------------- | :-------------------------------------- | :----------------------------- | :------ | :--------------------------------------------------------------- |
| `Application`  | —                                       | —                              | catalog | `application`, `material-app`                                    |
| `Routing`      | `uses.defaultRoute`                     | reference to a `Route`         | catalog | validated only                                                   |
| `Route`        | `uses.path`                             | string                         | catalog | `page`, `material-app`                                           |
| `Route`        | `uses.target`                           | reference                      | catalog | `page`, `material-app`                                           |
| `Route`        | `uses.access`                           | string (`public`, `protected`) | catalog | `page`                                                           |
| `Route`        | `uses.title`                            | string                         | catalog | validated only                                                   |
| `Route`        | `uses.redirectTo`                       | reference to a `Route`         | catalog | validated only                                                   |
| `Navigation`   | `uses.ariaLabel`                        | string                         | catalog | validated only                                                   |
| `NavItem`      | `uses.label`                            | string                         | catalog | `material-app`, `page`                                           |
| `NavItem`      | `uses.route`                            | reference to a `Route`         | catalog | `material-app`, `page`                                           |
| `NavItem`      | `uses.icon`                             | string (Material icon)         | catalog | `material-app`, `page`                                           |
| `NavItem`      | `uses.disabled`                         | boolean                        | catalog | `material-app`                                                   |
| `NavGroup`     | `uses.label`, `uses.expanded`           | string, boolean                | catalog | validated only; entries are flattened                            |
| `ToolBar`      | `uses.ariaLabel`                        | string                         | catalog | `material-app`                                                   |
| `ToolAction`   | `uses.label`                            | string (required)              | catalog | `material-app`                                                   |
| `ToolAction`   | `uses.icon`                             | string                         | catalog | `material-app`                                                   |
| `ToolAction`   | `uses.disabled`                         | boolean                        | catalog | `material-app`                                                   |
| `ToolAction`   | `produces.activate`                     | `null`                         | catalog | `material-app`: generates an `on<ActionId>Activate($event)` stub |
| `Presentation` | `uses.theme`                            | string (prebuilt theme)        | ngdj    | `material-app`                                                   |
| `Presentation` | `uses.typography`, `uses.animations`    | boolean                        | ngdj    | `material-app`                                                   |
| `html`         | `uses.lang`                             | string                         | catalog | `workspace-setup`                                                |
| `html`         | `uses.dir`                              | `ltr`, `rtl`, or `auto`        | catalog | `workspace-setup`                                                |
| `html`         | `uses.title`                            | string                         | catalog | `workspace-setup`, `material-app` (toolbar title)                |
| `link`         | `uses.rel`                              | string (`icon`)                | catalog | `workspace-setup`                                                |
| `link`         | `uses.type`, `uses.sizes`, `uses.media` | string                         | catalog | accepted; not used                                               |
| `link`         | `uses.href`                             | url (workspace path)           | catalog | `workspace-setup`                                                |

A `Route` owns its path and access, and a `NavItem` its label and icon. The
`Routing` model is checked as a whole: a `Route` may hold `Route` children, and a route's
full path is its own `uses.path` joined to the `uses.path` of every `Route` above it.

### Pages

| Element         | Attribute    | Value  | Origin | Read by |
| :-------------- | :----------- | :----- | :----- | :------ |
| `DashboardPage` | `uses.title` | string | ngdj   | `page`  |
| `EmptyPage`     | `uses.title` | string | ngdj   | `page`  |

A page is content-only. Setting `uses.route`, `uses.access`, `uses.icon`, or
`uses.authGuard` on it is rejected with a pointer to the `Route` or `NavItem` that owns
the value. A page must be the `uses.target` of exactly one `Route`. `DashboardPage`
children are composed into the page; an `EmptyPage` takes none.

### Containers and composition

| Element             | Attribute    | Value                             | Origin | Read by                                  |
| :------------------ | :----------- | :-------------------------------- | :----- | :--------------------------------------- |
| `SurfaceContainers` | `uses.title` | string                            | ngdj   | `component`, `complex-component`, `page` |
| `SurfaceContainers` | `uses.slot`  | `header`, `content`, or `actions` | ngdj   | on a child: the section that holds it    |
| `OverlayContainers` | `uses.label` | string (toggle button text)       | ngdj   | `complex-component`                      |

Children of `SurfaceContainers` and `DashboardPage` (`SurfaceContainers`, `Form`,
`TextInputs`, `RangeControl`) are compiled into components of their own and embedded
in document order within their slot. On such a child, a `uses.*` attribute that
names an input of the generated component becomes a literal binding: `"uses.label":
"\"Email\""` becomes `[label]="'Email'"` and `"uses.disabled": true` becomes
`[disabled]="true"`. An expression or a list is rejected.

### Forms and controls

| Element          | Attribute                                                          | Value                                      | Origin  |
| :--------------- | :----------------------------------------------------------------- | :----------------------------------------- | :------ |
| `Form`           | `uses.title`, `uses.action`                                        | string (the submit endpoint)               | ngdj    |
| `Form`           | `behaves.submit`                                                   | `<artifact>#<Symbol>.<method>` expression  | catalog |
| `ActionControls` | `uses.label`                                                       | string (submit button label; at most one)  | ngdj    |
| `TextInputs`     | `uses.type`                                                        | `text`, `email`, `password`, or `textarea` | ngdj    |
| `RangeControl`   | `uses.type`                                                        | `number`                                   | ngdj    |
| both controls    | `uses.name`                                                        | string (defaults to the id)                | ngdj    |
| both controls    | `uses.label`, `uses.hint`, `uses.placeholder`, `uses.autocomplete` | string                                     | ngdj    |
| both controls    | `uses.value`                                                       | string, a number for `number`, or `null`   | ngdj    |
| both controls    | `uses.required`, `uses.email`                                      | boolean                                    | ngdj    |
| both controls    | `uses.minLength`, `uses.maxLength`                                 | number (non-negative integer)              | ngdj    |
| both controls    | `uses.min`, `uses.max`                                             | number                                     | ngdj    |
| both controls    | `uses.pattern`                                                     | string (regular expression)                | ngdj    |
| both controls    | `uses.appearance`                                                  | `fill` or `outline`                        | ngdj    |
| both controls    | `uses.subscriptSizing`                                             | `fixed` or `dynamic`                       | ngdj    |

`reactive-form` reads the whole table; `form-field` and `field-component` read the
control attributes of one node. See [`reactive-form`](cli/reactive-form.md#openui-form-documents)
and [`form-field`](cli/form-field.md#openui-control-nodes) for the generated output.

### Data

| Element     | Attribute   | Value                                         | Origin | Read by        |
| :---------- | :---------- | :-------------------------------------------- | :----- | :------------- |
| any element | `uses.data` | `"<apiPath>#<ApiService>"` in a quoted string | ngdj   | `data-service` |

## Diagnostics

Every schematic validates the document with `@shlomoa/openui-spec` before it changes
a file, so a rejected document leaves the workspace untouched. The validator reports
one line per problem as `path: code: message`, where `path` is a JSON Pointer and the
code names the stage that found it. A grammar problem stops the later stages.

| Stage      | Codes                                                                                                                                                                                                          |
| :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grammar`  | `json-syntax`, `duplicate-member`, `unknown-property`, `missing-property`, `invalid-member-type`, `invalid-root-id`, `invalid-id`, `invalid-type`, `invalid-version`, `invalid-key`, `invalid-attribute-value` |
| `document` | `unsupported-version`, `duplicate-id`                                                                                                                                                                          |
| `catalog`  | `unknown-type`                                                                                                                                                                                                 |
| `contract` | `wrong-value-type`, `unresolved-reference`, `wrong-reference-type`                                                                                                                                             |

For example, a `NavItem` whose `uses.route` names an element that is not a `Route`:

```text
/children/0/attrs/uses.route: contract/wrong-reference-type: uses.route names a Form, not a Route
```

Rules that are `angular-django2`'s own are reported by the schematic that reads the
element, as `OpenUI node "<document>#<nodeId>": ...`:

| Message contains                      | Cause                                                                   |
| :------------------------------------ | :---------------------------------------------------------------------- |
| `must be a quoted string literal`     | An unquoted string where a literal is required                          |
| `must be true or false`               | A boolean written as a string                                           |
| `must be a finite number`             | A number written as a string                                            |
| `must be a quoted element-id string`  | A reference that is not a quoted id                                     |
| `has unsupported attribute(s)`        | An attribute the schematic does not read                                |
| `is not a supported slot`             | A `uses.slot` other than `header`, `content`, or `actions`              |
| `is not the uses.target of any Route` | A page that no `Route` targets                                          |
| `a page is content-only`              | `uses.route`, `uses.access`, `uses.icon`, or `uses.authGuard` on a page |
| `must be "<apiPath>#<ApiService>"`    | A malformed `uses.data`                                                 |

The repository keeps a suite of documents with the diagnostics each must produce, in
`projects/angular-django-validation/unit/fixtures/openui/`, and the examples page runs
its own commands, so these pages are checked against the code.

## Upgrading documents

Each OpenUI release names the version its documents declare, and a tool accepts only
the version it implements. Moving documents written for OpenUI 0.4 or earlier to
0.8.0 therefore changes every one of them:

1. Set `version` to `0.8.0`.
2. Replace `[name]` keys with `uses.name`, and `(name)` keys with `behaves.name` or
   `produces.name`. The OpenUI repository provides `python -m spec.bin.migrate`, which
   converts 0.5 documents to the typed form; check its result against the value forms above, because the schematics
   need booleans and numbers as JSON values.
3. Quote string values, and reference values, inside the string.
4. Run the schematic. The diagnostics name every remaining problem before anything is
   written.

The [OpenUI changelog](https://github.com/shlomoa/openui-spec/blob/v0.8.0/CHANGELOG.md)
lists the specification changes from 0.4.0 to 0.8.0.
