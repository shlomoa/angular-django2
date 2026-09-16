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

## Future work

The only cross-repository roadmap is the ownership boundary and acceptance
work tracked by [#27](https://github.com/shlomoa/angular-django2/issues/27).
If that owner selects a new supported `angular-django2` schematic contract,
this repository should:

1. define the narrow public schematic schema and generated-output behavior;
2. use the canonical parser/validator before tree mutation if the contract
   accepts an OpenUI document;
3. add focused schematic tests for the contract and error behavior; and
4. update this status document and the mapping document only after the
   executable contract exists.

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
