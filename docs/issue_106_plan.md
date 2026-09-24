# Execution Plan (Restart): Review and Refresh OpenUI Implementation Plan and Mapping Documentation

This plan restarts the work on
[Issue #106: Review and refresh OpenUI implementation plan and mapping documentation](https://github.com/shlomoa/angular-django2/issues/106).
It supersedes the plan in [PR #125](https://github.com/shlomoa/angular-django2/pull/125)
(branch `shlomoa/issue_106_pr`), which was written before the schematics were
migrated to OpenUI input.

Follow [.github/copilot-instructions.md](../.github/copilot-instructions.md) and
the external Single Source of Truth (SSOT) it references.

Documents in scope:

- [`docs/openui-spec-implementation-plan.md`](openui-spec-implementation-plan.md)
- [`docs/ngdj-openui-spec-mapping.md`](ngdj-openui-spec-mapping.md)

---

## 1. Why a Restart

| Date (2026-09-24) | Event                                                                                                                                                                                                                                                                                |
| :---------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #125 opened    | Plan written against `main` at `795df6c` (0.5.0). At that point no production schematic consumed OpenUI documents.                                                                                                                                                                   |
| PR #126 merged    | `main` → `3f9a35e`. Migration plan phases 1–2: AST compiler core; `reactive-form`, `form-field`, `field-component` accept `--document` / `--nodeId`.                                                                                                                                 |
| Drafts written    | The two docs were rewritten against the post-#126 state. They were **not committed** to #125, and they are now stale.                                                                                                                                                                |
| PR #127 merged    | `main` → `7e7047a`. Migration plan phases 3–7 are marked complete: `component`, `complex-component`, `embed-component`, `page`, `application`, `material-app`, `workspace-setup`, and `data-service` compile OpenUI nodes. #127 also partially edited `ngdj-openui-spec-mapping.md`. |

Consequences:

- The post-#126 drafts say that about eight schematics do not accept
  `--document`. That is false on `main`, so the drafts cannot be merged as they
  are.
- #127 added an "OpenUI Document Input" table (§1.1) to the mapping document
  but kept the older, inaccurate §1 rows (§2.4 below). The mapping document
  currently contradicts itself.
- A previous agent reported the migration "done" before it was. **Every
  "Implemented" claim must be checked against code and a named test before the
  refreshed docs repeat it** (Phase 2 below).

The verified findings that still hold are recorded in §2 so that none of the
earlier research is lost.

---

## 2. Verified Findings (Reusable)

### 2.1 Canonical OpenUI 0.2.0 vocabulary

Source: `spec/openui.json` in `@shlomoa/openui-spec` 0.2.0 (the version pinned in
[`package.json`](../package.json)). Scope paths are `<category>/<id>`.

| Category          | Scope ids                                                                                                                                                                         |
| :---------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `application`     | `routing`, `navigation`, `toolBars`, `favicon`, `indexHtml`                                                                                                                       |
| `behaviors`       | `dragAndDrop`, `resizable`, `collapsible`                                                                                                                                         |
| `containers`      | `grid`, `expandablePanels`, `tabs`, `surfaceContainers`, `sheetContainers`, `overlayContainers`, `structuralContainers`, `splitters`                                              |
| `controls`        | `native`, `actionControls`, `textInputs`, `choiceControls`, `pickerControl`, `rangeControl`, `drawingAndCapture`, `displayPrimitives`, `statusIndicator`, `linkAndScrollControls` |
| `pages`           | `dashboard` (type `Dashboard`, instance `DashboardPage`), `shellPage`, `emptyPage`                                                                                                |
| `views`           | `report`, `form`                                                                                                                                                                  |
| `widgets`         | `chart`, `table`, `dataGrid`, `list`, `feedbackWidgets`, `mediaWidgets`, `navigationWidgets`, `menuWidgets`, `dateTimePickers`, `stepper`, `dialog`                               |
| (no child scopes) | `interaction`, `internationalization`, `layout`, `presentation`                                                                                                                   |

Vocabulary facts to enforce in both documents:

- Obsolete names used in the current docs, with the canonical names:
  `charts` → `chart`, `lists` → `list`, `data_grid` → `dataGrid`, `forms` →
  `form`, `reports` → `report`, `pickerControls` → `pickerControl`,
  `rangeControls` → `rangeControl`, `statusIndicators` → `statusIndicator`,
  `expandable_panels` → `expandablePanels`, `sheet_containers` →
  `sheetContainers`, `menu_widgets` → `menuWidgets`, `feedback_widgets` →
  `feedbackWidgets`, `date_time_pickers` → `dateTimePickers`.
- `dateTimePickers` is under `widgets/`, not `controls/`.
- `dashboard`, `emptyPage`, `shellPage` are under `pages/`, not `views/`.
  `views/` holds only `report` and `form`.
- `accordion` does **not** appear anywhere in the 0.2.0 catalog. It is an
  Angular Material term; the OpenUI scope is `containers/expandablePanels`.
  (The migration plan calls it an "alias"; the docs must not present it as an
  OpenUI identifier.) The same applies to `bottom-sheet`, `menu`, `feedback`,
  and `date-picker` as proposed schematic names.
- The package is `@shlomoa/openui-spec`. The placeholder `@openui/spec` in the
  implementation plan diagram is wrong.
- Singular ids are discrete concepts (`chart`, `table`, `dataGrid`, `list`,
  `stepper`, `dialog`, `form`, `report`, `pickerControl`, `rangeControl`,
  `statusIndicator`, `native`, `grid`, `dashboard`, `shellPage`, `emptyPage`).
  Plural or grouped ids are families (`feedbackWidgets`, `mediaWidgets`,
  `navigationWidgets`, `menuWidgets`, `dateTimePickers`, `expandablePanels`,
  `tabs`, `surfaceContainers`, `sheetContainers`, `overlayContainers`,
  `structuralContainers`, `splitters`, `actionControls`, `textInputs`,
  `choiceControls`, `drawingAndCapture`, `displayPrimitives`,
  `linkAndScrollControls`, `toolBars`). The current "Naming Conventions"
  section of the mapping document lists pre-0.2.0 names and must be rewritten
  from this list.

### 2.2 `widgets/table` facts (OpenUI v0.2.0)

- Catalog: scope `id: table`, `type: Table`; instance element `type: table`
  with `tr` row children (`tableRow`).
- Normative attributes, from
  [`scopes/Widgets/table.scope.md`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/scopes/Widgets/table.scope.md):
  only `(sort)`, `(filter)`, `(paginate)`.
- `[data]`, `[selection]`, `[loading]`, `[error]`, `(selectionChange)`, and the
  column / pagination / empty-state children come from
  [`examples/Widgets/table.example.json`](https://github.com/shlomoa/openui-spec/blob/v0.2.0/spec/examples/Widgets/table.example.json).
  They are illustrative, not normative. The implementation plan §4 currently
  presents them as the scope contract and gives the identity as
  `type: table`; both must be corrected.
- `spec/scopes/Controls/` in v0.2.0 has no `Table` scope, which confirms that
  `Controls/Table/` was retired.

### 2.3 Issue status and ownership boundary

| Issue                                                         | State  | Use in the docs                                                       |
| :------------------------------------------------------------ | :----- | :-------------------------------------------------------------------- |
| [#27](https://github.com/shlomoa/angular-django2/issues/27)   | Open   | Cross-repository orchestration epic; ownership boundary (below).      |
| [#98](https://github.com/shlomoa/angular-django2/issues/98)   | Closed | Parser/validator integration epic.                                    |
| [#101](https://github.com/shlomoa/angular-django2/issues/101) | Closed | Integration of the `@shlomoa/openui-spec` npm package.                |
| [#103](https://github.com/shlomoa/angular-django2/issues/103) | Closed | Schematics pipeline integration. Not "pending", as the old plan said. |
| [#104](https://github.com/shlomoa/angular-django2/issues/104) | Closed | openui-spec 0.2.0 integration.                                        |

Ownership boundary (#27):

- `openui-spec`: canonical OpenUI schemas, vocabulary, and the parser/validator
  library.
- `angular-django2`: its supported public schematic contracts and generated
  output.
- `django-angular3` (`djng`): Django-side artifact selection, canonical
  OpenUI-to-supported-schematic mapping, wrappers, orchestration.

Maintainer decision recorded in the migration plan (Phase 5): the master
document compiler is **validation-only**. It is not a schematic, is not shipped,
and must not appear in user-facing documentation. It lives in
`projects/angular-django-validation/unit/integration/openui-application-compiler.ts`.
The refreshed docs must not describe a public `compile` schematic.

### 2.4 Known defects in the documents on `main` (`7e7047a`)

`docs/ngdj-openui-spec-mapping.md`:

- §1 "Active Functional Mappings" still marks several rows **Equal** that are
  conceptual, and it duplicates, and sometimes contradicts, the new §1.1 table.
- `form-field` is claimed to implement `choiceControls` and `pickerControls`.
  The code accepts only `TextInputs` and `RangeControl` (`[type]` = `text`,
  `email`, `password`, `textarea`, `number`) and rejects other node types.
- `field-component` is claimed to generate `actionControls` and
  `displayPrimitives` components. Its `--kind` is only `text`, `email`,
  `password`, `textarea`.
- `material-setup` is claimed to configure toolbar styles. It configures theme,
  typography, and animations only; the toolbar comes from `material-app`'s
  layout template.
- `data-service` is described as the provider for "reports" views. It
  generates data transport only; no report UI exists.
- `dialog` appears both as an active mapping (§1) and as missing (§3).
- Obsolete scope names throughout (§2.1), and the naming-conventions section is
  pre-0.2.0.

`docs/openui-spec-implementation-plan.md`:

- Diagram cites `@openui/spec` (§2.1).
- §1.3 and the roadmap point to #98 as the pending integration; §5 mixes
  completed and planned items without evidence links.
- The §3 matrix uses obsolete scope names (`Widgets/data_grid`,
  `Containers/expandable_panels`, `Controls/date_time_pickers`,
  `Widgets/charts`, …).
- §4 table facts need the correction in §2.2.

### 2.5 Verified schematic evidence on `main` (Phase 2 result)

Verified on `7e7047a` from code (`schematics/<name>/{index,ast}.ts`,
`utility/ast-compiler.ts`, `utility/openui.ts`) and from the named tests, which
all pass `document` to the schematic or to its compiler. Every node type below
exists in the `@shlomoa/openui-spec` 0.2.0 catalog. Attributes outside the
listed subset are rejected (`assertAstAttributes`) unless §2.6 says otherwise.
Test IDs are under `projects/angular-django-validation/unit/schematics/`.

Shared ingestion: `readOpenUiDocument()` (`utility/openui.ts`) parses and
validates the document with the canonical validator. `readAstNode()` /
`resolveAstNode()` (`utility/ast-compiler.ts`) resolve `--nodeId`, or the first
node of the expected type when `--nodeId` is omitted. With neither option given,
they resolve the root. They reject a missing node or a node of the wrong type.

| Schematic           | Accepts (catalog scope)                                                                                                                                                    | Supported subset                                                                                                                                                                                                                                                                                       | Rejects / conflicts                                                                                                                                                                  | Tests                                                                                           |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| `reactive-form`     | `Form` (`views/form`); children: controls (below) plus at most one `ActionControls` (`controls/actionControls`) submit node                                                | `Form`: `[title]`, `[action]`, `(submit)` (`<artifact>#<Symbol>.<method>`). `ActionControls`: `[label]`, no children. Controls: as `form-field`.                                                                                                                                                       | Other child types; more than one submit; `--document` with `--definition`; `--nodeId` without `--document`. `--definition` is deprecated.                                            | `schematics.reactive-form.spec.ts` `TC-REACTIVE-FORM-OPENUI-01…06`, `-DEPRECATION`, `-TUTORIAL` |
| `form-field`        | `TextInputs` (`controls/textInputs`), `RangeControl` (`controls/rangeControl`)                                                                                             | `[type]` (`text`, `email`, `password`, `textarea` on `TextInputs`; `number` on `RangeControl`), `[name]`, `[label]`, `[value]`, `[hint]`, `[placeholder]`, `[autocomplete]`, `[required]`, `[email]`, `[minLength]`, `[maxLength]`, `[min]`, `[max]`, `[pattern]`, `[appearance]`, `[subscriptSizing]` | Other node types (for example `ChoiceControls`, `PickerControl`); a `[type]` that contradicts the node type; `--controlType`, `--appearance`, `--subscriptSizing` with `--document`. | `schematics.form-field.spec.ts` `TC-FORM-FIELD-OPENUI-01…03`                                    |
| `field-component`   | `TextInputs` only                                                                                                                                                          | As `form-field`, `[type]` limited to `text`, `email`, `password`, `textarea`                                                                                                                                                                                                                           | `RangeControl` and other types; `--kind` with `--document`.                                                                                                                          | `schematics.field-component.spec.ts` `TC-FIELD-OPENUI-01`                                       |
| `component`         | `SurfaceContainers` (`containers/surfaceContainers`); children: `SurfaceContainers`, `Form`, `TextInputs`, `RangeControl`, each compiled to its own component and embedded | `[title]`, `[slot]` (`header`, `content`, `actions`; default `content`)                                                                                                                                                                                                                                | Other node or child types; unknown slots.                                                                                                                                            | `schematics.composition.spec.ts` `TC-COMPOSE-01…04`, `TC-COMPOSE-09`                            |
| `complex-component` | `SurfaceContainers` with the children above, plus at most one `OverlayContainers` (`containers/overlayContainers`) child, compiled to the CDK overlay                      | Container as `component`. `OverlayContainers`: `[label]`; its children may not set `[slot]`.                                                                                                                                                                                                           | More than one overlay; `--features` with `--document`; `--mode` other than `create`.                                                                                                 | `schematics.composition.spec.ts` `TC-COMPOSE-05…08`                                             |
| `embed-component`   | No OpenUI input (CLI `--slot`). Its logic (`embed-component/compose.ts`) is the composition engine used by `component`, `complex-component`, and `page`.                   | —                                                                                                                                                                                                                                                                                                      | —                                                                                                                                                                                    | `schematics.composition.spec.ts` `TC-COMPOSE-09…11`                                             |
| `page`              | `DashboardPage` (instance of `pages/dashboard`), `EmptyPage` (`pages/emptyPage`). `DashboardPage` children are composed as in `component`.                                 | `[title]`, `[route]`, `[icon]`, `[access]` (`public`, `protected`), `[authGuard]`                                                                                                                                                                                                                      | Other types; children on `EmptyPage`; `--routePath`, `--navigationLabel`, and similar options with `--document`.                                                                     | `schematics.openui-app.spec.ts` `TC-APP-03…05`                                                  |
| `application`       | `Application` (`application`); allowed children `Routing`, `Navigation`, `ToolBars`, `Presentation`, `IndexHtml`, `Favicon`                                                | Name from the node id; routing when a `Routing` child exists. `[title]` is read but unused here (see §2.6).                                                                                                                                                                                            | Other child types; more than one `Routing` or `Presentation`; `--routing` with `--document`.                                                                                         | `schematics.openui-app.spec.ts` `TC-APP-01`, `TC-APP-02`                                        |
| `material-app`      | As `application`, plus `Presentation` (`presentation`) and every `DashboardPage` in the document (sidenav links)                                                           | `Application[title]` (toolbar title); `Presentation`: `[theme]`, `[typography]`, `[animations]`; page links as `page`                                                                                                                                                                                  | `--theme`, `--typography`, `--animations`, `--routing` with `--document`; `DashboardPage` navigation without `Routing`.                                                              | `schematics.openui-app.spec.ts` `TC-APP-06`, `TC-APP-07`, `TC-APP-13`                           |
| `workspace-setup`   | First `IndexHtml` (`application/indexHtml`) and first `Favicon` (`application/favicon`) anywhere in the document; no `--nodeId`                                            | `IndexHtml`: `[lang]`, `[dir]` (`ltr`, `rtl`, `auto`), `[title]`. `Favicon`: `[href]` (workspace file; no `..`).                                                                                                                                                                                       | `files.indexHtml` / `files.favicon` with `--document`; missing icon file or `index.html`.                                                                                            | `schematics.openui-app.spec.ts` `TC-APP-08…10`                                                  |
| `data-service`      | Any node type carrying `[data]` (by `--nodeId`, else the first such node)                                                                                                  | `[data]` = `<apiPath>#<ApiService>` (a repository convention, not an OpenUI-normative format). Other attributes are not read or checked.                                                                                                                                                               | Missing or malformed `[data]`; `--apiService`, `--apiPath` with `--document`.                                                                                                        | `schematics.openui-app.spec.ts` `TC-APP-11`, `TC-APP-12`                                        |
| `material-setup`    | No OpenUI input; CLI-driven by design (#127, `f833a81`). `material-app --document` passes `Presentation` tokens to it.                                                     | —                                                                                                                                                                                                                                                                                                      | —                                                                                                                                                                                    | —                                                                                               |
| `app-shell`         | No OpenUI input; pass-through to Angular's SSR app-shell (#127, `f833a81`). OpenUI `ShellPage` maps to the `material-app` layout (`a11e9f3`).                              | —                                                                                                                                                                                                                                                                                                      | —                                                                                                                                                                                    | —                                                                                               |
| Master compiler     | Validation-only, not shipped: `unit/integration/openui-application-compiler.ts`                                                                                            | —                                                                                                                                                                                                                                                                                                      | —                                                                                                                                                                                    | `unit/integration/openui-application.integration.spec.ts`                                       |

Phase 1 baseline on `7e7047a` (Linux, Node 24.15.0, npm 11.12.1, platform-native
`npm ci`): `format:check`, `lint`, `build` ✅; `test:ci` ✅ (node: 24 files /
243 tests; reference app: 9 files / 50 tests); `pack:dry-run` ✅ (169 files,
127.7 kB); `docs:build` ✅ (mkdocs 1.6.1, `--strict`).

### 2.6 Phase 2 findings: claims the code does not fully support

1. **`Navigation` and `ToolBars` children are dropped silently.**
   `application/ast.ts` allows `Navigation` and `ToolBars` as `Application`
   children but never reads or validates them. The `Routing` child's
   attributes and children are not checked either. A runtime probe against the
   built `applicationFromAst` accepted `Routing[bogus]`, `Navigation[bogus]`
   with a `TextInputs` child, and `ToolBars[bogus]` without error. For
   comparison, it rejects `Presentation[bogus]`. This contradicts the migration
   plan's rule "Unknown attributes are rejected, so nothing is dropped
   silently" (`docs/migrate_schematics_to_openui_plan.md`, Phase 3 and 5 notes).
   No test covers `Navigation` or `ToolBars` children. Sidenav links come only
   from `DashboardPage` nodes (`TC-APP-13`). The docs must not describe
   `application/navigation` or `application/toolBars` as compiled.
2. **`application --document` ignores `Application[title]`.** The attribute is
   accepted and read, but only `material-app` uses it (toolbar title). The
   `application` schematic passes only the name and routing on.
3. **`data-service` checks no other attributes.** It does not call
   `assertAstAttributes`, because it is type-agnostic by design. The docs should
   say that it reads `[data]` only.
4. **Test IDs are duplicated.** `TC-APP-01`, `TC-APP-02`, and `TC-APP-03` exist
   in both `schematics.openui-app.spec.ts` and `schematics.material-app.spec.ts`
   (as do `TC-01` and `TC-02` in the `ng-add` and `pass-through` specs).
   Evidence links must name the spec file with the ID.

Decision needed before Phase 4: document findings 1 and 2 as known limitations,
or fix the code first (reject `Navigation` / `ToolBars` or compile them, and
check `Routing`). Fixing them is outside the scope of #106.

---

## 3. Target Document Structure

### 3.1 `docs/ngdj-openui-spec-mapping.md`

Every schematic and every 0.2.0 catalog scope appears in exactly one class:

| Section | Class                          | Content                                                                                                                                                                                                                                                                                                                                   |
| :------ | :----------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §0      | Classification legend          | Definitions of the classes below; links to the implementation plan and the migration plan; #27 ownership boundary.                                                                                                                                                                                                                        |
| §1      | **Direct (OpenUI in)**         | Ingestion utilities (`readOpenUiDocument()`, `ast-compiler.ts`) and each schematic that compiles OpenUI nodes: OpenUI node types, input contract, **supported subset**, and test IDs.                                                                                                                                                     |
| §2      | **Conceptual / CLI by design** | Schematics that correspond to OpenUI concepts but deliberately take CLI options (`material-setup`, `app-shell`), plus indirect primitives (for example the `complex-component` overlay vs. `widgets/dialog`).                                                                                                                             |
| §3      | **Planned**                    | Spec-first schematics not yet built (`table`, `dialog`, `stepper`, `tabs`, `accordion`, `bottom-sheet`, `menu`, `feedback`, `date-picker`, `data-grid`, `chart`), with their OpenUI scopes.                                                                                                                                               |
| §4      | **Tooling only**               | `ng-add`, `project-structure`, `openapi-setup`, `service`, `class` (and `workspace-setup` only if Phase 2 shows no OpenUI input).                                                                                                                                                                                                         |
| §5      | **Missing**                    | Every remaining 0.2.0 scope with no schematic, no primitive coverage, and no plan (for example `list`, `navigationWidgets`, `mediaWidgets`, `grid`, `splitters`, `choiceControls`, `pickerControl`, `displayPrimitives`, `statusIndicator`, `drawingAndCapture`, `linkAndScrollControls`, `native`, `behaviors/*`, cross-cutting scopes). |
| §6      | Naming conventions             | Rewritten from §2.1.                                                                                                                                                                                                                                                                                                                      |

### 3.2 `docs/openui-spec-implementation-plan.md`

- Status legend (Implemented = shipped with test evidence; Planned = otherwise).
- §1: target architecture (Option A) vs. the current boundary. Document input is
  per schematic; whole-application orchestration belongs to `djng` (#27); the
  master compiler is validation-only.
- §1.x: parser ownership and integration status with issue links (§2.3) and
  test evidence.
- §2: diagram with `@shlomoa/openui-spec` 0.2.0, labelled as the target pipeline.
- §3: scope matrix using canonical scope paths, every row marked Planned, and a
  note that Material-style schematic names are not OpenUI ids.
- §4: `table` facts corrected per §2.2.
- §5: roadmap. Completed items link to the migration plan and tests; planned
  items link to their issues. Do not repeat the migration plan's tables; link
  to them (single source of truth).

---

## 4. Enumerated Execution Plan

### Phase 1: Environment and Baseline

1. Merge (or branch from) the latest `main`. If `main` moved past `7e7047a`,
   re-run §2.5 and update it before continuing.
2. Tooling: Node ≥ 22.22.3 or 24.15 (the Angular CLI 22 minimum; older Node
   fails `ng lint` / `ng test`), npm 11+. A `node_modules` installed on Windows
   cannot run Vitest from Linux (missing rollup native binary); use a
   platform-native install.
3. Run `npm run format:check`, `npm run lint`, `npm run build`,
   `npm run test:ci`, `npm run pack:dry-run`, `npm run docs:build`. Record the
   results.

### Phase 2: Evidence Verification (gate)

1. For every row in §2.5, confirm from code (not from commit messages or plan
   checkboxes):
   - the OpenUI node types the schematic accepts and rejects;
   - the attributes it reads (the supported subset);
   - at least one named test that exercises `--document` for it.
2. Record the evidence table (schematic → node types → subset → test IDs) as
   the basis for mapping §1.
3. **Stop and report** any claim in the migration plan, CLI docs, or #127
   commit messages that the code or tests do not support. Do not document
   unsupported behavior as implemented.

### Phase 3: Refresh `docs/openui-spec-implementation-plan.md`

Apply §2.1, §2.2, §2.3, and §3.2.

### Phase 4: Refresh `docs/ngdj-openui-spec-mapping.md`

Apply §2.1, §2.4, §3.1, and the Phase 2 evidence table. Remove the old §1 table
rather than keeping it next to the new one.

### Phase 5: Cross-Document Validation

1. Relative links and heading anchors resolve (script in Appendix A).
2. Every backticked `<category>/<id>` is a real 0.2.0 scope, and every 0.2.0
   scope is classified in the mapping (script in Appendix A).
3. `rg` finds no obsolete name (§2.1) outside the naming-conventions
   "obsolete names" sentence, and no `@openui/spec`.
4. Terms, package name, version (0.2.0), status legend, and roadmap items match
   between the two documents.
5. `npm run format:check`, `npm run lint`, `npm run test:node`,
   `npm run docs:build` pass.

### Phase 6: Visual Demonstration

Both documents are in `mkdocs.yml` `exclude_docs` because their repo-relative
links (`../projects/…`, `../package.json`) break `mkdocs build --strict`. Keep
the exclusion. For the demo:

1. Build a preview site with a temporary config (not committed) that removes
   the two files from `exclude_docs` and adds an "OpenUI (preview)" nav
   section; use non-strict mode.
2. Screenshot the key sections: mapping §1, §2, and §5; plan §1 and §5.
3. Publish a before/after page (for each document: `main` version vs. refreshed
   version, key changes) together with the screenshots.

### Phase 7: Review, Commit, and PR

1. Show the diff and the demo to the maintainer; wait for approval.
2. Commit, push, and link the PR to #106. Close #125 as superseded, with the
   maintainer's confirmation.

---

## 5. Acceptance Criteria (from #106)

- [ ] Neither document describes planned behavior as implemented.
- [ ] Parser ingestion status distinguishes utility support from production
      schematic integration.
- [ ] Every active mapping has a supporting schematic contract and test
      evidence (Phase 2 table).
- [ ] OpenUI vocabulary matches exact canonical 0.2.0 names and casing.
- [ ] Ownership boundaries align with #27, and the validation-only compiler
      decision is respected.
- [ ] Documentation links are valid.
- [ ] `npm run format:check` passes.

---

## Appendix A: Validation Scripts

Run from the repository root after `npm ci`.

Links and anchors:

```python
import os, re

def slug(heading):
    heading = re.sub(r"[^\w\- ]", "", heading.strip().lower())
    return heading.replace(" ", "-")

docs = ["docs/openui-spec-implementation-plan.md", "docs/ngdj-openui-spec-mapping.md"]
for doc in docs:
    text = open(doc, encoding="utf-8").read()
    for url in re.findall(r"\]\(([^)\s]+)\)", text):
        if url.startswith("http"):
            continue
        path, _, anchor = url.partition("#")
        target = os.path.normpath(os.path.join(os.path.dirname(doc), path)) if path else doc
        if not os.path.exists(target):
            print("MISSING", doc, url)
        elif anchor:
            headings = re.findall(r"^#+ (.*)$", open(target, encoding="utf-8").read(), re.M)
            if anchor not in {slug(h) for h in headings}:
                print("BAD ANCHOR", doc, url)
```

Scope names and coverage:

```python
import json, re

catalog = json.load(open("node_modules/@shlomoa/openui-spec/spec/openui.json", encoding="utf-8"))
scopes = set()
for category in catalog["children"][0]["children"]:
    children = category.get("children", [])
    scopes |= {f"{category['id']}/{child['id']}" for child in children} or {category["id"]}

pattern = r"`((?:application|behaviors|containers|controls|pages|views|widgets)/[A-Za-z]+)`"
for doc in ["docs/openui-spec-implementation-plan.md", "docs/ngdj-openui-spec-mapping.md"]:
    for name in set(re.findall(pattern, open(doc, encoding="utf-8").read())):
        if name not in scopes:
            print("INVALID", doc, name)

mapping = open("docs/ngdj-openui-spec-mapping.md", encoding="utf-8").read()
for scope in sorted(scopes):
    if scope not in mapping and f"`{scope.split('/')[-1]}`" not in mapping:
        print("NOT CLASSIFIED", scope)
```
