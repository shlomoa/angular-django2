# 109 - Angular requirements reference surface

Issue: [#109](https://github.com/shlomoa/angular-django2/issues/109). Epic:
[#108](https://github.com/shlomoa/angular-django2/issues/108). Step 1 only.
Terminology: openui-spec 0.12.0 as set in #108. Source wording is quoted
exactly and never rewritten. Correctness is not assessed.

## 1. Source paths

Searched (the only searched file):

- `docs/REQUIREMENTS.md` (361 lines, `origin/main` at `916ea68`).

Read for terminology only (not searched for the six terms):

- `docs/ngdj-openui-spec-mapping.md` (scope paths and mapping classes).

Not read: any `django-angular3` file.

Method: case-sensitive fixed-string search for the six terms. Occurrences are
counted per match (a line with two matches counts twice). Lowercase look-alikes
are not exact occurrences and are listed in section 2.

## 2. Exact results

| Term | Occurrences | Lines |
| --- | --- | --- |
| `django-angular3` | 8 | 14, 28, 33 (x2: link text and URL), 260 (x2: link text and URL), 261, 264 |
| `djng` | 1 | 32 |
| `ngdj` | 2 | 26, 32 |
| `build_app` | 0 | none |
| `OpenAPI` | 0 | none |
| `OpenUI` | 9 | 34, 36, 39, 41, 154, 219, 222, 236, 240 |
| Total | 20 | 17 distinct lines |

Non-matches, recorded so they are not mistaken for occurrences (case differs):

- `openapi-setup` (lines 105, 202, 252), `--openapi-spec-file` and `openapi.json`
  (line 211): schematic and option identifiers.
- `@shlomoa/openui-spec` (line 42, 226) and URL or anchor fragments containing
  `openui-` (lines 36, 39, 242 to 250): package names and links.
- No occurrence of the Epic identifiers `openuiSpecification`,
  `artifacts.openuiSpecification`, `app.openui.json`, `input.json`, "OpenUI
  description", "app document", "concrete app spec" or "generator input".
- Wording "concrete UI document" (line 37) and "structured input documents" (line 68) occur but carry none of the
  six terms.

## 3. Occurrence inventory

Class column uses the issue's five classes. Wording class (A, B, C or
Identifier) is given only where the occurrence names an OpenUI document. No
occurrence is classified as generated-app requirement or planned orchestration.

| # | Line | Section | Surrounding requirement statement (quoted) | Class | Canonical term and wording class |
| --- | --- | --- | --- | --- | --- |
| O1 | 14 | Preamble (source-priority list, item 3) | "3. the `django-angular3` repo for Django-side integration details not specified here" | external dependency | djng repo; n/a |
| O2 | 26 | Terminology | "**angular-django2** (also referred to as **ngdj**): This repository - an Angular 22 workspace that produces a Django-friendly npm schematics package." | terminology | ngdj; n/a |
| O3 | 28 | Terminology | "**django-angular3**: A companion Django package that provides Django management commands (`django-admin`) for Angular workspace operations, including automatic invocation of `ng add angular-django2`." | terminology | djng; n/a |
| O4 | 32 | Terminology | "**djangoangular**: The code name for the tight Django-Angular integration formed by `djng` and `ngdj`." | terminology | djng; n/a |
| O5 | 32 | Terminology | same sentence as O4 (`ngdj`) | terminology | ngdj; n/a |
| O6 | 33 | Terminology | "[django-angular3 architecture §2.6.1](https://github.com/shlomoa/django-angular3/blob/main/doc/ARCHITECTURE.md#261-djangoangular)" (link text) | external dependency | djng architecture doc; n/a |
| O7 | 33 | Terminology | same link (URL path `shlomoa/django-angular3/blob/main/doc/ARCHITECTURE.md#261-djangoangular`) | external dependency | djng architecture doc; n/a |
| O8 | 34 | Terminology | "**OpenUI**: An external, technology-independent UI-description specification." | terminology | OpenUI specification (whole specification); n/a |
| O9 | 36 | Terminology | "[OpenUI specification](https://github.com/shlomoa/openui-spec/blob/main/spec/README.md)" (link text) | external dependency | OpenUI specification, meaning the whole specification (not a concrete UI document); not class C |
| O10 | 39 | Terminology | "[OpenUI artifact-role SSOT](https://github.com/shlomoa/openui-spec/blob/main/spec/README.md#specification-artifacts-grammar-vs-catalog)" | external dependency | spec artifacts section; n/a (not a document wording) |
| O11 | 41 | Terminology | "Schematics that accept an OpenUI document must load and validate it with the bundled `@shlomoa/openui-spec` parser before mutating the workspace tree." | integration fact (ngdj package requirement) | "OpenUI document" = concrete UI document; wording class B (pending D1) |
| O12 | 154 | 3. Schematics Requirements (`reactive-form` item) | "generate a typed standalone OnPush Angular Material reactive form from an OpenUI `Form` node (`--document`) or, deprecated, from a single JSON definition file supplied through `--definition`, which is translated into the same `Form` node and logs a deprecation warning carrying that node." | integration fact (ngdj package requirement) | "node" = element; `Form` = `views/form`, mapping class Direct; not document wording |
| O13 | 219 | 3. Schematics Requirements, "OpenUI document input contracts" | "### OpenUI document input contracts" (heading) | integration fact (ngdj package requirement) | "OpenUI document" = concrete UI document; wording class B (pending D1) |
| O14 | 222 | same subsection | "Schematics that compile UI accept `--document=<path>` (a workspace-relative OpenUI JSON document) and, where a document can hold several candidates, `--node-id=<id>`; without `--node-id` they compile the first element of a supported type." | integration fact (ngdj package requirement) | "OpenUI JSON document" = concrete UI document; wording class B (unlisted variant of "OpenUI document", pending D1) |
| O15 | 236 | same subsection | "Legacy CLI flags are translated into synthetic OpenUI nodes and compiled by the same code path." | integration fact (ngdj package requirement) | "nodes" = elements; not document wording |
| O16 | 240 | same subsection, table header | "\| Schematic \| OpenUI input \|" | integration fact (ngdj package requirement) | "OpenUI input" = concrete UI document (its cells list element types); wording class B (pending D1) |
| O17 | 260 | 4. Django Integration Requirements | "This library is designed to integrate with [django-angular3](https://github.com/shlomoa/django-angular3)." (link text) | integration fact | djng; n/a |
| O18 | 260 | 4. Django Integration Requirements | same link (URL path `shlomoa/django-angular3`) | integration fact | djng; n/a |
| O19 | 261 | 4. Django Integration Requirements | "django-angular3 provides Django management commands using `django-admin` for Angular workspace operations." | integration fact | djng; n/a |
| O20 | 264 | 4. Django Integration Requirements | "django-angular3 to register the schematic collection." (sentence: "The `ng add angular-django2` schematic is invoked automatically by django-angular3 to register the schematic collection.") | integration fact | djng; n/a |

Counts by class: terminology 5 (O2, O3, O4, O5, O8), external dependency 5
(O1, O6, O7, O9, O10), integration fact 10 (O11 to O20), generated-app
requirement 0, planned orchestration 0. Total 20.

Wording classes found for the OpenUI document: class B 4 (O11, O13, O14, O16);
class A 0; class C 0; identifier 0.

## 4. Angular claims that require a `djng` document reference

Finite list: 22 claims. Group A names `djng`, `ngdj` or `django-angular3`
(8 claims). Group B holds claims that name OpenUI and an ngdj schematic input;
the wording does not name `djng`, but #108 and the mapping document assign the
OpenUI-to-schematic mapping for whole applications to `djng`, so they are
candidates only (14 claims). The user decides in the gate whether Group B enters
cross-repository mapping.

### Group A: claims that name djng or ngdj

| ID | Lines | Occurrences | Claim (quoted) | Canonical term |
| --- | --- | --- | --- | --- |
| A1 | 13-15 | O1 | "3. the `django-angular3` repo for Django-side integration details not specified here" | django-angular3 (djng) |
| A2 | 26-27 | O2 | "**angular-django2** (also referred to as **ngdj**)" | ngdj |
| A3 | 28-30 | O3 | "A companion Django package that provides Django management commands (`django-admin`) for Angular workspace operations, including automatic invocation of `ng add angular-django2`." | djng |
| A4 | 31-33 | O4, O5, O6, O7 | "The code name for the tight Django-Angular integration formed by `djng` and `ngdj`. Its canonical definition is in django-angular3 architecture §2.6.1" | djangoangular, djng, ngdj |
| A5 | 259-260 | O17, O18 | "This library is designed to integrate with django-angular3." | djng |
| A6 | 261-262 | O19 | "django-angular3 provides Django management commands using `django-admin` for Angular workspace operations." | djng |
| A7 | 263-264 | O20 | "The `ng add angular-django2` schematic is invoked automatically by django-angular3 to register the schematic collection." | djng |
| A8 | 265-266 | none (no search term; depends on A5) | "Documentation and code should reflect this integration relationship where relevant." | djng |

A3 overlaps A6 (management commands) and A7 (automatic `ng add`). They are
kept separate because each is a separate statement at a separate location.

### Group B: OpenUI input claims (candidates)

For each claim that names a UI object (a schematic's input), the OpenUI scope
path and mapping class come from `docs/ngdj-openui-spec-mapping.md`.

| ID | Lines | Occurrences | Claim (quoted) | Canonical term | Scope path and mapping class |
| --- | --- | --- | --- | --- | --- |
| B1 | 34-39 | O8, O9, O10 | "**OpenUI**: An external, technology-independent UI-description specification. Its purpose and vocabulary are defined by the OpenUI specification, and the roles of its schema, catalog, and concrete UI document are defined by the OpenUI artifact-role SSOT." | OpenUI specification (whole); concrete UI document | n/a |
| B2 | 40-43 | O11 | "Schematics that accept an OpenUI document must load and validate it with the bundled `@shlomoa/openui-spec` parser before mutating the workspace tree." | concrete UI document (wording class B) | n/a |
| B3 | 153-157 | O12 | "generate a typed standalone OnPush Angular Material reactive form from an OpenUI `Form` node (`--document`) or, deprecated, from a single JSON definition file supplied through `--definition`, ..." | element `Form` | `views/form`; Direct (OpenUI in) |
| B4 | 219-225 | O13, O14 | "Schematics that compile UI accept `--document=<path>` (a workspace-relative OpenUI JSON document) and, where a document can hold several candidates, `--node-id=<id>`; ... The document is loaded and validated with `@shlomoa/openui-spec` before any mutation." | concrete UI document (wording class B) | n/a |
| B5 | 234-236 | O15 | "Options that a node describes cannot be combined with `--document`; the schematic reports the conflicting flags. Legacy CLI flags are translated into synthetic OpenUI nodes and compiled by the same code path." | element | n/a |
| B6 | 240-241 | O16 | `reactive-form`: "`Form` with `TextInputs` / `RangeControl` / `ActionControls` children" | elements `Form`, `TextInputs`, `RangeControl`, `ActionControls` | `views/form`, `controls/textInputs`, `controls/rangeControl`, `controls/actionControls`; Direct (OpenUI in) |
| B7 | 240, 243 | O16 | `form-field`, `field-component`: "`TextInputs` or `RangeControl`" | elements `TextInputs`, `RangeControl` | `controls/textInputs`, `controls/rangeControl`; Direct (OpenUI in) |
| B8 | 240, 244 | O16 | `component`: "`SurfaceContainers`; children compiled and embedded by `uses.slot`" | element `SurfaceContainers` | `containers/surfaceContainers`; Direct (OpenUI in) |
| B9 | 240, 245 | O16 | `complex-component`: "`SurfaceContainers` as a Material card; optional `OverlayContainers` child" | elements `SurfaceContainers`, `OverlayContainers` | `containers/surfaceContainers`, `containers/overlayContainers`; Direct (OpenUI in) |
| B10 | 240, 246 | O16 | `embed-component`: "`--slot` (`header`, `content`, `actions`) matching the `uses.slot` sections" | `uses.slot` composition (CLI option) | no OpenUI scope; Conceptual / CLI by design |
| B11 | 240, 247 | O16 | `page`: "`DashboardPage` or `EmptyPage` with `uses.title`, `uses.route`, `uses.icon`, `uses.access`, `uses.authGuard`" | elements `DashboardPage`, `EmptyPage` | `pages/dashboard`, `pages/emptyPage`; Direct (OpenUI in) |
| B12 | 240, 248 | O16 | `application`, `material-app`: "`Application` with `Routing`, `Navigation`, `ToolBar`, `Presentation`; `material-app` renders validated toolbar rows and sidenav links" | element `Application` | `Application` (scope path not stated in the mapping document), `application/routing`, `application/navigation`, `application/toolBars`, `presentation`; Direct (OpenUI in) for both schematics |
| B13 | 240, 249 | O16 | `workspace-setup`: "`html` (`uses.lang`, `uses.dir`, `uses.title`) and `link` (`uses.rel`, `uses.href`)" | elements `html`, `link` | `application/indexHtml`, `application/favicon`; Direct (OpenUI in) |
| B14 | 240, 250 | O16 | `data-service`: "any element with `uses.data` = `<apiPath>#<ApiService>` (unquoted)" | element with `uses.data` | no scope path (any node carrying `uses.data`); Direct (OpenUI in) |

Adjacent statements inside the same subsection that carry none of the six terms
(lines 226-233, 252-255) and other `django`-related statements (lines 75-81) are
not inventoried; the issue scopes Step 1 to the six terms.

## 5. Completed steps

1. Searched `docs/REQUIREMENTS.md` for the six terms: done (section 2).
2. For each of the 20 occurrences recorded section and surrounding statement,
   and classified it: done (section 3). No correctness assessment made.
3. Produced the finite list of Angular claims: done (section 4, 22 claims:
   8 in Group A, 14 in Group B).
4. Intermediate result written to this file: done.

Not done by design: handoff updates to #108, #110 to #115 (they happen when the
gate resolves), closing #109, and any Step 2 discovery.

## 6. Gate outcome

USER INTERVENTION REQUIRED: pending.

The user reviews the claim inventory in section 4 and selects the claims
permitted to enter cross-repository mapping:

- Group A (A1 to A8): claims that name `djng`, `ngdj` or `django-angular3`.
- Group B (B1 to B14): OpenUI input claims, included as candidates.

Two classification points need the owner's eye:

- O14 "OpenUI JSON document" is not a listed alias; it is recorded as class B
  like "OpenUI document", pending D1.
- A8 has no search-term occurrence and is included only because it depends on A5.

#109 stays open. Issues #110 to #115 stay blocked until this gate resolves.
