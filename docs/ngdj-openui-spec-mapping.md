# Mapping between `openui-spec` and `angular-django2`

This document maps every `angular-django2` schematic and every OpenUI 0.12.0
scope (`@shlomoa/openui-spec`, pinned in [`package.json`](../package.json)) to
exactly one class. For the architecture and roadmap, see the
[OpenUI Specification Implementation Plan](openui-spec-implementation-plan.md).

## 0. Classification

| Class                          | Meaning                                                                                                                 |
| :----------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| **Direct (OpenUI in)**         | The schematic compiles OpenUI nodes from `--document`. Implemented, with named tests. §1 lists the supported subset.    |
| **Conceptual / CLI by design** | The schematic corresponds to an OpenUI concept but takes CLI options, or the concept is realized indirectly.            |
| **Planned**                    | A spec-first schematic that is not built yet. Documents containing the scope cannot be compiled.                        |
| **Tooling only**               | Angular CLI or project tooling with no OpenUI counterpart.                                                              |
| **Missing**                    | An OpenUI scope with no schematic of its own. §5 says whether it is tracked by an issue, not planned, or cross-cutting. |

Scope paths are canonical OpenUI 0.12.0 `<category>/<id>` paths. Test IDs refer to
specs in `projects/angular-django-validation/unit/schematics/`. Some IDs are
reused across spec files (for example `TC-APP-01…03` also exist in
`schematics.material-app.spec.ts`), so every test reference names its spec file.

Attribute notation (OpenUI 0.12.0, spec 4.5 and 4.6): keys are categorized,
`uses.x` for inputs, `produces.x` for events and `behaves.x` for behaviors.
An attribute value is a string, `null` or a list of those. A string literal is
quoted inside the string (`"\"Users\""`); a boolean or number is an unquoted
string (`"true"`, `"25"`); any other unquoted string is a binding or expression.
The spec also allows a plain `<name>` key with no category; the schematics
accept only the categorized keys they list, and reject a plain key as
unsupported. Element references are quoted element ids. In the tables below, an attribute
marked **†** is an `angular-django2` extension: the catalog does not declare it
for that type (§1.3); every other attribute is declared by the catalog.

