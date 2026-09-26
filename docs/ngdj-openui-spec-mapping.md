# Mapping between `openui-spec` and `angular-django2`

This document maps every `angular-django2` schematic and every OpenUI 0.3.1
scope (`@shlomoa/openui-spec`, pinned in [`package.json`](../package.json)) to
exactly one class. For the architecture and roadmap, see the
[OpenUI Specification Implementation Plan](openui-spec-implementation-plan.md).

## 0. Classification

| Class                          | Meaning                                                                                                              |
| :----------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **Direct (OpenUI in)**         | The schematic compiles OpenUI nodes from `--document`. Implemented, with named tests. §1 lists the supported subset. |
| **Conceptual / CLI by design** | The schematic corresponds to an OpenUI concept but takes CLI options, or the concept is realized indirectly.         |
| **Planned**                    | A spec-first schematic that is not built yet. Documents containing the scope cannot be compiled.                     |
| **Tooling only**               | Angular CLI or project tooling with no OpenUI counterpart.                                                           |
| **Missing**                    | An OpenUI scope with no schematic, no coverage through another schematic, and no plan.                               |

Scope paths are canonical OpenUI 0.3.1 `<category>/<id>` paths. Test IDs refer to
specs in `projects/angular-django-validation/unit/schematics/`. Some IDs are
reused across spec files (for example `TC-APP-01…03` also exist in
`schematics.material-app.spec.ts`), so every test reference names its spec file.

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

| Utility                                                | Role                                                                                                                                                                           | Tests                                         |
| :----------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------- |
| `readOpenUiDocument()`, `validateOpenUiDocument()`     | `schematics/utility/openui.ts`: load a document and validate it with the canonical `openui-spec` validator (schema, known types, unique ids).                                  | `schematics.openui.spec.ts` `TC-OPENUI-01…04` |
| `readAstNode()`, `resolveAstNode()`, attribute readers | `schematics/utility/ast-compiler.ts`: resolve `--nodeId` (or the first node of the expected type), reject unknown attributes, and read string, boolean, and number attributes. | `ast-compiler.spec.ts`                        |

The canonical validator checks only that each `type` is a known catalog type.
Attribute and child checks are done by each schematic, as listed below.

### 1.2 Schematics

