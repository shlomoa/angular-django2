# OpenUI and `angular-django2` mapping status

## Scope and authority

This is a status document, not a second OpenUI catalog. Canonical OpenUI 0.2.0
names, casing, scope paths, attributes, and definitions are owned by the
[`openui-spec` catalog](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/openui.json)
and [schema](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/openui.schema.json).
For example, the catalog distinguishes scope IDs such as `report`, `form`,
`chart`, `table`, and `dataGrid` from their exact type names `Report`, `Form`,
`Chart`, `Table`, and `DataGrid`. Do not infer singular or plural names from
schematic names or reproduce the catalog here.

The [`@shlomoa/openui-spec`](https://www.npmjs.com/package/@shlomoa/openui-spec)
`^0.2.0` dependency is the parser/validator authority used by this repository.
Its `OpenUiJson.validate()` behavior checks the canonical schema, exact catalog
membership, and unique IDs.

The ownership decision in [angular-django2#27](https://github.com/shlomoa/angular-django2/issues/27)
is authoritative for transformation: `django-angular3` owns canonical
OpenUI-to-supported-`angular-django2` mapping and orchestration. This
repository owns the supported schematic contracts that an external orchestrator
may invoke.

## Active functional mappings

There are **no active OpenUI-to-`angular-django2` functional mappings**. A
mapping is active only when a public schematic accepts canonical OpenUI input
and its implementation and tests transform that input into generated output.
The current collection does not meet that definition.

| Canonical input                                                             | Status                                        | Evidence                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any validated `OpenUiDocument`                                              | Missing production integration                | No public schematic in [`collection.json`](https://github.com/shlomoa/angular-django2/blob/main/projects/angular-django2/schematics/collection.json) accepts an OpenUI-document path or calls the shared utility.                                                                                                                                       |
| A document loaded from a schematic tree                                     | Implemented validation utility, not a mapping | [`readOpenUiDocument()`](https://github.com/shlomoa/angular-django2/blob/main/projects/angular-django2/schematics/utility/openui.ts) parses and validates before a caller mutates the tree; its focused [tests](https://github.com/shlomoa/angular-django2/blob/main/tests/schematics/schematics.openui.spec.ts) cover accepted and rejected documents. |
| Canonical object types such as `Table`, `Dialog`, `Stepper`, and `DataGrid` | Missing dedicated schematic support           | The public collection has no corresponding `table`, `dialog`, `stepper`, or `data-grid` schematic.                                                                                                                                                                                                                                                      |

## Available construction contracts are not OpenUI mappings

The following public schematics can be selected explicitly by the owning
orchestrator, but none accepts an `OpenUiDocument`. They therefore remain
construction contracts rather than active mappings.

| Construction area                   | Public schematic contracts                                                            | Status and evidence                                                                                                                                                                                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Application and Material shell      | `application`, `material-app`, `material-setup`, `app-shell`                          | Available public contracts; see their schemas in [`collection.json`](https://github.com/shlomoa/angular-django2/blob/main/projects/angular-django2/schematics/collection.json). No contract accepts canonical OpenUI input.                                                                      |
| Feature routing                     | `page`                                                                                | Available with explicit `name`, `path`, route, and navigation options in the [`page` schema](https://github.com/shlomoa/angular-django2/blob/main/projects/angular-django2/schematics/page/schema.json). It is not a mapping from `Dashboard`, `ShellPage`, `EmptyPage`, or another OpenUI type. |
| Components and composition          | `component`, `embed-component`, `complex-component`                                   | Available for explicit component paths, features, and wiring. The [`complex-component` schema](https://github.com/shlomoa/angular-django2/blob/main/projects/angular-django2/schematics/complex-component/schema.json) does not define a dialog, table, or OpenUI document contract.             |
| Form controls and create-only forms | `form-field`, `field-component`, `reactive-form`                                      | Available for their documented explicit options. The [`reactive-form` schema](https://github.com/shlomoa/angular-django2/blob/main/projects/angular-django2/schematics/reactive-form/schema.json) defines a separate, isolated JSON contract; it is not the canonical `Form` object contract.    |
| Typed API wrapper                   | `data-service`                                                                        | Available with an explicit generated OpenAPI-service name and import path in the [`data-service` schema](https://github.com/shlomoa/angular-django2/blob/main/projects/angular-django2/schematics/data-service/schema.json). It does not provide OpenUI report, list, table, or chart mappings.  |
| Workspace and language tooling      | `ng-add`, `workspace-setup`, `project-structure`, `openapi-setup`, `service`, `class` | Available public tooling contracts listed in [`collection.json`](https://github.com/shlomoa/angular-django2/blob/main/projects/angular-django2/schematics/collection.json); they are not OpenUI objects or mappings.                                                                             |

## Proposed mappings — not active

The following proposed mappings preserve the forward-looking plan. They do not
describe current behavior, and they must not be invoked as public contracts
until implementation and tests promote them to **Active functional mappings**.
The orchestration owner in [#27](https://github.com/shlomoa/angular-django2/issues/27)
selects whether and how a canonical document invokes supported contracts.

| Canonical OpenUI scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Candidate construction contract            | Status                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | -------------------------------------------------------------------- |
| [`table` / `Table`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Widgets/table.scope.md)                                                                                                                                                                                                                                                                                                                                                                                                                           | `table`                                    | Proposed first focus; not implemented.                               |
| [`dataGrid` / `DataGrid`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Widgets/data_grid.scope.md), [`dialog` / `Dialog`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Widgets/dialog.scope.md), and [`stepper` / `Stepper`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Widgets/stepper.scope.md)                                                                                                                                                                            | `data-grid`, `dialog`, `stepper`           | Proposed data presentation and interaction support; not implemented. |
| [`tabs` / `Tabs`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Containers/tabs.scope.md), [`expandablePanels` / `ExpandablePanels`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Containers/expandable_panels.scope.md), and [`sheetContainers` / `SheetContainers`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Containers/sheet_containers.scope.md)                                                                                                                        | `tabs`, `accordion`, `bottom-sheet`        | Proposed container support; not implemented.                         |
| [`menuWidgets` / `MenuWidgets`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Widgets/menu_widgets.scope.md), [`dateTimePickers` / `DateTimePickers`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Widgets/date_time_pickers.scope.md), [`feedbackWidgets` / `FeedbackWidgets`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Widgets/feedback_widgets.scope.md), and [`chart` / `Chart`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Widgets/chart.scope.md) | `menu`, `date-picker`, `feedback`, `chart` | Proposed specialized-widget support; not implemented.                |

## Change control

Do not add a row to **Active functional mappings** until all of the following
exist:

1. a supported public schematic schema that accepts the canonical input;
2. an implementation that validates it with `@shlomoa/openui-spec` before
   mutation when the input is an OpenUI document;
3. focused tests covering the accepted mapping and rejected input; and
4. alignment with the mapping/orchestration owner in
   [#27](https://github.com/shlomoa/angular-django2/issues/27).

See the [implementation status and plan](openui-spec-implementation-plan.md)
for parser integration status and the cross-repository roadmap.
