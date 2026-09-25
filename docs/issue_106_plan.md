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

### 2.1 Canonical OpenUI 0.3.0 vocabulary

Source: `spec/openui.json` in `@shlomoa/openui-spec` 0.3.0 (the version pinned in
[`package.json`](../package.json) since #131). Scope paths are `<category>/<id>`.
Compared with 0.2.0, only `application` changed: 0.3.0 adds `route`, `navItem`,
`navGroup`, `toolBarRow`, and `toolAction`.

| Category          | Scope ids                                                                                                                                                                         |
| :---------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `application`     | `routing`, `route`, `navigation`, `navItem`, `navGroup`, `toolBars`, `toolBarRow`, `toolAction`, `favicon`, `indexHtml`                                                           |
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
- `accordion` does **not** appear anywhere in the 0.3.0 catalog. It is an
  Angular Material term; the OpenUI scope is `containers/expandablePanels`.
  (The migration plan calls it an "alias"; the docs must not present it as an
  OpenUI identifier.) The same applies to `bottom-sheet`, `menu`, `feedback`,
  and `date-picker` as proposed schematic names.
- Scope type and document type differ for some scopes. Documents use the
  instance type: `toolBars` → `ToolBar`, `favicon` → `link`, `indexHtml` →
  `html`, `dashboard` → `DashboardPage`.
- The package is `@shlomoa/openui-spec`. The placeholder `@openui/spec` in the
  implementation plan diagram is wrong.
- Singular ids are discrete concepts (`chart`, `table`, `dataGrid`, `list`,
  `stepper`, `dialog`, `form`, `report`, `pickerControl`, `rangeControl`,
  `statusIndicator`, `native`, `grid`, `dashboard`, `shellPage`, `emptyPage`,
  `route`, `navItem`, `navGroup`, `toolBarRow`, `toolAction`).
  Plural or grouped ids are families (`feedbackWidgets`, `mediaWidgets`,
  `navigationWidgets`, `menuWidgets`, `dateTimePickers`, `expandablePanels`,
  `tabs`, `surfaceContainers`, `sheetContainers`, `overlayContainers`,
  `structuralContainers`, `splitters`, `actionControls`, `textInputs`,
  `choiceControls`, `drawingAndCapture`, `displayPrimitives`,
  `linkAndScrollControls`, `toolBars`). The current "Naming Conventions"
  section of the mapping document lists pre-0.3.0 names and must be rewritten
  from this list.

### 2.2 `widgets/table` facts (OpenUI v0.3.0)

- Catalog: scope `id: table`, `type: Table`; instance element `type: table`
  with `tr` row children (`tableRow`).
- Normative attributes, from
  [`scopes/Widgets/table.scope.md`](https://github.com/shlomoa/openui-spec/blob/v0.3.0/spec/scopes/Widgets/table.scope.md):
  only `(sort)`, `(filter)`, `(paginate)`.
- `[data]`, `[selection]`, `[loading]`, `[error]`, `(selectionChange)`, and the
  column / pagination / empty-state children come from
  [`examples/Widgets/table.example.json`](https://github.com/shlomoa/openui-spec/blob/v0.3.0/spec/examples/Widgets/table.example.json).
  They are illustrative, not normative. The implementation plan §4 currently
  presents them as the scope contract and gives the identity as
  `type: table`; both must be corrected.
- `spec/scopes/Controls/` in v0.3.0 has no `Table` scope, which confirms that
  `Controls/Table/` was retired.

### 2.3 Issue status and ownership boundary

| Issue                                                                | State                                                                                    | Use in the docs                                                                                                                                                                                                                          |
| :------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#27](https://github.com/shlomoa/angular-django2/issues/27)          | Open                                                                                     | Cross-repository orchestration epic; ownership boundary (below).                                                                                                                                                                         |
| [#98](https://github.com/shlomoa/angular-django2/issues/98)          | Closed                                                                                   | Parser/validator integration epic.                                                                                                                                                                                                       |
| [#101](https://github.com/shlomoa/angular-django2/issues/101)        | Closed                                                                                   | Integration of the `@shlomoa/openui-spec` npm package.                                                                                                                                                                                   |
| [#103](https://github.com/shlomoa/angular-django2/issues/103)        | Closed                                                                                   | Schematics pipeline integration. Not "pending", as the old plan said.                                                                                                                                                                    |
| [#104](https://github.com/shlomoa/angular-django2/issues/104)        | Closed                                                                                   | openui-spec 0.2.0 integration.                                                                                                                                                                                                           |
| [#131](https://github.com/shlomoa/angular-django2/pull/131)          | Merged                                                                                   | openui-spec 0.3.0 integration (PR); current pinned version.                                                                                                                                                                              |
| [openui-spec#152](https://github.com/shlomoa/openui-spec/issues/152) | Closed (completed by [openui-spec#153](https://github.com/shlomoa/openui-spec/pull/153)) | Upstream contracts for `Route`, `NavItem`, `NavGroup`, `ToolBar`, `ToolBarRow`, `ToolAction`; element references; single owner for navigation data. Basis of openui-spec 0.3.0. The optional validator request (item 6) was not adopted. |

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
  pre-0.3.0.

`docs/openui-spec-implementation-plan.md`:

- Diagram cites `@openui/spec` (§2.1).
- §1.3 and the roadmap point to #98 as the pending integration; §5 mixes
  completed and planned items without evidence links.
- The §3 matrix uses obsolete scope names (`Widgets/data_grid`,
  `Containers/expandable_panels`, `Controls/date_time_pickers`,
  `Widgets/charts`, …).
- §4 table facts need the correction in §2.2.

### 2.5 Verified schematic evidence on `main` (Phase 2 result)

Re-verified on `55efb54` (#131, `@shlomoa/openui-spec` 0.3.0) from code
(`schematics/<name>/{index,ast}.ts`, `utility/ast-compiler.ts`,
`utility/openui.ts`), from the named tests, and from runtime probes against the
built schematics. The `application` and `material-app` rows and §2.6 finding 1
were re-verified on `93ee42a` after #132 (`ToolBar` compilation). The tests pass
`document` to the schematic or to its compiler.
Every node type below exists in the 0.3.0 catalog. Attributes outside the listed
subset are rejected (`assertAstAttributes`) unless §2.6 says otherwise. Test IDs
are under `projects/angular-django-validation/unit/schematics/`.

Compared with the first run on `7e7047a` (0.2.0), #131 changed only the
`application`, `material-app`, `workspace-setup`, and `page` rows. The other
schematics changed only their version strings, and their tests only the
document version.

Shared ingestion: `readOpenUiDocument()` (`utility/openui.ts`) parses and
validates the document with the canonical validator, which checks only that each
`type` is a known catalog type. `readAstNode()` / `resolveAstNode()`
(`utility/ast-compiler.ts`) resolve `--nodeId`, or the first node of the expected
type when `--nodeId` is omitted. With neither option given, they resolve the
root. They reject a missing node or a node of the wrong type.

| Schematic           | Accepts (catalog scope)                                                                                                                                                                                                    | Supported subset                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Rejects / conflicts                                                                                                                                                                                                                                                                                                                                                                                      | Tests                                                                                           |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| `reactive-form`     | `Form` (`views/form`); children: controls (below) plus at most one `ActionControls` (`controls/actionControls`) submit node                                                                                                | `Form`: `[title]`, `[action]`, `(submit)` (`<artifact>#<Symbol>.<method>`). `ActionControls`: `[label]`, no children. Controls: as `form-field`.                                                                                                                                                                                                                                                                                                                                                                                                            | Other child types; more than one submit; `--document` with `--definition`; `--nodeId` without `--document`. `--definition` is deprecated.                                                                                                                                                                                                                                                                | `schematics.reactive-form.spec.ts` `TC-REACTIVE-FORM-OPENUI-01…06`, `-DEPRECATION`, `-TUTORIAL` |
| `form-field`        | `TextInputs` (`controls/textInputs`), `RangeControl` (`controls/rangeControl`)                                                                                                                                             | `[type]` (`text`, `email`, `password`, `textarea` on `TextInputs`; `number` on `RangeControl`), `[name]`, `[label]`, `[value]`, `[hint]`, `[placeholder]`, `[autocomplete]`, `[required]`, `[email]`, `[minLength]`, `[maxLength]`, `[min]`, `[max]`, `[pattern]`, `[appearance]`, `[subscriptSizing]`                                                                                                                                                                                                                                                      | Other node types (for example `ChoiceControls`, `PickerControl`); a `[type]` that contradicts the node type; `--controlType`, `--appearance`, `--subscriptSizing` with `--document`.                                                                                                                                                                                                                     | `schematics.form-field.spec.ts` `TC-FORM-FIELD-OPENUI-01…03`                                    |
| `field-component`   | `TextInputs` only                                                                                                                                                                                                          | As `form-field`, `[type]` limited to `text`, `email`, `password`, `textarea`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `RangeControl` and other types; `--kind` with `--document`.                                                                                                                                                                                                                                                                                                                                              | `schematics.field-component.spec.ts` `TC-FIELD-OPENUI-01`                                       |
| `component`         | `SurfaceContainers` (`containers/surfaceContainers`); children: `SurfaceContainers`, `Form`, `TextInputs`, `RangeControl`, each compiled to its own component and embedded                                                 | `[title]`, `[slot]` (`header`, `content`, `actions`; default `content`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Other node or child types; unknown slots.                                                                                                                                                                                                                                                                                                                                                                | `schematics.composition.spec.ts` `TC-COMPOSE-01…04`, `TC-COMPOSE-09`                            |
| `complex-component` | `SurfaceContainers` with the children above, plus at most one `OverlayContainers` (`containers/overlayContainers`) child, compiled to the CDK overlay                                                                      | Container as `component`. `OverlayContainers`: `[label]`; its children may not set `[slot]`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                | More than one overlay; `--features` with `--document`; `--mode` other than `create`.                                                                                                                                                                                                                                                                                                                     | `schematics.composition.spec.ts` `TC-COMPOSE-05…08`                                             |
| `embed-component`   | No OpenUI input (CLI `--slot`). Its logic (`embed-component/compose.ts`) is the composition engine used by `component`, `complex-component`, and `page`.                                                                   | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | —                                                                                                                                                                                                                                                                                                                                                                                                        | `schematics.composition.spec.ts` `TC-COMPOSE-09…11`                                             |
| `page`              | `DashboardPage` (instance of `pages/dashboard`), `EmptyPage` (`pages/emptyPage`). `DashboardPage` children are composed as in `component`.                                                                                 | `[title]` (card title), `[route]` (registered route path), `[access]` (`public`, `protected`), `[authGuard]`, `[icon]` (validated only; see §2.6). None of these is a 0.3.0 catalog attribute: `dashboardInstance` and `emptyPageInstance` define none.                                                                                                                                                                                                                                                                                                     | Other types; children on `EmptyPage`; `--routePath`, `--navigationLabel`, and similar options with `--document`.                                                                                                                                                                                                                                                                                         | `schematics.openui-app.spec.ts` `TC-APP-03…05`                                                  |
| `application`       | `Application` (`application`); no attributes; allowed children `Routing`, `Navigation`, `ToolBar`, `Presentation`, `html`, `link`                                                                                          | Name from the node id; routing when a `Routing` child exists. `ToolBar[ariaLabel]` is validated with ordered `ToolBarRow` / `ToolAction` content.                                                                                                                                                                                                                                                                                                                                                                                                           | Any `Application` attribute; other child types; more than one `Routing`, `ToolBar`, or `Presentation`; invalid `ToolBar` attributes or descendants; `--routing` with `--document`.                                                                                                                                                                                                                       | `schematics.openui-app.spec.ts` `TC-APP-01`, `TC-APP-02`, `TC-APP-15`, `TC-APP-17`              |
| `material-app`      | As `application`. Also `Presentation` (`presentation`), `html` (`application/indexHtml`) for the toolbar title, `ToolBar` command rows, and `Routing` → `Route` plus `Navigation` → `NavItem` / `NavGroup` for the sidenav | `Presentation`: `[theme]`, `[typography]`, `[animations]`. `html[title]`: toolbar title. `ToolBar[ariaLabel]`; `ToolBarRow` → `ToolAction[label]`, `[icon]`, `[disabled]`, `(activate): null`, rendered as Material command rows after the title row; activation creates an explicit handler stub. `Routing[defaultRoute]`; `Route`: `[path]`, `[target]`, `[title]`, `[redirectTo]`, `[access]`; `Navigation[ariaLabel]`; `NavItem`: `[label]`, `[route]`, `[icon]`, `[disabled]`; `NavGroup`: `[label]`, `[expanded]`. References are quoted element ids. | `--theme`, `--typography`, `--animations`, `--routing` with `--document`; invalid toolbar content; `Navigation` without `Routing`; unresolved or unquoted references; `Route` with both or neither of `[target]` / `[redirectTo]`; non-`Route` children of `Routing`; non-`NavItem` / `NavGroup` children of `Navigation`; a `NavItem` without `[label]` / `[route]`; a linked `Route` without `[path]`. | `schematics.openui-app.spec.ts` `TC-APP-06`, `TC-APP-07`, `TC-APP-13…17`                        |
| `workspace-setup`   | First non-root `html` (`application/indexHtml`) and first `link` with `[rel]`=`icon` (`application/favicon`) anywhere in the document; no `--nodeId`                                                                       | `html`: `[lang]`, `[dir]` (`ltr`, `rtl`, `auto`), `[title]`. `link`: `[rel]`, `[href]` (workspace file; no `..`), `[type]`, `[sizes]`, `[media]`; only `[href]` is used.                                                                                                                                                                                                                                                                                                                                                                                    | `files.indexHtml` / `files.favicon` with `--document`; missing icon file or `index.html`.                                                                                                                                                                                                                                                                                                                | `schematics.openui-app.spec.ts` `TC-APP-08…10`                                                  |
| `data-service`      | Any node type carrying `[data]` (by `--nodeId`, else the first such node)                                                                                                                                                  | `[data]` = `<apiPath>#<ApiService>` (a repository convention, not an OpenUI-normative format). Other attributes are not read or checked.                                                                                                                                                                                                                                                                                                                                                                                                                    | Missing or malformed `[data]`; `--apiService`, `--apiPath` with `--document`.                                                                                                                                                                                                                                                                                                                            | `schematics.openui-app.spec.ts` `TC-APP-11`, `TC-APP-12`                                        |
| `material-setup`    | No OpenUI input; CLI-driven by design (#127, `f833a81`). `material-app --document` passes `Presentation` tokens to it.                                                                                                     | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | —                                                                                                                                                                                                                                                                                                                                                                                                        | —                                                                                               |
| `app-shell`         | No OpenUI input; pass-through to Angular's SSR app-shell (#127, `f833a81`). OpenUI `ShellPage` maps to the `material-app` layout (`a11e9f3`).                                                                              | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | —                                                                                                                                                                                                                                                                                                                                                                                                        | —                                                                                               |
| Master compiler     | Validation-only, not shipped: `unit/integration/openui-application-compiler.ts`                                                                                                                                            | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | —                                                                                                                                                                                                                                                                                                                                                                                                        | `unit/integration/openui-application.integration.spec.ts`                                       |

Phase 1 baseline on `main` at `93ee42a` (after #128 and #132), Linux, Node
24.15.0, npm 11.12.1, platform-native `npm ci`: `format:check`, `lint`, `build`
✅; `test:ci` ✅ (node: 24 files / 247 tests; reference app: 9 files / 50
tests); `pack:dry-run` ✅; `docs:build` ✅ (mkdocs 1.6.1, `--strict`). Earlier
runs: 243 node tests on `7e7047a`, 244 on `55efb54`.

### 2.6 Phase 2 findings: claims the code does not fully support

Each finding was confirmed with a runtime probe against the built
`application/ast.js` on `b1d277b`, unless it says otherwise.

1. **Resolved by #129: `ToolBar` compilation.** `applicationFromAst()` now
   validates `ToolBar[ariaLabel]`, its `ToolBarRow` children, and each
   `ToolAction[label]`, `[icon]`, `[disabled]`, and `(activate): null` marker.
   `material-app` renders the rows after the `html[title]` row and adds explicit
   activation handler stubs. `TC-APP-15…17` cover the accepted output and shared
   validation errors.
2. **`application --document` does not validate `Navigation` / `Routing`
   content.** Only `material-app` calls `navigationLinksFromAst()`. A `NavItem`
   without `[label]` passes `application` and is rejected by `material-app`.
3. **Several accepted attributes are validated but not used.** Contrary to the
   rule that nothing is dropped silently, these are accepted and then ignored:
   - `Route[title]` and `Route[access]` are not used.
   - `Routing[defaultRoute]` is checked to name an existing `Route`, but then
     not used.
   - `Route[redirectTo]` is checked as a reference, but nothing uses it. A
     `NavItem` that points at a redirect route is rejected for missing
     `[path]`.
   - `Navigation[ariaLabel]` is not emitted. The generated layout has no
     `aria-label`, which the 0.3.0 navigation accessibility section asks for.
   - `NavGroup[label]` is required, but the group is flattened: its label is
     not rendered and `NavGroup[expanded]` is ignored.
   - `page`'s `[icon]` is validated, but since #131 nothing uses it. It
     previously fed the sidenav.
4. **Nested `Route` paths are not composed.** 0.3.0 defines `Route[path]` as
   "matched relative to the parent route". A `NavItem` that references child
   route `users` under parent `admin` links to `/users`, not `/admin/users`. No
   test covers nested routes.
5. **`Route[target]` type is not checked.** 0.3.0 defines it as a reference to
   "the page or content element". The code only checks that the id exists, so a
   target that is a `Presentation` node is accepted.
6. **Route paths have two unsynchronised sources.** `page` registers
   `DashboardPage[route]`; `material-app` links to `Route[path]`. Nothing
   checks that a `Route` targeting a page uses that page's `[route]`. A
   mismatch produces a sidenav link to a path no page registers. Also,
   `DashboardPage[route]`, `[title]`, `[icon]`, `[access]`, and `[authGuard]`
   are not 0.3.0 catalog attributes, while `Route[access]` and `Route[title]`
   are, and are unused (item 3).
7. **Dead code.** `pageNavigationLinks()` (`page/ast.ts`) is no longer called
   by any schematic or test; #131 replaced it with `navigationLinksFromAst()`.
   (Checked by search; no probe needed.)
8. **Test IDs are still duplicated.** `TC-APP-01`, `TC-APP-02`, and
   `TC-APP-03` exist in both `schematics.openui-app.spec.ts` and
   `schematics.material-app.spec.ts` (as do `TC-01` and `TC-02` in the `ng-add`
   and `pass-through` specs). Evidence links must name the spec file with the
   ID. (Checked by search.)
9. **Links to the deleted migration plan.** #131 deleted
   `docs/migrate_schematics_to_openui_plan.md`, but links to it remain in
   `utility/ast-compiler.ts`, `mkdocs.yml`,
   `claude/migrate-schematics-to-openui-progress.md`,
   `docs/openui-spec-implementation-plan.md`, and
   `docs/ngdj-openui-spec-mapping.md`. Phases 3–4 fix the last two; the others
   are outside #106. (Checked by search.)

10. **Most attributes the schematics read are not OpenUI 0.3.0 attributes**
    (found in Phase 3). The implementation plan's "spec-defined identifiers
    only" directive is therefore only partly met. Types and application-scope
    attributes (`Routing`, `Route`, `Navigation`, `NavItem`, `NavGroup`,
    `ToolBar`, `ToolAction`, `html`, `link`) are catalog-defined. The
    attributes read on `Form` (except `(submit)`), `ActionControls`,
    `TextInputs`, `RangeControl`, `SurfaceContainers`, `OverlayContainers`,
    `DashboardPage`, `EmptyPage`, and `Presentation`, plus `[slot]` and
    `[data]`, are repository-local extensions: the 0.3.0 catalog defines no
    attributes for those instance types. Checked by comparing each compiler's
    attribute list with the catalog instance attributes. Phase 3 records this
    as the current status of the directive; Phase 4 must not present these
    attributes as OpenUI-defined.
11. **The table example's child types differ from §2.2's wording** (found in
    Phase 3). In `table.example.json` at `v0.3.0`, column nodes are typed
    `Table`, pagination `NavigationWidgets`, and the empty state
    `FeedbackWidgets`. `Column`, `Pagination`, and `EmptyState` are not catalog
    types, and the scope's own child model is `tr`. Reported upstream as
    [openui-spec#154](https://github.com/shlomoa/openui-spec/issues/154).

Resolved since the first run on `7e7047a`: `Navigation` and `Routing` content is
now compiled and validated by `material-app`, and `application` ignoring
`Application[title]` is moot because the attribute was removed. The
`data-service` behaviour (reads only `[data]`) is unchanged and is by design.

Maintainer decision (first run): the `Navigation` / `ToolBars` gap is fixed
outside #106 by **compiling** the content, tracked in
[#129](https://github.com/shlomoa/angular-django2/issues/129) with its own PR.
After #131, #129's scope was finding 1. #129 was closed as completed by #132
(merged into `main` at `93ee42a`); finding 1 was re-verified there, so Phase 4
is no longer blocked.

Maintainer decision (re-run): findings 2–6 are **documented as known
limitations** in the #106 documents, not fixed and not tracked in an issue.
They do not block any phase. Phases 3 and 4 must state each one where the
affected behavior is described (§3.1 §1, §3.2 §1.x), with the §2.6 item it
comes from, so no document presents these attributes as compiled.

---

## 3. Target Document Structure

### 3.1 `docs/ngdj-openui-spec-mapping.md`

Every schematic and every 0.3.0 catalog scope appears in exactly one class:

| Section | Class                          | Content                                                                                                                                                                                                                                                                                                                                   |
| :------ | :----------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §0      | Classification legend          | Definitions of the classes below; links to the implementation plan and the migration plan; #27 ownership boundary.                                                                                                                                                                                                                        |
| §1      | **Direct (OpenUI in)**         | Ingestion utilities (`readOpenUiDocument()`, `ast-compiler.ts`) and each schematic that compiles OpenUI nodes: OpenUI node types, input contract, **supported subset**, test IDs, and **known limitations** (§2.6 findings 2–6).                                                                                                          |
| §2      | **Conceptual / CLI by design** | Schematics that correspond to OpenUI concepts but deliberately take CLI options (`material-setup`, `app-shell`), plus indirect primitives (for example the `complex-component` overlay vs. `widgets/dialog`).                                                                                                                             |
| §3      | **Planned**                    | Spec-first schematics not yet built (`table`, `dialog`, `stepper`, `tabs`, `accordion`, `bottom-sheet`, `menu`, `feedback`, `date-picker`, `data-grid`, `chart`), with their OpenUI scopes.                                                                                                                                               |
| §4      | **Tooling only**               | `ng-add`, `project-structure`, `openapi-setup`, `service`, `class` (and `workspace-setup` only if Phase 2 shows no OpenUI input).                                                                                                                                                                                                         |
| §5      | **Missing**                    | Every remaining 0.3.0 scope with no schematic, no primitive coverage, and no plan (for example `list`, `navigationWidgets`, `mediaWidgets`, `grid`, `splitters`, `choiceControls`, `pickerControl`, `displayPrimitives`, `statusIndicator`, `drawingAndCapture`, `linkAndScrollControls`, `native`, `behaviors/*`, cross-cutting scopes). |
| §6      | Naming conventions             | Rewritten from §2.1.                                                                                                                                                                                                                                                                                                                      |

### 3.2 `docs/openui-spec-implementation-plan.md`

- Status legend (Implemented = shipped with test evidence; Planned = otherwise).
- §1: target architecture (Option A) vs. the current boundary. Document input is
  per schematic; whole-application orchestration belongs to `djng` (#27); the
  master compiler is validation-only.
- §1.x: parser ownership and integration status with issue links (§2.3) and
  test evidence.
- §2: diagram with `@shlomoa/openui-spec` 0.3.0, labelled as the target pipeline.
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

Apply §2.1, §2.2, §2.3, and §3.2. Where the plan describes current application
compilation, list §2.6 findings 2–6 as known limitations.

### Phase 4: Refresh `docs/ngdj-openui-spec-mapping.md`

**Unblocked.** [#129](https://github.com/shlomoa/angular-django2/issues/129)
was closed as completed by
[#132](https://github.com/shlomoa/angular-django2/pull/132), merged into `main`
at `93ee42a`. The `application` and `material-app` rows of §2.5 and finding 1 of
§2.6 were re-verified there. #132 also edited `docs/ngdj-openui-spec-mapping.md`
(`ToolBar` moved from Planned to Subset); start from that version.

Apply §2.1, §2.4, §3.1, and the Phase 2 evidence table. Remove the old §1 table
rather than keeping it next to the new one. List §2.6 findings 2–6 as known
limitations of the affected schematics (`application`, `material-app`, `page`).

### Phase 5: Cross-Document Validation

1. Relative links and heading anchors resolve (script in Appendix A).
2. Every backticked `<category>/<id>` is a real 0.3.0 scope, and every 0.3.0
   scope is classified in the mapping (script in Appendix A).
3. `rg` finds no obsolete name (§2.1) outside the naming-conventions
   "obsolete names" sentence, and no `@openui/spec`.
4. Terms, package name, version (0.3.0), status legend, and roadmap items match
   between the two documents.
5. `npm run format:check`, `npm run lint`, `npm run test:node`,
   `npm run docs:build` pass.

Result (branch `shlomoa/issue_106_restart` at `6247295`, on `main` `93ee42a`):
all five checks pass. Scripts 1–2 report no missing links, bad anchors,
invalid scope names, or unclassified scopes (51 of 51 classified). Check 3
finds obsolete names only in the mapping document's "obsolete names" sentence.
Check 4: the Planned scopes, proposed schematic names, and roadmap items (11
each), the known limitations, and the list of repository-local attributes agree
between the two documents; both cite `@shlomoa/openui-spec` 0.3.0 and #27.
Check 5: `format:check`, `lint`, `test:node` (247 tests), and `docs:build`
pass.

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

Result: preview sites were built from `main` (`93ee42a`, "before") and from
this branch ("after") with a temporary, uncommitted `mkdocs.yml` that removes
both documents from `exclude_docs` and adds an "OpenUI (preview)" nav section
(non-strict). Screenshots cover mapping §0, §1, §2, and §5, plan §1 and §5, and
the matching "before" sections. They are published with the key changes and
the Phase 5 results on a private before/after page (link in PR #133 and the
issue #106 thread, once shared by the maintainer).

### Phase 7: Review, Commit, and PR

1. Show the diff and the demo to the maintainer; wait for approval.
2. Commit, push, and link the PR to #106. Close #125 as superseded, with the
   maintainer's confirmation.

Result: the maintainer approved the diff and the before/after page. The work is
committed and pushed in [#133](https://github.com/shlomoa/angular-django2/pull/133)
(Refs #106), and [#125](https://github.com/shlomoa/angular-django2/pull/125) is
closed as superseded, with the maintainer's confirmation. Still open for the
maintainer: whether to keep the "spec-defined identifiers only" directive
(§2.6 finding 10).

---

## 5. Acceptance Criteria (from #106)

- [x] Neither document describes planned behavior as implemented.
- [x] §2.6 findings 2–6 are listed as known limitations (maintainer decision).
- [x] Parser ingestion status distinguishes utility support from production
      schematic integration.
- [x] Every active mapping has a supporting schematic contract and test
      evidence (Phase 2 table).
- [x] OpenUI vocabulary matches exact canonical 0.3.0 names and casing.
- [x] Ownership boundaries align with #27, and the validation-only compiler
      decision is respected.
- [x] Documentation links are valid.
- [x] `npm run format:check` passes.

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