| Schematic           | OpenUI scope → node types                                                                                                                                                                                                                          | Supported subset                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Tests                                                                                           |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| `reactive-form`     | `views/form` → `Form`; children from `controls/textInputs` → `TextInputs`, `controls/rangeControl` → `RangeControl`, and at most one `controls/actionControls` → `ActionControls` submit                                                           | `Form`: `[title]`, `[action]`, `(submit)` (`<artifact>#<Symbol>.<method>`). `ActionControls`: `[label]`, no children. Controls: as `form-field`. Other child types are rejected. `--definition` is deprecated.                                                                                                                                                                                                                                                                                                                                                                                                  | `schematics.reactive-form.spec.ts` `TC-REACTIVE-FORM-OPENUI-01…06`, `-DEPRECATION`, `-TUTORIAL` |
| `form-field`        | `controls/textInputs` → `TextInputs`; `controls/rangeControl` → `RangeControl`                                                                                                                                                                     | `[type]` (`text`, `email`, `password`, `textarea` on `TextInputs`; `number` on `RangeControl`), `[name]`, `[label]`, `[value]`, `[hint]`, `[placeholder]`, `[autocomplete]`, `[required]`, `[email]`, `[minLength]`, `[maxLength]`, `[min]`, `[max]`, `[pattern]`, `[appearance]`, `[subscriptSizing]`. Other control types are rejected.                                                                                                                                                                                                                                                                       | `schematics.form-field.spec.ts` `TC-FORM-FIELD-OPENUI-01…03`                                    |
| `field-component`   | `controls/textInputs` → `TextInputs` only                                                                                                                                                                                                          | As `form-field`, with `[type]` limited to `text`, `email`, `password`, `textarea`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `schematics.field-component.spec.ts` `TC-FIELD-OPENUI-01`                                       |
| `component`         | `containers/surfaceContainers` → `SurfaceContainers`; children `SurfaceContainers`, `Form`, `TextInputs`, `RangeControl`, each compiled to its own component and embedded                                                                          | `[title]`; children choose a section with `[slot]` (`header`, `content`, `actions`; default `content`). Other child types and slots are rejected.                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `schematics.composition.spec.ts` `TC-COMPOSE-01…04`, `TC-COMPOSE-09`                            |
| `complex-component` | As `component`, plus at most one `containers/overlayContainers` → `OverlayContainers` child, compiled to a CDK overlay                                                                                                                             | Container as `component`. `OverlayContainers`: `[label]`; its children may not set `[slot]`. Only `--mode=create`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `schematics.composition.spec.ts` `TC-COMPOSE-05…08`                                             |
| `page`              | `pages/dashboard` → `DashboardPage`; `pages/emptyPage` → `EmptyPage`. `DashboardPage` children are composed as in `component`.                                                                                                                     | `[title]` (card title), `[route]` (registered lazy route), `[access]` (`public`, `protected`), `[authGuard]`, `[icon]` (validated only). `EmptyPage` rejects children.                                                                                                                                                                                                                                                                                                                                                                                                                                          | `schematics.openui-app.spec.ts` `TC-APP-03…05`                                                  |
| `application`       | `Application` with children from `application/routing` → `Routing`, `application/navigation` → `Navigation`, `application/toolBars` → `ToolBar`, `presentation` → `Presentation`, `application/indexHtml` → `html`, `application/favicon` → `link` | Name from the node id; routing when a `Routing` child exists. `ToolBar` content is validated as in `material-app`. No `Application` attributes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `schematics.openui-app.spec.ts` `TC-APP-01`, `TC-APP-02`, `TC-APP-17`                           |
| `material-app`      | As `application`, plus `application/route` → `Route`, `application/navItem` → `NavItem`, `application/navGroup` → `NavGroup`, `application/toolBarRow` → `ToolBarRow`, `application/toolAction` → `ToolAction`                                     | `Presentation`: `[theme]`, `[typography]`, `[animations]`. `html[title]`: toolbar title. Sidenav: `Navigation[ariaLabel]` → `NavItem` (`[label]`, `[route]`, `[icon]`, `[disabled]`) / `NavGroup` (`[label]`, `[expanded]`) → referenced `Route` (`[path]`, `[target]`, `[title]`, `[redirectTo]`, `[access]`), under `Routing[defaultRoute]`. References are quoted element ids. Toolbar: `ToolBar[ariaLabel]` → `ToolBarRow` → `ToolAction` (`[label]`, `[icon]`, `[disabled]`, `(activate)` as a `null` marker that generates an `on<ActionId>Activate($event)` stub), rendered as rows after the title row. | `schematics.openui-app.spec.ts` `TC-APP-06`, `TC-APP-07`, `TC-APP-13…17`                        |
| `workspace-setup`   | `application/indexHtml` → first non-root `html`; `application/favicon` → first `link` with `[rel]`=`icon`. No `--nodeId`.                                                                                                                          | `html`: `[lang]`, `[dir]` (`ltr`, `rtl`, `auto`), `[title]`. `link`: `[rel]`, `[href]` (workspace icon file), `[type]`, `[sizes]`, `[media]`; only `[href]` is used.                                                                                                                                                                                                                                                                                                                                                                                                                                            | `schematics.openui-app.spec.ts` `TC-APP-08…10`                                                  |
| `data-service`      | Any node carrying `[data]`                                                                                                                                                                                                                         | `[data]` = `<apiPath>#<ApiService>`. No other attribute is read or checked.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `schematics.openui-app.spec.ts` `TC-APP-11`, `TC-APP-12`                                        |

With `--document`, the schematics above reject command-line options that the
document describes (for example `--routing`, `--theme`, `--controlType`,
`--apiService`); see each schematic's CLI documentation. Where `--nodeId`
exists, it requires `--document`.

### 1.3 Attributes outside the OpenUI 0.3.1 contract

The object types above are all OpenUI 0.3.1 catalog types, and the
application-scope attributes (`Routing`, `Route`, `Navigation`, `NavItem`,
`NavGroup`, `ToolBar`, `ToolAction`, `html`, `link`) are catalog attributes.
The 0.3.1 catalog defines **no attributes** for `Form` (except `(submit)`),
`ActionControls`, `TextInputs`, `RangeControl`, `SurfaceContainers`,
`OverlayContainers`, `DashboardPage`, `EmptyPage`, or `Presentation`. The
attributes these schematics read on them, plus `[slot]` and `[data]` and its
value format, are **`angular-django2` extensions**, not OpenUI-defined
attributes.

### 1.4 Known limitations

These are current behavior, documented by maintainer decision:

- `application --document` does not validate `Navigation` or `Routing` content;
  only `material-app` does.
- Accepted but unused: `Route[title]`, `Route[access]`, `Routing[defaultRoute]`
  and `Route[redirectTo]` (checked only as references), `Navigation[ariaLabel]`
  (not emitted on the sidenav), and `NavGroup[expanded]`. `NavGroup` entries are
  flattened, and its `[label]` is not rendered. `page`'s `[icon]` is validated
  but not used.
- Nested `Route` paths are not composed: a link to a child route uses the
  child's `[path]` alone, although OpenUI 0.3.1 defines it as relative to the
  parent route.
