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
| Generate typed Material fields or a reactive form             | [`field-component`](field-component.md), [`form-field`](form-field.md), or [`reactive-form`](reactive-form.md) |
| Generate an OpenAPI client setup or its data-service wrapper  | [`openapi-setup`](openapi-setup.md) or [`data-service`](data-service.md)                                       |

`material-app` combines [`application`](application.md),
[`material-setup`](material-setup.md), and
[`project-structure`](project-structure.md), then writes its Material layout.
It is distinct from [`app-shell`](app-shell.md), which only passes through
Angular's SSR/prerendering app-shell schematic.

For an end-to-end setup path, see the [tutorial](../TUTORIAL.md).

## OpenUI documents

The UI schematics also compile from an
[OpenUI](https://github.com/shlomoa/openui-spec) 0.2.0 JSON document: pass
`--document=<path>` and, when the document holds several candidates,
`--node-id=<id>`. Attributes use the catalog style (`[input]`, `(event)`) with
string values. Each command page has an _OpenUI_ section listing the node types
and attributes it accepts; the
[repository requirements](https://github.com/shlomoa/angular-django2/blob/main/docs/REQUIREMENTS.md#openui-document-input-contracts)
summarize them.

## Discover command help

Angular CLI displays the installed schematic schema:

```bash
ng generate angular-django2:<schematic> --help
```
