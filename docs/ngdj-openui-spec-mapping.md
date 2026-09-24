# OpenUI and `angular-django2` mapping status

## Current mapping status

There are no active OpenUI-to-`angular-django2` schematic mappings. A mapping
is active only when a current public schematic contract accepts the relevant
validated OpenUI input and its implementation and tests verify that behavior.
The current [schematic collection](../projects/angular-django2/schematics/collection.json)
contains no such input contract or factory wiring.

The one verified OpenUI integration is preparatory validation support:

| OpenUI support                                    | Status                                                  | Evidence                                                                                                                                                                                 |
| :------------------------------------------------ | :------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parse and validate a document in a schematic tree | Available utility; not production schematic integration | [`readOpenUiDocument()`](../projects/angular-django2/schematics/utility/openui.ts) and its [unit tests](../projects/angular-django-validation/unit/schematics/schematics.openui.spec.ts) |

Public schematics such as `application`, `material-app`, `page`,
`reactive-form`, and `form-field` remain supported `angular-django2`
contracts, but they are not OpenUI mappings. In particular, `reactive-form`
accepts a schematic-specific JSON definition rather than a canonical OpenUI
document. Descriptions of those schematics belong in their
[schemas and implementations](../projects/angular-django2/schematics), not in
an OpenUI mapping table.

## Canonical vocabulary and boundary

[`openui-spec` 0.2.0](https://www.npmjs.com/package/@shlomoa/openui-spec)
owns the OpenUI contract. Use its tagged
[catalog](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/openui.json)
for exact identifier spelling and object-type casing, its
[schema](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/openui.schema.json)
for document grammar, and its
[specification documentation](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/README.md)
for scope and attribute definitions. This document intentionally does not
duplicate those inventories or infer singular/plural naming conventions.

Under [#27](https://github.com/shlomoa/angular-django2/issues/27),
`django-angular3` owns deterministic transformation from a validated canonical
OpenUI document into explicit invocations of supported public
`angular-django2` schematics. `angular-django2` owns the invoked schematic
contracts and generated output; `openui-spec` owns validation and vocabulary.
Until that external transformation is implemented and tested, it is
conceptual work rather than an active mapping.

See the [implementation status and future direction](openui-spec-implementation-plan.md)
for the corresponding package and parser status.
