# CLI reference

`angular-django2` provides Angular CLI schematics through
`ng generate angular-django2:<schematic>`. Install the package in an Angular
workspace, then run [`ng-add`](ng-add.md) to register the collection.

Use kebab-case for multiword flags, such as `--auth-guard` and
`--openapi-spec-file`. The individual command pages are the canonical reference
for options, defaults, constraints, prerequisites, and generated output.

## Choose a command

| When you need to…                                             | Start with                                                                                                     |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Register the collection in an existing workspace              | [`ng-add`](ng-add.md)                                                                                          |
| Prepare an empty workspace for a generated application        | [`workspace-setup`](workspace-setup.md)                                                                        |
| Generate an Angular application with package defaults         | [`application`](application.md)                                                                                |
| Generate a complete Material application and sidenav layout   | [`material-app`](material-app.md)                                                                              |
| Configure Material in an existing application                 | [`material-setup`](material-setup.md)                                                                          |
| Add the standard `core`, `shared`, and `features` directories | [`project-structure`](project-structure.md)                                                                    |
| Add Angular's SSR/prerendering app shell                      | [`app-shell`](app-shell.md)                                                                                    |
| Generate a component, page, service, or class                 | [`component`](component.md), [`page`](page.md), [`service`](service.md), or [`class`](class.md)                |
| Compose or embed advanced components                          | [`embed-component`](embed-component.md) or [`complex-component`](complex-component.md)                         |
| Compile an OpenUI tabs container                              | [`tabs`](tabs.md)                                                                                              |
| Generate a Material dialog from an OpenUI element             | [`dialog`](dialog.md)                                                                                          |
| Generate typed Material fields or a reactive form             | [`field-component`](field-component.md), [`form-field`](form-field.md), or [`reactive-form`](reactive-form.md) |
| Generate an OpenAPI client setup or its data-service wrapper  | [`openapi-setup`](openapi-setup.md) or [`data-service`](data-service.md)                                       |
| Compile an OpenUI stepper (multi-step flow) into Material     | [`stepper`](stepper.md)                                                                                        |
| Compile an OpenUI table into a Material table                 | [`table`](table.md)                                                                                            |

`material-app` combines [`application`](application.md),
[`material-setup`](material-setup.md), and
[`project-structure`](project-structure.md), then writes its Material layout.
It is distinct from [`app-shell`](app-shell.md), which only passes through
Angular's SSR/prerendering app-shell schematic.

For an end-to-end setup path, see the [tutorial](../TUTORIAL.md).

## OpenUI documents

The UI schematics also compile from an
[OpenUI](https://github.com/shlomoa/openui-spec) JSON document: pass
`--document=<path>` and, when the document holds several candidates,
`--node-id=<id>`. Each command page has an _OpenUI_ section listing the node types
and attributes it accepts; the
[repository requirements](https://github.com/shlomoa/angular-django2/blob/main/docs/REQUIREMENTS.md#openui-document-input-contracts)
summarize them.

### Attribute notation

Attribute keys are categorized (OpenUI 0.12.0): `uses.x` for inputs, `produces.x`
for events and `behaves.x` for behaviors. An attribute value is a string, `null`
or a list of those. A string literal is quoted inside the string
(`"\"Users\""`); a boolean or number is an unquoted string (`"true"`, `"25"`);
any other unquoted string is a binding or expression. The spec also allows a
plain `<name>` key with no category; the commands accept only the categorized
keys they list and reject a plain key as unsupported. Element references are
quoted element ids.

Where an attribute table of a command page marks an attribute **†**, it is an
`angular-django2` extension: the OpenUI catalog does not declare it for that
type. The extensions are
recorded in the
[command mapping](https://github.com/shlomoa/angular-django2/blob/main/projects/angular-django2/schematics/command-mapping.json)
(`extensions` of each node type under `ui.nodes`).

## Discover command help

Angular CLI displays the installed schematic schema:

```bash
ng generate angular-django2:<schematic> --help
```
