# OpenUI implementation status and future direction

## Scope and ownership

This document records the verified OpenUI status of `angular-django2`; it is
not a second definition of the OpenUI contract or an OpenUI-to-Angular
compiler design.

- [`@shlomoa/openui-spec` 0.2.0](https://www.npmjs.com/package/@shlomoa/openui-spec)
  owns the parser API. The tagged
  [schema](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/openui.schema.json),
  [catalog](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/openui.json),
  and [artifact-role documentation](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/README.md)
  own the canonical grammar, vocabulary, scope paths, and attributes.
- `angular-django2` owns its supported public schematic contracts, their
  deterministic generated output, and their tests. The executable collection
  is [the collection definition](../projects/angular-django2/schematics/collection.json).
- As resolved in [#27](https://github.com/shlomoa/angular-django2/issues/27),
  `django-angular3` owns selection of Django-side artifacts and the
  deterministic transformation from a validated canonical OpenUI document into
  explicit invocations of supported `angular-django2` schematics. It also owns
  wrappers, stage gating, and final generated-application acceptance.

Consequently, `angular-django2` does not currently implement a direct
OpenUI-to-ngdj compiler. This document does not redefine the cross-repository
transformation contract owned by #27.

## Verified current implementation

`angular-django2` declares `@shlomoa/openui-spec` with the `^0.2.0` range in
[package.json](../package.json) and ships the dependency in its schematics
package.

[`readOpenUiDocument()`](../projects/angular-django2/schematics/utility/openui.ts)
loads a document from a schematic tree, calls the canonical `OpenUiJson.parse`
and `validate` APIs, and translates missing, parse, and validation failures
into `SchematicsException`s. Its tests cover a valid catalog-backed document,
duplicate identifiers, malformed and missing inputs, and exact
case-sensitive catalog validation in
[`schematics.openui.spec.ts`](../projects/angular-django-validation/unit/schematics/schematics.openui.spec.ts).

This utility is preparatory support only. No factory in the current public
schematic [collection](../projects/angular-django2/schematics/collection.json)
imports it or accepts an OpenUI document as a public input. In particular, the
`reactive-form` JSON definition is its own schematic contract, not an OpenUI
document. Therefore, parser availability and validation-test coverage must not
be described as production schematic ingestion or compilation.

## Canonical terminology

Use the 0.2.0 catalog directly for object identifiers, type casing, scope
paths, and attributes. For example, the catalog distinguishes identifiers such
as `chart`, `list`, `form`, `report`, `rangeControl`, `pickerControl`, and
`statusIndicator` from their case-sensitive object types. This repository
does not define aliases, pluralization rules, or replacement attribute
inventories for those contracts.

## Future work

The remaining work is cross-repository orchestration, not a local claim that
every OpenUI object has an `angular-django2` implementation. Follow
[#27](https://github.com/shlomoa/angular-django2/issues/27) for the owning
roadmap and acceptance criteria. Any change to a public `angular-django2`
schematic remains owned and validated here; an unsupported OpenUI change must
be rejected explicitly by the orchestrating boundary.

The completed package-integration history is retained in
[#98](https://github.com/shlomoa/angular-django2/issues/98),
[#101](https://github.com/shlomoa/angular-django2/issues/101), and
[#104](https://github.com/shlomoa/angular-django2/issues/104). The production
schematic-integration work was tracked in
[#103](https://github.com/shlomoa/angular-django2/issues/103); the executable
status above is authoritative when historical issue text differs from it.