- `Route[target]` is checked to exist, not to be a page or content element.
- Route paths have two unsynchronized sources: `page` registers
  `DashboardPage[route]`, and `material-app` links to `Route[path]`. Nothing
  checks that they match.

---

## 2. Conceptual / CLI by design

| OpenUI scope                | `angular-django2`   | Relationship                                                                                                                                                                                                                                                                     |
| :-------------------------- | :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/shellPage`           | `material-app`      | `material-app`'s layout (toolbar, sidenav, router outlet) is the shell page. It is built from the `Application` node and its children; no `ShellPage` node is read.                                                                                                              |
| — (`presentation` tokens)   | `material-setup`    | CLI-driven by design. Its options are exactly the `Presentation` tokens, which `material-app --document` reads and passes on (§1.2).                                                                                                                                             |
| —                           | `app-shell`         | CLI-driven by design: a pass-through to Angular's SSR / prerender app-shell schematic, with no OpenUI counterpart.                                                                                                                                                               |
| — (`[slot]` composition)    | `embed-component`   | No OpenUI input (CLI `--slot`). Its logic is the composition engine that `component`, `complex-component`, and `page` use to embed compiled children by `[slot]`. `[slot]` is an `angular-django2` extension (§1.3). Tests: `schematics.composition.spec.ts` `TC-COMPOSE-09…11`. |
| `widgets/dialog` (indirect) | `complex-component` | An `OverlayContainers` child gives a CDK overlay with projected content (§1.2). This is not a `widgets/dialog` implementation: no `Dialog` node is read and there is no `MatDialog` lifecycle. `widgets/dialog` itself is Planned (§3).                                          |

`pages/shellPage` is classified here. `presentation` is Direct through
`material-app` (§1.2), and `widgets/dialog` is Planned (§3).

---

## 3. Planned

Spec-first schematics that are not built yet. The schematic names are proposed
Angular / Material names, not OpenUI identifiers. Details:
[implementation plan](openui-spec-implementation-plan.md) §3–§5. None has a
tracking issue yet.

| OpenUI scope                  | Proposed schematic |
| :---------------------------- | :----------------- |
| `widgets/table`               | `table`            |
| `widgets/dataGrid`            | `data-grid`        |
| `widgets/dialog`              | `dialog`           |
| `widgets/stepper`             | `stepper`          |
| `containers/tabs`             | `tabs`             |
| `containers/expandablePanels` | `accordion`        |
| `containers/sheetContainers`  | `bottom-sheet`     |
| `widgets/menuWidgets`         | `menu`             |
| `widgets/feedbackWidgets`     | `feedback`         |
| `widgets/dateTimePickers`     | `date-picker`      |
| `widgets/chart`               | `chart`            |

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

OpenUI 0.3.1 scopes with no schematic, no coverage through another schematic,
and no plan:

| OpenUI scope                                                            | Notes                                                                                                   |
| :---------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| `views/report`                                                          | No report view. `data-service` generates data transport from a `[data]` binding only; it renders no UI. |
| `widgets/list`                                                          |                                                                                                         |
| `widgets/navigationWidgets`                                             | The `material-app` sidenav comes from `application/navigation` (§1.2), not from this scope.             |
| `widgets/mediaWidgets`                                                  |                                                                                                         |
| `containers/grid`                                                       |                                                                                                         |
| `containers/structuralContainers`                                       | Composition uses `[slot]` sections inside `SurfaceContainers` (§2), not structural container nodes.     |
| `containers/splitters`                                                  |                                                                                                         |
| `controls/native`                                                       |                                                                                                         |
| `controls/choiceControls`                                               | `form-field` rejects this node type.                                                                    |
| `controls/pickerControl`                                                | `form-field` rejects this node type.                                                                    |
| `controls/displayPrimitives`                                            |                                                                                                         |
| `controls/statusIndicator`                                              |                                                                                                         |
| `controls/drawingAndCapture`                                            |                                                                                                         |
| `controls/linkAndScrollControls`                                        |                                                                                                         |
| `behaviors/dragAndDrop`, `behaviors/resizable`, `behaviors/collapsible` |                                                                                                         |
| `interaction`, `internationalization`, `layout`                         | Cross-cutting vocabularies with no one-to-one schematic.                                                |

`controls/actionControls` is Direct only as the `reactive-form` submit action
(§1.2); no schematic generates standalone action controls.

---

## 6. Naming conventions in OpenUI 0.3.1

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

Obsolete names from earlier versions of this document and their 0.3.1 names:
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
  scope was retired. Its normative attributes are `(sort)`, `(filter)`, and
  `(paginate)`, with `tr` row children. The 0.3.1 worked example follows this
  contract; the 0.3.0 example did not
  ([openui-spec#154](https://github.com/shlomoa/openui-spec/issues/154)).
