# OpenUI implementation status and plan for `angular-django2`

## Purpose and source of truth

`angular-django2` (`ngdj`) publishes deterministic Angular CLI schematics for
Django-backed Angular applications. It does not currently compile a canonical
OpenUI document into Angular output.

OpenUI grammar, vocabulary, and document validation are owned by
[`openui-spec`](https://github.com/shlomoa/openui-spec). The canonical 0.2.0
artifacts are its
[schema](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/openui.schema.json),
[catalog](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/openui.json),
and [artifact-role documentation](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/README.md).
This document intentionally links to those artifacts rather than duplicating
their object, attribute, or scope definitions.

The cross-repository construction boundary is owned by
[angular-django2#27](https://github.com/shlomoa/angular-django2/issues/27):

- `openui-spec` owns canonical schemas, vocabulary, and parser/validator
  behavior.
- `angular-django2` owns its public schematic contracts, deterministic
  generated output, and tests.
- `django-angular3` owns Django-side artifact selection, the canonical
  OpenUI-to-supported-schematic mapping, orchestration, stage gating, and
  generated-application acceptance.

Accordingly, this plan does not define a second OpenUI-to-`ngdj` compiler
contract.

## Current implementation

| Capability                                     | Status                             | Evidence                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical parser dependency                    | Implemented                        | Root [`package.json`](https://github.com/shlomoa/angular-django2/blob/main/package.json) declares [`@shlomoa/openui-spec`](https://www.npmjs.com/package/@shlomoa/openui-spec) `^0.2.0`.                                                                                                        |
| Parse and validate a workspace document        | Implemented utility                | [`readOpenUiDocument()`](https://github.com/shlomoa/angular-django2/blob/main/projects/angular-django2/schematics/utility/openui.ts) reads a schematic-tree file, calls `OpenUiJson.parse()` and `validate()`, and translates missing, parse, and validation failures to `SchematicsException`. |
| Parser/validator coverage                      | Implemented                        | [`schematics.openui.spec.ts`](https://github.com/shlomoa/angular-django2/blob/main/tests/schematics/schematics.openui.spec.ts) verifies valid catalog-backed input, duplicate IDs, malformed and missing files, and case-sensitive catalog rejection.                                           |
| Public document-consuming schematic            | Not implemented                    | The published [`collection.json`](https://github.com/shlomoa/angular-django2/blob/main/projects/angular-django2/schematics/collection.json) has no schematic option for an OpenUI document, and no production schematic calls `readOpenUiDocument()`.                                           |
| Canonical document-to-schematic transformation | Not implemented in this repository | Per [#27](https://github.com/shlomoa/angular-django2/issues/27), that orchestration and mapping belong to `django-angular3`.                                                                                                                                                                    |
| Dedicated OpenUI object schematics             | Not implemented                    | There are no public `table`, `dialog`, `stepper`, `data-grid`, or equivalent OpenUI-object schematics in the collection.                                                                                                                                                                        |

The parser utility is deliberately available for a future public schematic to
use before its first tree mutation. Its presence does not make the collection a
document-driven compiler and does not establish a public OpenUI input contract.

## Existing construction contracts

The collection's currently supported schematics are defined by
[`collection.json`](https://github.com/shlomoa/angular-django2/blob/main/projects/angular-django2/schematics/collection.json).
They accept their own explicit schema options. For example, `reactive-form`
accepts the isolated JSON definition described by its
[schema](https://github.com/shlomoa/angular-django2/blob/main/projects/angular-django2/schematics/reactive-form/schema.json);
that definition is not an OpenUI document. The corresponding implementation
and tests remain the evidence for each schematic's behavior.

See [the mapping status](ngdj-openui-spec-mapping.md) for the distinction
between these usable construction contracts and OpenUI mappings.

## Proposed target architecture — not implemented

This section is forward-looking design, not a description of current
schematics, generated output, or public API. It is subject to the selected
cross-repository boundary in [#27](https://github.com/shlomoa/angular-django2/issues/27).

If the owner of #27 selects supported `angular-django2` contracts for
construction, the target output may compose three layers:

1. **Web standards baseline** — semantic HTML, accessible ARIA patterns,
   responsive layout, and native browser behavior.
2. **Angular Material and CDK** — Material design-system primitives and CDK
   behavior where the selected schematic contract requires them.
3. **Django-specific construction** — standalone OnPush Angular output,
   explicit integration with existing OpenAPI/data-service artifacts, and
   documented Django concerns such as server validation and authorization
   boundaries.

`django-angular3` would remain responsible for transforming a validated
canonical OpenUI document into explicit invocations of these supported
contracts. `angular-django2` would not introduce a separate document compiler
or duplicate the canonical OpenUI schema, catalog, or conformance rules.

## Proposed scope portfolio — not implemented

The following are candidate future construction contracts. They are **planned,
not active mappings**: no corresponding public schematic, generated-output
contract, or implementation/test evidence exists today. The identifiers and
scope paths below link to the canonical 0.2.0 source rather than restating its
object or attribute definitions.

| Canonical OpenUI scope                                                                                                                                                                                                                                                                                                                              | Candidate `angular-django2` construction contract | Proposed output focus                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [`table`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Widgets/table.scope.md)                                                                                                                                                                                                                                                    | `table`                                           | Accessible tabular presentation with explicitly selected Material/CDK and data-service integration. |
| [`dataGrid`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Widgets/data_grid.scope.md)                                                                                                                                                                                                                                             | `data-grid`                                       | Interactive tabular data behavior and selected editing or selection capabilities.                   |
| [`dialog`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Widgets/dialog.scope.md)                                                                                                                                                                                                                                                  | `dialog`                                          | Accessible overlay construction and explicit launch/lifecycle integration.                          |
| [`stepper`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Widgets/stepper.scope.md)                                                                                                                                                                                                                                                | `stepper`                                         | Ordered multi-step interaction composed with existing form contracts where appropriate.             |
| [`tabs`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Containers/tabs.scope.md) and [`expandablePanels`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Containers/expandable_panels.scope.md)                                                                                                                    | `tabs`, `accordion`                               | Accessible container composition and child-content integration.                                     |
| [`sheetContainers`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Containers/sheet_containers.scope.md) and [`menuWidgets`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Widgets/menu_widgets.scope.md)                                                                                                          | `bottom-sheet`, `menu`                            | Overlay, navigation, and interaction patterns.                                                      |
| [`dateTimePickers`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Widgets/date_time_pickers.scope.md), [`feedbackWidgets`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Widgets/feedback_widgets.scope.md), and [`chart`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Widgets/chart.scope.md) | `date-picker`, `feedback`, `chart`                | Specialized inputs, feedback, and data presentation.                                                |
| [`displayPrimitives`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Controls/display_primitives.scope.md)                                                                                                                                                                                                                          | Not selected                                      | Canonical scope retained for future contract selection; no dedicated schematic is proposed yet.     |

The table scope is the proposed first focus because it provides a bounded
path to validate the architecture: semantic table output, selected Angular
Material/CDK primitives, and explicit integration with existing data-service
contracts. This is not an assertion that `table` currently exists or that all
listed integrations are selected.

## Proposed delivery sequence — not implemented

Subject to the decision and orchestration work in
[#27](https://github.com/shlomoa/angular-django2/issues/27), future work should
proceed by:

1. selecting and documenting the cross-repository orchestration boundary in
   its owning repository;
2. defining and implementing one narrow public schematic contract at a time,
   beginning with the proposed `table` focus;
3. validating OpenUI documents with `@shlomoa/openui-spec` before mutation
   only for contracts that accept such documents;
4. adding focused contract, error, and generated-application coverage; and
5. promoting a proposed mapping to active status in
   [the mapping status](ngdj-openui-spec-mapping.md) only after executable
   implementation and tests exist.

Completed package and utility integration history is recorded in
[#101](https://github.com/shlomoa/angular-django2/issues/101),
[#103](https://github.com/shlomoa/angular-django2/issues/103), and
[#104](https://github.com/shlomoa/angular-django2/issues/104). Those closed
issues do not imply production schematic integration.

## Validation

For repository documentation validation, run:

```bash
npm run format:check
npm run docs:build
```