Ownership boundary
([#27](https://github.com/shlomoa/angular-django2/issues/27)):

- `openui-spec` owns the canonical schemas, vocabulary, and parser/validator.
- `angular-django2` owns its public schematic contracts and generated output.
- `django-angular3` (`djng`) owns Django-side artifact selection, the
  OpenUI-to-schematic mapping for whole applications, and orchestration. No
  `angular-django2` schematic compiles a whole document.

The decisions behind the per-schematic conversions are recorded in the
migration plan, which was removed from `main` in
[#131](https://github.com/shlomoa/angular-django2/pull/131); its last version is
[`migrate_schematics_to_openui_plan.md` at `7e7047a`](https://github.com/shlomoa/angular-django2/blob/7e7047a/docs/migrate_schematics_to_openui_plan.md).

---

## 1. Direct (OpenUI in)

### 1.1 Ingestion utilities

| Utility                                                | Role                                                                                                                                                                                                                                                                  | Tests                                         |
| :----------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------- |
| `readOpenUiDocument()`, `validateOpenUiDocument()`     | `schematics/utility/openui.ts`: load a document and validate it with the canonical `openui-spec` validator (grammar, unique ids, known types, declared value types, references).                                                                                      | `schematics.openui.spec.ts` `TC-OPENUI-01…04` |
| `readAstNode()`, `resolveAstNode()`, attribute readers | `schematics/utility/ast-compiler.ts`: resolve `--nodeId` (or the first node of the expected type), reject unknown attributes, and read quoted string literals, expressions, and the unquoted strings `"true"` / `"false"` (boolean) and JSON-number strings (number). | `ast-compiler.spec.ts`                        |

The canonical validator checks the grammar (the key is `uses.x`, `produces.x`,
`behaves.x` or a plain `x`; the value is a string, `null` or a
list of these), unique ids, that each `type` is a known catalog type, the value type of every
declared attribute, and that references name an element of the right type. It
accepts any key a type does not declare, categorized or plain, without checking
its value (an extension), and an unquoted string for any value type (it is an expression). It
rejects a quoted literal on a Produces or Behaves attribute (`contract/wrong-value-type`).
Extension attributes, unsupported attributes, and child checks are done by each
schematic, as listed below.

### 1.2 Schematics

| Schematic           | OpenUI scope → node types                                                                                                                                                                                                                          | Supported subset                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Tests                                                                                           |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| `reactive-form`     | `views/form` → `Form`; children from `controls/textInputs` → `TextInputs`, `controls/rangeControl` → `RangeControl`, and at most one `controls/actionControls` → `ActionControls` submit                                                           | `Form`: `uses.title`†, `uses.action`†, `behaves.submit` (an expression, `<artifact>#<Symbol>.<method>`). `ActionControls`: `uses.label`, no children. Controls: as `form-field`. Other child types are rejected. `--definition` is deprecated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `schematics.reactive-form.spec.ts` `TC-REACTIVE-FORM-OPENUI-01…06`, `-DEPRECATION`, `-TUTORIAL` |
| `form-field`        | `controls/textInputs` → `TextInputs`; `controls/rangeControl` → `RangeControl`                                                                                                                                                                     | `TextInputs`: `uses.type` (`text`, `email`, `password`), `uses.multiline` (`"true"` is a textarea), `uses.label`, `uses.value`, `uses.placeholder`, `uses.required`, `uses.maxLength` (integer), and the extensions `uses.name`†, `uses.hint`†, `uses.autocomplete`†, `uses.email`†, `uses.minLength`†, `uses.min`†, `uses.max`†, `uses.pattern`†, `uses.appearance`†, `uses.subscriptSizing`†. `RangeControl`: `uses.label`, `uses.value`, `uses.min`, `uses.max` (numbers), `uses.type`† (`number`), and the same extensions. Other control types, and the `TextInputs` types `search`, `tel` and `url`, are rejected.                                                                                                       | `schematics.form-field.spec.ts` `TC-FORM-FIELD-OPENUI-01…06`                                    |
| `field-component`   | `controls/textInputs` → `TextInputs` only                                                                                                                                                                                                          | As `form-field` for `TextInputs`: `uses.type` limited to `text`, `email`, `password`, or `uses.multiline` `"true"` for a textarea.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `schematics.field-component.spec.ts` `TC-FIELD-OPENUI-01`                                       |
| `component`         | `containers/surfaceContainers` → `SurfaceContainers`; children `SurfaceContainers`, `Form`, `TextInputs`, `RangeControl`, each compiled to its own component and embedded                                                                          | `uses.title`; children choose a section with `uses.slot`† (`header`, `content`, `actions`; default `content`). Other child types and slots are rejected. A child's `uses.` attributes that name a child input are bound: a quoted literal as a string literal, an unquoted string as the Angular expression itself (`"true"` binds `true`), `null` not at all, a list is rejected.                                                                                                                                                                                                                                                                                                                                             | `schematics.composition.spec.ts` `TC-COMPOSE-01…04`, `TC-COMPOSE-09`                            |
| `complex-component` | As `component`, plus at most one `containers/overlayContainers` → `OverlayContainers` child, compiled to a CDK overlay                                                                                                                             | Container as `component`. `OverlayContainers`: `uses.label`†; its children may not set `uses.slot`. Only `--mode=create`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `schematics.composition.spec.ts` `TC-COMPOSE-05…08`                                             |
| `page`              | `pages/dashboard` → `DashboardPage`; `pages/emptyPage` → `EmptyPage`. `DashboardPage` children are composed as in `component`.                                                                                                                     | `uses.title`† (card title), `uses.route`† (registered lazy route), `uses.access`† (`public`, `protected`), `uses.authGuard`†, `uses.icon`† (validated only). `EmptyPage` rejects children.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `schematics.openui-app.spec.ts` `TC-APP-03…05`                                                  |
| `application`       | `Application` with children from `application/routing` → `Routing`, `application/navigation` → `Navigation`, `application/toolBars` → `ToolBar`, `presentation` → `Presentation`, `application/indexHtml` → `html`, `application/favicon` → `link` | Name from the node id; routing when a `Routing` child exists. `ToolBar` content is validated as in `material-app`. No `Application` attributes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `schematics.openui-app.spec.ts` `TC-APP-01`, `TC-APP-02`, `TC-APP-17`                           |
| `material-app`      | As `application`, plus `application/route` → `Route`, `application/navItem` → `NavItem`, `application/navGroup` → `NavGroup`, `application/toolBarRow` → `ToolBarRow`, `application/toolAction` → `ToolAction`                                     | `Presentation`: `uses.theme`†, `uses.typography`† and `uses.animations`† (`"true"` / `"false"`). `html` `uses.title`: toolbar title. Sidenav: `Navigation` `uses.ariaLabel` → `NavItem` (`uses.label`, `uses.route`, `uses.icon`, `uses.disabled`) / `NavGroup` (`uses.label`, `uses.expanded`) → referenced `Route` (`uses.path`, `uses.target`, `uses.title`, `uses.redirectTo`, `uses.access`), under `Routing` `uses.defaultRoute`. References are quoted element ids. Toolbar: `ToolBar` `uses.ariaLabel` → `ToolBarRow` → `ToolAction` (`uses.label`, `uses.icon`, `uses.disabled`, `produces.activate` as a `null` marker that generates an `on<ActionId>Activate($event)` stub), rendered as rows after the title row. | `schematics.openui-app.spec.ts` `TC-APP-06`, `TC-APP-07`, `TC-APP-13…17`                        |
| `workspace-setup`   | `application/indexHtml` → first non-root `html`; `application/favicon` → first `link` with `uses.rel` `"\"icon\""`. No `--nodeId`.                                                                                                                 | `html`: `uses.lang`, `uses.dir` (`ltr`, `rtl`, `auto`), `uses.title`. `link`: `uses.rel`, `uses.href` (workspace icon file), `uses.type`, `uses.sizes`, `uses.media`; only `uses.href` is used.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `schematics.openui-app.spec.ts` `TC-APP-08…10`                                                  |
| `data-service`      | Any node carrying `uses.data`†                                                                                                                                                                                                                     | `uses.data`† = `<apiPath>#<ApiService>`, an expression (unquoted). No other attribute is read or checked.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `schematics.openui-app.spec.ts` `TC-APP-11`, `TC-APP-12`                                        |
| `table`             | `widgets/table` → `table`; children `caption` (0..1), `thead` (0..1) and `tr` (0..n)                                                                                                                                                               | `table`: `behaves.sort`, `behaves.filter`, `behaves.paginate` (each an unquoted host handler call such as `sortOrders($event)`, or `null`), all declared by the catalog; no extension attribute. The host supplies the column definitions and the rows (the document has no column attribute and `th` and `td` are not catalog types), and handles the three operations through the `sorted`, `filtered` and `paginated` outputs. `caption`, `thead` and `tr` accept no attribute and no child; `behaves.sort` needs a `thead`. Any other attribute or child is rejected.                                                                                                                                                      | `schematics.table.spec.ts` `TC-TABLE-01…18`                                                     |

With `--document`, the schematics above reject command-line options that the
document describes (for example `--routing`, `--theme`, `--controlType`,
`--apiService`); see each schematic's CLI documentation. Where `--nodeId`
exists, it requires `--document`.

### 1.3 Attributes outside the OpenUI 0.12.0 contract

The object types above are all OpenUI 0.12.0 catalog types. The catalog
declares these attributes for the types the schematics compile:

- `html`: `uses.lang`, `uses.dir`, `uses.title`. `link`: `uses.rel`, `uses.type`,
  `uses.sizes`, `uses.media`, `uses.href`.
- `Routing`: `uses.defaultRoute`. `Route`: `uses.path`, `uses.title`,
  `uses.access`, `uses.target`, `uses.redirectTo`. `Navigation`, `ToolBar`:
  `uses.ariaLabel`. `NavItem`: `uses.label`, `uses.icon`, `uses.route`,
  `uses.disabled`. `NavGroup`: `uses.label`, `uses.expanded`. `ToolAction`:
  `uses.label`, `uses.icon`, `uses.disabled`, `produces.activate`.
- `SurfaceContainers`: `uses.title`, `uses.checkable`, `uses.checked`.
  `OverlayContainers`: `uses.open`, `uses.anchor`, `uses.placement`,
  `produces.close`.
- `Form`: `behaves.validate`, `behaves.submit`, `produces.dirtyChange`.
  `ActionControls`: `uses.label`, `uses.icon`, `uses.disabled`, `uses.pressed`,
  `uses.autoRepeat`, `produces.activate`.
- `TextInputs`: `uses.label`, `uses.value`, `uses.placeholder`, `uses.type`
  (`text`, `password`, `search`, `email`, `tel`, `url`), `uses.multiline`,
  `uses.readOnly`, `uses.required`, `uses.disabled`, `uses.maxLength`,
  `produces.valueChange`. `RangeControl`: `uses.label`, `uses.value`, `uses.min`,
  `uses.max`, `uses.step`, `uses.start`, `uses.end`, `uses.wrapping`,
  `uses.disabled`, `uses.orientation`, `produces.valueChange`.

The catalog declares **no attributes** for `DashboardPage`, `EmptyPage`, or
`Presentation`. The attributes marked **†** above, which these schematics read
on the types listed, are **`angular-django2` extensions**, not OpenUI-defined
attributes: `Presentation` `uses.theme`, `uses.typography`, `uses.animations`;
page `uses.title`, `uses.route`, `uses.icon`, `uses.access`, `uses.authGuard`;
`SurfaceContainers` `uses.slot`, `uses.data`; `OverlayContainers` `uses.label`;
`Form` `uses.title`, `uses.action`; `TextInputs` `uses.name`, `uses.hint`,
`uses.autocomplete`, `uses.email`, `uses.minLength`, `uses.min`, `uses.max`,
`uses.pattern`, `uses.appearance`, `uses.subscriptSizing`; `RangeControl`
`uses.type` and the same control extensions. The validator accepts such a key
whether it is categorized (`uses.x`) or plain (`x`, spec 4.5), and does not
check its value, so the extensions are allowed by implication, not by an
explicit spec rule. The schematics accept only the categorized keys they list;
a plain key is rejected as unsupported.

Declared but not compiled: the schematics reject `Form` `behaves.validate`,
`produces.dirtyChange`, and the other declared attributes they do not list
above as unsupported.

### 1.4 Known limitations

These are current behavior, documented by maintainer decision:

- `application --document` does not validate `Navigation` or `Routing` content
  beyond what the validator checks (its reference types); only `material-app`
  does.
- Accepted but unused: `Route` `uses.title` and `uses.access`, `Routing`
  `uses.defaultRoute` and `Route` `uses.redirectTo` (checked only as references),
  `Navigation` `uses.ariaLabel` (not emitted on the sidenav), and `NavGroup`
  `uses.expanded`. `NavGroup` entries are flattened, and its `uses.label` is not
  rendered. `page`'s `uses.icon` is validated but not used.
- Nested `Route` paths are not composed: a link to a child route uses the
  child's `uses.path` alone, although OpenUI defines it as relative to the
  parent route.
- `Route` `uses.target` is typed only as a `reference`: the validator and the
  schematic check that it names an element, not that it is a page or content
  element.
- Route paths have two unsynchronized sources: `page` registers
  `DashboardPage` `uses.route`, and `material-app` links to `Route` `uses.path`. Nothing
  checks that they match.

---

## 2. Conceptual / CLI by design

| OpenUI scope                | `angular-django2`   | Relationship                                                                                                                                                                                                                                                                           |
| :-------------------------- | :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/shellPage`           | `material-app`      | `material-app`'s layout (toolbar, sidenav, router outlet) is the shell page. It is built from the `Application` node and its children; no `ShellPage` node is read.                                                                                                                    |
| — (`presentation` tokens)   | `material-setup`    | CLI-driven by design. Its options are exactly the `Presentation` tokens, which `material-app --document` reads and passes on (§1.2).                                                                                                                                                   |
| —                           | `app-shell`         | CLI-driven by design: a pass-through to Angular's SSR / prerender app-shell schematic, with no OpenUI counterpart.                                                                                                                                                                     |
| — (`uses.slot` composition) | `embed-component`   | No OpenUI input (CLI `--slot`). Its logic is the composition engine that `component`, `complex-component`, and `page` use to embed compiled children by `uses.slot`. `uses.slot` is an `angular-django2` extension (§1.3). Tests: `schematics.composition.spec.ts` `TC-COMPOSE-09…15`. |
| `widgets/dialog` (indirect) | `complex-component` | An `OverlayContainers` child gives a CDK overlay with projected content (§1.2). This is not a `widgets/dialog` implementation: no `Dialog` node is read and there is no `MatDialog` lifecycle. `widgets/dialog` itself is Planned (§3).                                                |

`pages/shellPage` is classified here. `presentation` is Direct through
`material-app` (§1.2), and `widgets/dialog` is Planned (§3).

---

## 3. Planned

Spec-first schematics that are not built yet. The schematic names are proposed
Angular / Material names, not OpenUI identifiers. Details:
[implementation plan](openui-spec-implementation-plan.md) §3–§5. Each has a
tracking issue.

| OpenUI scope                  | Proposed schematic | Issue                                                         |
| :---------------------------- | :----------------- | :------------------------------------------------------------ |
| `widgets/dataGrid`            | `data-grid`        | [#143](https://github.com/shlomoa/angular-django2/issues/143) |
| `widgets/dialog`              | `dialog`           | [#144](https://github.com/shlomoa/angular-django2/issues/144) |
| `widgets/stepper`             | `stepper`          | [#145](https://github.com/shlomoa/angular-django2/issues/145) |
| `containers/tabs`             | `tabs`             | [#146](https://github.com/shlomoa/angular-django2/issues/146) |
| `containers/expandablePanels` | `accordion`        | [#147](https://github.com/shlomoa/angular-django2/issues/147) |
| `containers/sheetContainers`  | `bottom-sheet`     | [#148](https://github.com/shlomoa/angular-django2/issues/148) |
| `widgets/menuWidgets`         | `menu`             | [#149](https://github.com/shlomoa/angular-django2/issues/149) |
| `widgets/feedbackWidgets`     | `feedback`         | [#150](https://github.com/shlomoa/angular-django2/issues/150) |
| `widgets/dateTimePickers`     | `date-picker`      | [#151](https://github.com/shlomoa/angular-django2/issues/151) |
| `widgets/chart`               | `chart`            | [#152](https://github.com/shlomoa/angular-django2/issues/152) |

---

## 4. Tooling only

| `angular-django2`   | Role                                                                                        |
| :------------------ | :------------------------------------------------------------------------------------------ |
| `ng-add`            | Register `angular-django2` as a schematic collection in `angular.json`.                     |
| `project-structure` | Create the standard directory structure with barrel exports (`core`, `shared`, `features`). |
| `openapi-setup`     | Bootstrap `ng-openapi-gen` and Django auth / CSRF transport helpers.                        |
| `service`           | Generate an injectable service.                                                             |
| `class`             | Generate a TypeScript class.                                                                |

`workspace-setup` also initializes workspace files from CLI options, but it is
classified as Direct because it compiles `html` and `link` nodes (§1.2).

---

## 5. Missing

OpenUI 0.12.0 scopes with no schematic of their own. The status says whether the
scope is tracked by an issue, not planned (and why), or a cross-cutting
vocabulary. Priorities: P1 builds first, P2 next. The triage is recorded in
[#108](https://github.com/shlomoa/angular-django2/issues/108).

| OpenUI scope                                    | Status        | Notes                                                                                                                                                                                                    |
| :---------------------------------------------- | :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `views/report`                                  | Tracked       | [#160](https://github.com/shlomoa/angular-django2/issues/160) (P1, after `widgets/table` and `widgets/list`). `data-service` generates data transport from a `uses.data` binding only; it renders no UI. |
| `widgets/list`                                  | Tracked       | [#159](https://github.com/shlomoa/angular-django2/issues/159) (P1).                                                                                                                                      |
| `widgets/navigationWidgets`                     | Tracked       | [#165](https://github.com/shlomoa/angular-django2/issues/165) (P2, breadcrumbs and pagination only). The `material-app` sidenav comes from `application/navigation` (§1.2), not from this scope.         |
| `widgets/mediaWidgets`                          | Not planned   | Deferred; no demand found.                                                                                                                                                                               |
| `containers/grid`                               | Tracked       | [#166](https://github.com/shlomoa/angular-django2/issues/166) (P2).                                                                                                                                      |
| `containers/structuralContainers`               | Not planned   | Covered by existing schematics: composition uses `uses.slot` sections inside `SurfaceContainers` (§2), not structural container nodes.                                                                   |
| `containers/splitters`                          | Not planned   | Deferred; no demand found.                                                                                                                                                                               |
| `controls/native`                               | Not planned   | Covered through `controls/choiceControls` and `controls/pickerControl`.                                                                                                                                  |
| `controls/choiceControls`                       | Tracked       | [#158](https://github.com/shlomoa/angular-django2/issues/158) (P1). `form-field` rejects this node type.                                                                                                 |
| `controls/pickerControl`                        | Tracked       | [#162](https://github.com/shlomoa/angular-django2/issues/162) (P2, file kind first). `form-field` rejects this node type.                                                                                |
| `controls/displayPrimitives`                    | Tracked       | [#163](https://github.com/shlomoa/angular-django2/issues/163) (P2).                                                                                                                                      |
| `controls/statusIndicator`                      | Tracked       | [#164](https://github.com/shlomoa/angular-django2/issues/164) (P2).                                                                                                                                      |
| `controls/drawingAndCapture`                    | Not planned   | Deferred; no demand found.                                                                                                                                                                               |
| `controls/linkAndScrollControls`                | Not planned   | Covered by existing navigation: `NavItem` and `ToolAction` (§1.2).                                                                                                                                       |
| `behaviors/dragAndDrop`                         | Not planned   | Deferred; no demand found.                                                                                                                                                                               |
| `behaviors/resizable`                           | Not planned   | Deferred; no demand found.                                                                                                                                                                               |
| `behaviors/collapsible`                         | Tracked       | With `containers/expandablePanels` in [#147](https://github.com/shlomoa/angular-django2/issues/147).                                                                                                     |
| `behaviors/inputAssistance`                     | Tracked       | [#161](https://github.com/shlomoa/angular-django2/issues/161) (P2).                                                                                                                                      |
| `behaviors/modalOverlay`                        | Tracked       | With `widgets/dialog` in [#144](https://github.com/shlomoa/angular-django2/issues/144).                                                                                                                  |
| `behaviors/viewportAndFocusControl`             | Not planned   | Deferred; no demand found.                                                                                                                                                                               |
| `interaction`, `internationalization`, `layout` | Cross-cutting | Vocabularies with no one-to-one schematic.                                                                                                                                                               |

`controls/actionControls` is Direct only as the `reactive-form` submit action
(§1.2); no schematic generates standalone action controls.

---

## 6. Naming conventions in OpenUI 0.12.0

Scope ids are camelCase. Their number tells whether a scope is a discrete
concept or a family:

- **Singular ids are discrete concepts**: `chart`, `table`, `dataGrid`, `list`,
  `stepper`, `dialog`, `form`, `report`, `pickerControl`, `rangeControl`,
  `statusIndicator`, `native`, `grid`, `dashboard`, `shellPage`, `emptyPage`,
  `route`, `navItem`, `navGroup`, `toolBarRow`, `toolAction`.
- **Plural or grouped ids are families**: `feedbackWidgets`, `mediaWidgets`,
  `navigationWidgets`, `menuWidgets`, `dateTimePickers`, `expandablePanels`,
  `tabs`, `surfaceContainers`, `sheetContainers`, `overlayContainers`,
  `structuralContainers`, `splitters`, `actionControls`, `textInputs`,
  `choiceControls`, `drawingAndCapture`, `displayPrimitives`,
  `linkAndScrollControls`, `toolBars`.

Obsolete names from earlier versions of this document and their 0.12.0 names
(unchanged since 0.3.1):
`charts` → `chart`, `lists` → `list`, `tables` → `table`, `data_grid` →
`dataGrid`, `forms` → `form`, `reports` → `report`, `pickerControls` →
`pickerControl`, `rangeControls` → `rangeControl`, `statusIndicators` →
`statusIndicator`, `expandable_panels` → `expandablePanels`,
`sheet_containers` → `sheetContainers`, `menu_widgets` → `menuWidgets`,
`feedback_widgets` → `feedbackWidgets`, `date_time_pickers` →
`dateTimePickers`.

Other rules:

- `dateTimePickers` is under `widgets/`, not `controls/`. `dashboard`,
  `shellPage`, and `emptyPage` are under `pages/`; `views/` holds only
  `report` and `form`.
- Documents use the **instance type**, which can differ from the scope type:
  `application/toolBars` → `ToolBar`, `application/favicon` → `link`,
  `application/indexHtml` → `html`, `pages/dashboard` → `DashboardPage`,
  `widgets/table` → `table`.
- Material-style names such as `accordion`, `bottom-sheet`, `menu`, `feedback`,
  and `date-picker` are proposed schematic names, not OpenUI identifiers. The
  OpenUI catalog has no `accordion`; the scope is
  `containers/expandablePanels`.
- `table` is a single concept under `widgets/`; the former `Controls/Table/`
  scope was retired. Its normative attributes are `behaves.sort`,
  `behaves.filter`, and `behaves.paginate`, with `tr` row children. The 0.3.1 worked example follows this
  contract; the 0.3.0 example did not
  ([openui-spec#154](https://github.com/shlomoa/openui-spec/issues/154)).
