# Mapping between `openui-spec` and `angular-django2`

This document maps every `angular-django2` schematic and every OpenUI 0.8.0
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

Scope paths are canonical OpenUI 0.8.0 `<category>/<id>` paths. Test IDs refer to
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

| Utility                                                | Role                                                                                                                                                                                                         | Tests                                         |
| :----------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------- |
| `readOpenUiDocument()`, `validateOpenUiDocument()`     | `schematics/utility/openui.ts`: load a document and validate it with the canonical `openui-spec` validator (grammar, document version, unique ids, known types, declared value types, resolved references).  | `schematics.openui.spec.ts` `TC-OPENUI-01…04` |
| `readAstNode()`, `resolveAstNode()`, attribute readers | `schematics/utility/ast-compiler.ts`: resolve `--nodeId` (or the first node of the expected type), reject unknown attributes, and read quoted-string, boolean, number, reference, and expression attributes. | `ast-compiler.spec.ts`                        |

The canonical validator (0.8.0) validates in four stages: grammar, document
(`version` must equal the catalog version, ids are unique), catalog (each `type`
is a known catalog type), and contract (a declared `uses.*` value has its
declared type, and a `reference` resolves to an element, of the declared type
for `reference(Type)`). It imposes no per-type attribute or child restrictions:
the specification states that known-type membership does not. Which attributes
and children a node may carry, and the literal-only value rule (§1.3), are
`angular-django2` decisions made by each schematic, as listed below.

### 1.2 Schematics

| Schematic           | OpenUI scope → node types                                                                                                                                                                                                                                                                 | Supported subset                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Tests                                                                                           |
| :------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| `reactive-form`     | `views/form` → `Form`; children from `controls/textInputs` → `TextInputs`, `controls/rangeControl` → `RangeControl`, and at most one `controls/actionControls` → `ActionControls` submit                                                                                                  | `Form`: `uses.title`, `uses.action` (quoted strings), `behaves.submit` (an unquoted `<artifact>#<Symbol>.<method>` expression). `ActionControls`: `uses.label`, no children. Controls: as `form-field`. Other child types are rejected. `--definition` is deprecated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `schematics.reactive-form.spec.ts` `TC-REACTIVE-FORM-OPENUI-01…06`, `-DEPRECATION`, `-TUTORIAL` |
| `form-field`        | `controls/textInputs` → `TextInputs`; `controls/rangeControl` → `RangeControl`                                                                                                                                                                                                            | `uses.type` (`text`, `email`, `password`, `textarea` on `TextInputs`; `number` on `RangeControl`), `uses.name`, `uses.label`, `uses.value`, `uses.hint`, `uses.placeholder`, `uses.autocomplete`, `uses.required`, `uses.email`, `uses.minLength`, `uses.maxLength`, `uses.min`, `uses.max`, `uses.pattern`, `uses.appearance`, `uses.subscriptSizing`. Other control types are rejected.                                                                                                                                                                                                                                                                                                                                                     | `schematics.form-field.spec.ts` `TC-FORM-FIELD-OPENUI-01…03`                                    |
| `field-component`   | `controls/textInputs` → `TextInputs` only                                                                                                                                                                                                                                                 | As `form-field`, with `uses.type` limited to `text`, `email`, `password`, `textarea`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `schematics.field-component.spec.ts` `TC-FIELD-OPENUI-01`                                       |
| `component`         | `containers/surfaceContainers` → `SurfaceContainers`; children `SurfaceContainers`, `Form`, `TextInputs`, `RangeControl`, each compiled to its own component and embedded                                                                                                                 | `uses.title`; children choose a section with `uses.slot` (`header`, `content`, `actions`; default `content`). Other child types and slots are rejected.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `schematics.composition.spec.ts` `TC-COMPOSE-01…04`, `TC-COMPOSE-09`                            |
| `complex-component` | As `component`, plus at most one `containers/overlayContainers` → `OverlayContainers` child, compiled to a CDK overlay                                                                                                                                                                    | Container as `component`. `OverlayContainers`: `uses.label`; its children may not set `uses.slot`. Only `--mode=create`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `schematics.composition.spec.ts` `TC-COMPOSE-05…08`                                             |
| `page`              | `pages/dashboard` → `DashboardPage`; `pages/emptyPage` → `EmptyPage`, plus the `application/route` → `Route` that targets the page and the `application/navItem` → `NavItem` that presents it, both read from the same document. `DashboardPage` children are composed as in `component`. | Page `uses.title` (card heading). From the `Route` whose `uses.target` is the page: the full path (its `uses.path` joined to the `uses.path` of every `Route` above it) and `uses.access` (`public`, `protected`); exactly one `Route` must target the page. From the first `NavItem` presenting that `Route`: `uses.label` and `uses.icon` (route navigation data). `--authGuard` stays an option: OpenUI leaves the guard to the implementation. `uses.route`, `uses.access`, `uses.icon`, and `uses.authGuard` on the page are rejected. `EmptyPage` rejects children.                                                                                                                                                                     | `schematics.openui-app.spec.ts` `TC-APP-03…05`, `TC-APP-18…20`                                  |
| `application`       | `Application` with children from `application/routing` → `Routing`, `application/navigation` → `Navigation`, `application/toolBars` → `ToolBar`, `presentation` → `Presentation`, `application/indexHtml` → `html`, `application/favicon` → `link`                                        | Name from the node id; routing when a `Routing` child exists. `ToolBar` content is validated as in `material-app`. No `Application` attributes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `schematics.openui-app.spec.ts` `TC-APP-01`, `TC-APP-02`, `TC-APP-17`                           |
| `material-app`      | As `application`, plus `application/route` → `Route`, `application/navItem` → `NavItem`, `application/navGroup` → `NavGroup`, `application/toolBarRow` → `ToolBarRow`, `application/toolAction` → `ToolAction`                                                                            | `Presentation`: `uses.theme`, `uses.typography`, `uses.animations`. `html` `uses.title`: toolbar title. Sidenav: `Navigation` `uses.ariaLabel` → `NavItem` (`uses.label`, `uses.route`, `uses.icon`, `uses.disabled`) / `NavGroup` (`uses.label`, `uses.expanded`) → referenced `Route` (`uses.path`, `uses.target`, `uses.title`, `uses.redirectTo`, `uses.access`), under `Routing` `uses.defaultRoute`. References are quoted element ids that the validator resolves and type-checks. Toolbar: `ToolBar` `uses.ariaLabel` → `ToolBarRow` → `ToolAction` (`uses.label`, `uses.icon`, `uses.disabled`, `produces.activate` as a `null` marker that generates an `on<ActionId>Activate($event)` stub), rendered as rows after the title row. | `schematics.openui-app.spec.ts` `TC-APP-06`, `TC-APP-07`, `TC-APP-13…17`                        |
| `workspace-setup`   | `application/indexHtml` → first non-root `html`; `application/favicon` → first `link` with `uses.rel` = `"icon"`. No `--nodeId`.                                                                                                                                                          | `html`: `uses.lang`, `uses.dir` (`ltr`, `rtl`, `auto`), `uses.title`. `link`: `uses.rel`, `uses.href` (workspace icon file), `uses.type`, `uses.sizes`, `uses.media`; only `uses.href` is used.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `schematics.openui-app.spec.ts` `TC-APP-08…10`                                                  |
| `data-service`      | Any node carrying `uses.data`                                                                                                                                                                                                                                                             | `uses.data` = `"<apiPath>#<ApiService>"` (a quoted string). No other attribute is read or checked.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `schematics.openui-app.spec.ts` `TC-APP-11`, `TC-APP-12`                                        |

With `--document`, the schematics above reject command-line options that the
document describes (for example `--routing`, `--theme`, `--controlType`,
`--apiService`); see each schematic's CLI documentation. Where `--nodeId`
exists, it requires `--document`.

### 1.3 Attributes outside the OpenUI 0.8.0 contract

The catalog declares a typed attribute contract only for some types. The
schematics read these **catalog-declared** attributes:

| Type         | Declared attributes read                                                                                                 |
| :----------- | :----------------------------------------------------------------------------------------------------------------------- |
| `Routing`    | `uses.defaultRoute` (`reference(Route)`)                                                                                 |
| `Route`      | `uses.path`, `uses.title`, `uses.access` (`string`); `uses.target` (`reference`); `uses.redirectTo` (`reference(Route)`) |
| `Navigation` | `uses.ariaLabel` (`string`)                                                                                              |
| `NavItem`    | `uses.label`, `uses.icon` (`string`); `uses.route` (`reference(Route)`); `uses.disabled` (`boolean`)                     |
| `NavGroup`   | `uses.label` (`string`); `uses.expanded` (`boolean`)                                                                     |
| `ToolBar`    | `uses.ariaLabel` (`string`)                                                                                              |
| `ToolAction` | `uses.label`, `uses.icon` (`string`); `uses.disabled` (`boolean`); `produces.activate` (`null` marker)                   |
| `html`       | `uses.lang`, `uses.title` (`string`); `uses.dir` (`enum(ltr\|rtl\|auto)`)                                                |
| `link`       | `uses.rel`, `uses.type`, `uses.sizes`, `uses.media` (`string`); `uses.href` (`url`); only `uses.href` is used            |
| `Form`       | `behaves.submit`; `behaves.validate` and `produces.dirtyChange` are declared but not read                                |

The 0.8.0 catalog declares **no attributes** for `ActionControls`, `TextInputs`,
`RangeControl`, `SurfaceContainers`, `OverlayContainers`, `DashboardPage`,
`EmptyPage`, or `Presentation`, and neither `uses.title` nor `uses.action` for
`Form`. The attributes these schematics read on them, plus `uses.slot` and
`uses.data` and their value formats, are **`angular-django2` extensions**, not
OpenUI-defined attributes. The specification permits them: a concrete document
may carry attributes a type does not declare. The rejection of attributes
that a schematic does not read is an `angular-django2` policy.

Value interpretation is also an `angular-django2` decision. The base format
types a value (string, number, boolean, `null`, or a list of these) and lets a
generator read a string as a static literal or as a target-language expression.
The schematics generate static code, so:

| Attribute category | Value the schematics accept                                                                                  |
| :----------------- | :----------------------------------------------------------------------------------------------------------- |
| `uses.*` string    | A quoted literal (`"\"Email\""`). An unquoted string is a binding expression and is rejected.                |
| `uses.*` boolean   | JSON `true` or `false`.                                                                                      |
| `uses.*` number    | A finite JSON number.                                                                                        |
| `uses.*` reference | A quoted element id, resolved by the validator.                                                              |
| `behaves.*`        | An unquoted expression. `behaves.submit` is `<artifact>#<Symbol>.<method>`, a symbolic form defined by ngdj. |
| `produces.*`       | `null`, a marker that the event is exposed. `material-app` generates an `on<ActionId>Activate($event)` stub. |

A `uses.<input>` attribute on a child embedded by `component`,
`complex-component`, or `page` becomes a literal binding of the generated
component input (`[input]="'text'"`, `[input]="true"`). The spec's own example of
this mapping, `[name]` for Uses and `(name)` for Produces or Behaves, is
followed for inputs only; `produces.*` and `behaves.*` attributes do not
generate output bindings, except as stated above.

### 1.4 Known limitations

These are current behavior, documented by maintainer decision:

- `application --document` does not read `Navigation` or `Routing` content;
  only `material-app` does. The validator still checks the declared value types
  and references of the whole document for every schematic.
- Accepted but unused: `Route` `uses.title`, `Routing` `uses.defaultRoute` and
  `Route` `uses.redirectTo` (resolved and type-checked by the validator, not
  otherwise used), `Navigation` `uses.ariaLabel` (not emitted on the sidenav), and `NavGroup` `uses.expanded`. `NavGroup` entries are
  flattened, and its `uses.label` is not rendered. `Route` `uses.access` is read by
  `page` only; `material-app` does not use it.
- `Route` `uses.target` is declared as an untyped `reference`, so the validator
  checks that the id exists but not what it names; no schematic checks that the
  target is a page or content element ([concern](#8-concerns-for-openui-spec)).
- A page is registered under one route path, so a page that several `Route`
  elements target is rejected. When several `NavItem` elements present the same
  `Route`, `page` uses the first in document order for its route navigation data.
- Routing has one source: `page` and `material-app` both read the full path of a
  `Route` (its `uses.path` joined to the `uses.path` of every `Route` above it), so a
  registered route and its sidenav link cannot disagree.

---

## 2. Conceptual / CLI by design

| OpenUI scope                | `angular-django2`   | Relationship                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| :-------------------------- | :------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/shellPage`           | `material-app`      | `material-app`'s layout (toolbar, sidenav, router outlet) is the shell page. It is built from the `Application` node and its children; no `ShellPage` node is read.                                                                                                                                                                                                                                                                                               |
| — (`presentation` tokens)   | `material-setup`    | CLI-driven by design. Its options are exactly the `Presentation` tokens, which `material-app --document` reads and passes on (§1.2).                                                                                                                                                                                                                                                                                                                              |
| —                           | `app-shell`         | CLI-driven by design: a pass-through to Angular's SSR / prerender app-shell schematic, with no OpenUI counterpart.                                                                                                                                                                                                                                                                                                                                                |
| — (`uses.slot` composition) | `embed-component`   | No OpenUI input (CLI `--slot`). Its logic is the composition engine that `component`, `complex-component`, and `page` use to embed compiled children by `uses.slot`. `uses.slot` is an `angular-django2` extension (§1.3). Tests: `schematics.composition.spec.ts` `TC-COMPOSE-09…11`.                                                                                                                                                                            |
| `widgets/dialog` (indirect) | `complex-component` | An `OverlayContainers` child gives a non-modal CDK connected overlay (a popover: no backdrop, no focus trap) with projected content (§1.2). That matches OpenUI 0.8.0, where overlay containers cover popovers only and modality comes from the `behaviors/modalOverlay` behavior, which is Missing (§5). This is not a `widgets/dialog` implementation: no `Dialog` node is read and there is no `MatDialog` lifecycle. `widgets/dialog` itself is Planned (§3). |

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

OpenUI 0.8.0 scopes with no schematic, no coverage through another schematic,
and no plan:

| OpenUI scope                                                            | Notes                                                                                                                                                                                                                                                                                      |
| :---------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `views/report`                                                          | No report view. `data-service` generates data transport from a `uses.data` binding only; it renders no UI.                                                                                                                                                                                 |
| `widgets/list`                                                          |                                                                                                                                                                                                                                                                                            |
| `widgets/navigationWidgets`                                             | The `material-app` sidenav comes from `application/navigation` (§1.2), not from this scope.                                                                                                                                                                                                |
| `widgets/mediaWidgets`                                                  |                                                                                                                                                                                                                                                                                            |
| `containers/grid`                                                       |                                                                                                                                                                                                                                                                                            |
| `containers/structuralContainers`                                       | Composition uses `uses.slot` sections inside `SurfaceContainers` (§2), not structural container nodes.                                                                                                                                                                                     |
| `containers/splitters`                                                  |                                                                                                                                                                                                                                                                                            |
| `controls/native`                                                       |                                                                                                                                                                                                                                                                                            |
| `controls/choiceControls`                                               | `form-field` rejects this node type.                                                                                                                                                                                                                                                       |
| `controls/pickerControl`                                                | `form-field` rejects this node type.                                                                                                                                                                                                                                                       |
| `controls/displayPrimitives`                                            |                                                                                                                                                                                                                                                                                            |
| `controls/statusIndicator`                                              |                                                                                                                                                                                                                                                                                            |
| `controls/drawingAndCapture`                                            |                                                                                                                                                                                                                                                                                            |
| `controls/linkAndScrollControls`                                        |                                                                                                                                                                                                                                                                                            |
| `behaviors/dragAndDrop`, `behaviors/resizable`, `behaviors/collapsible` | Each declares one `uses.target` attribute (type `reference`) that references its controlled element, and no children. Before 0.4.0 they owned target children of the types `page`, `view`, `container`, and `widget`.                                                                      |
| `behaviors/inputAssistance`                                             | New in 0.4.0: text completion and constraint validation for any input control; it declares only `uses.target`. The validation attributes that `form-field` reads (`uses.required`, `uses.pattern`, and so on) remain `angular-django2` extensions (§1.3), not attributes of this behavior. |
| `behaviors/modalOverlay`                                                | New in 0.4.0: makes a referenced surface modal. The `complex-component` overlay is a non-modal popover (§2). `widgets/dialog` follows this behavior for modal focus and dismissal (§3).                                                                                                    |
| `behaviors/viewportAndFocusControl`                                     | New in 0.4.0: viewport scrolling, scroll lock, and focus management.                                                                                                                                                                                                                       |
| `interaction`, `internationalization`, `layout`                         | Cross-cutting vocabularies with no one-to-one schematic.                                                                                                                                                                                                                                   |

`controls/actionControls` is Direct only as the `reactive-form` submit action
(§1.2); no schematic generates standalone action controls.

---

## 6. Naming conventions in OpenUI 0.8.0

Scope ids are camelCase. OpenUI defines no rule that ties the number of a scope
id to its kind (its naming rule covers element ids and `type` syntax only), so
the number is a hint, not a contract:

- **Singular ids that name one concept**: `chart`, `table`, `dataGrid`, `list`,
  `stepper`, `dialog`, `form`, `report`, `native`, `grid`, `dashboard`,
  `shellPage`, `emptyPage`, `route`, `navItem`, `navGroup`, `toolBarRow`,
  `toolAction`, `dragAndDrop`, `resizable`, `collapsible`, `modalOverlay`.
- **Plural or grouped ids that name families**: `feedbackWidgets`,
  `mediaWidgets`, `navigationWidgets`, `menuWidgets`, `dateTimePickers`,
  `expandablePanels`, `tabs`, `surfaceContainers`, `sheetContainers`,
  `overlayContainers`, `structuralContainers`, `splitters`, `actionControls`,
  `textInputs`, `choiceControls`, `drawingAndCapture`, `displayPrimitives`,
  `linkAndScrollControls`, `toolBars`.
- **Singular ids that name families**: `pickerControl`, `rangeControl`,
  `statusIndicator`, `inputAssistance`, and `viewportAndFocusControl`. Their
  catalog Purposes list several variants; for example, a range control covers
  sliders, spin boxes, and ratings. Earlier versions of this document classed
  the first three as discrete concepts.

Obsolete names from earlier versions of this document and their 0.8.0 names
(unchanged since 0.3.0): `charts` → `chart`, `lists` → `list`, `tables` →
`table`, `data_grid` → `dataGrid`, `forms` → `form`, `reports` → `report`,
`pickerControls` → `pickerControl`, `rangeControls` → `rangeControl`,
`statusIndicators` → `statusIndicator`, `expandable_panels` →
`expandablePanels`, `sheet_containers` → `sheetContainers`, `menu_widgets` →
`menuWidgets`, `feedback_widgets` → `feedbackWidgets`, `date_time_pickers` →
`dateTimePickers`.

Other rules:

- `dateTimePickers` is under `widgets/`, not `controls/`. `dashboard`,
  `shellPage`, and `emptyPage` are under `pages/`; `views/` holds only
  `report` and `form`. The three Behaviors added in 0.4.0 (`inputAssistance`,
  `modalOverlay`, `viewportAndFocusControl`) are under `behaviors/`.
- The catalog accepts both a scope's `type` and its instance type as a known
  object type (for example `Table` and `table`). The schematics read the
  **instance type**, which can differ from the scope type: `application/toolBars`
  → `ToolBar`, `application/favicon` → `link`, `application/indexHtml` → `html`,
  `pages/dashboard` → `DashboardPage`, `widgets/table` → `table`.
  `data-service` reads `uses.data` on any node and does not depend on its type.
- Material-style names such as `accordion`, `bottom-sheet`, `menu`, `feedback`,
  and `date-picker` are proposed schematic names, not OpenUI identifiers. The
  OpenUI catalog has no `accordion`; the scope is
  `containers/expandablePanels`.
- `table` is a single concept under `widgets/`; the former `Controls/Table/`
  scope was retired. Its normative attributes are `behaves.sort`, `behaves.filter`, and
  `behaves.paginate`, with `tr` row children. The worked example has followed this
  contract since 0.3.1; the 0.3.0 example did not
  ([openui-spec#154](https://github.com/shlomoa/openui-spec/issues/154)).

---

## 7. Terminology

`openui-spec` owns the vocabulary: the
[glossary](https://github.com/shlomoa/openui-spec/blob/v0.8.0/spec/scopes/scope.md#glossary)
and the approved
[terminology changes](https://github.com/shlomoa/openui-spec/blob/v0.8.0/spec/scopes/terminology.md).
`angular-django2` uses the canonical terms in its documents and diagnostics and
keeps the framework meanings apart:

| Term                           | Use in this repository                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| :----------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Component**                  | Always an Angular component, the generated artifact. The glossary also uses "component" and "UI component" as aliases of **Object** (0.8.0). The schematic names `component`, `complex-component`, `field-component`, and `embed-component` are Angular CLI names, not OpenUI identifiers.                                                                                                                                                                                                                             |
| **Widget**                     | A reusable specification object under `widgets/`. Being built from a Material component does not make a scope a widget: `containers/tabs`, `containers/expandablePanels`, and `containers/sheetContainers` are containers.                                                                                                                                                                                                                                                                                             |
| **Element**                    | One node in a document, addressed by `id`. The schematics resolve one element with `--nodeId` and call it a node in diagnostics, following the glossary's use of **Node** for tree traversal.                                                                                                                                                                                                                                                                                                                          |
| **Object type**                | A known object type is an exact catalog literal. The validator rejects any other `type` with `unknown OpenUI object type`.                                                                                                                                                                                                                                                                                                                                                                                             |
| **Category**                   | `Form` is a view (`views/form`), not a control or a widget. `SurfaceContainers` and `OverlayContainers` are containers. `TextInputs`, `RangeControl`, and `ActionControls` are controls. `DashboardPage` and `EmptyPage` are pages; "screen" is a glossary alias of **Page**.                                                                                                                                                                                                                                          |
| **Popover**                    | What an `OverlayContainers` child generates: a non-modal overlay. Modality is the `ModalOverlay` behavior, which no schematic reads (§5).                                                                                                                                                                                                                                                                                                                                                                              |
| **Reference**                  | An element reference is a quoted element-id string, as in `Route` `uses.target` and `NavItem` `uses.route`. The `uses.target` of every behavior names its **controlled element**. The validator resolves declared references and checks the referenced type when the attribute is typed `reference(Type)`; `Route` `uses.target` is an untyped `reference`, so only its existence is checked. `uses.slot` is different: it places children that a container **owns**, and it is an `angular-django2` extension (§1.3). |
| **Attribute**                  | An entry of `attrs`, keyed `uses.<name>`, `produces.<name>`, or `behaves.<name>`, with a typed value. It is never an HTML attribute or an Angular input; the schematics call those _template attributes_ and _inputs_. A `uses.*` string is a _literal_ when quoted inside the string and an _expression_ when not (§1.3).                                                                                                                                                                                             |
| **Document**                   | The specification's _concrete UI document_ (alias `input.json`): the `--document` file. Diagnostics name a node as `<document>#<nodeId>`.                                                                                                                                                                                                                                                                                                                                                                              |
| **Owner / controlled element** | `uses.slot` places children that a container **owns**; `uses.target` and `uses.route` name elements the referring element does not own. The schematics never use one for the other.                                                                                                                                                                                                                                                                                                                                    |
| **Generator**                  | The 0.8.0 Scope section places generators out of scope of the specification, which defines documents and the catalog. The `angular-django2` schematics are generators in that sense. The `openui-spec` repository contains its own Angular generator; `angular-django2` does not use it.                                                                                                                                                                                                                               |

---

## 8. Concerns for openui-spec

`angular-django2` aligns with the 0.8.0 specification and does not fork or
extend it. These points are inconsistencies, ambiguities, or limits that
`angular-django2` cannot resolve on its own. The interpretation column is what
this repository does meanwhile.

| #   | Concern                                                                                                                                                                                                                                                                                                                                      | Interpretation here                                                                                                                      |
| :-- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The npm package README still describes 0.5 documents: attribute values "as strings or `null`", and validation of "document shape, known types, and unique ids". The typed values, reference resolution, and the `parse` / `validate` / `validateText` / `Catalog` API of 0.6.0 are missing from it, and the changelog is not in the package. | The code and documents follow the 0.6.0 to 0.8.0 changelog and the package types.                                                        |
| 2   | `Route` `uses.target` is declared as an untyped `reference`, while `NavItem` `uses.route` and `Route` `uses.redirectTo` are `reference(Route)`. The catalog does not say what a route may target (a page, a content element, any element).                                                                                                   | The validator checks that the id exists. `page` requires the target to be a page it compiles. No other type check.                       |
| 3   | A Behaves value is a callback or target-framework logic, but the specification does not say how a document names it portably. The catalog declares `behaves.submit` as `null`.                                                                                                                                                               | `behaves.submit` is the unquoted expression `<artifact>#<Symbol>.<method>`, an `angular-django2` convention.                             |
| 4   | A string may be a literal or a target-language expression, and the specification leaves the reading to the generator. A document that mixes both is valid for the validator and not portable across generators.                                                                                                                              | `uses.*` strings must be quoted literals; expressions are rejected because the schematics generate static code.                          |
| 5   | `TextInputs`, `RangeControl`, `ActionControls`, `SurfaceContainers`, `OverlayContainers`, `DashboardPage`, `EmptyPage`, `Presentation`, and `Form` (`uses.title`, `uses.action`) declare no Uses attributes, while `Native` (`input`) declares `uses.type`, `uses.value`, `uses.placeholder`, and `uses.disabled`.                           | The attributes in §1.3 are `angular-django2` extensions that reuse the `Native` names. They are not portable to another generator.       |
| 6   | The `table` Purpose names columns, a caption, and header associations; its Child model and Attributes declare only `behaves.sort`, `behaves.filter`, `behaves.paginate`, and `tr` rows.                                                                                                                                                      | No table schematic exists (§3). Nothing here depends on it.                                                                              |
| 7   | The catalog has scope types (`Dashboard`, `Table`) and instance types (`DashboardPage`, `table`) that are all known types. The specification does not say which a document should use.                                                                                                                                                       | The schematics read the instance type (§6); a scope type such as `Dashboard` passes the validator and is then rejected by `page`.        |
| 8   | A document must carry `version` equal to the catalog version. Releases 0.7.0 and 0.8.0 changed no document shape, yet every document needs a version edit. The migration tool (`python -m spec.bin.migrate`) is Python only and is not in the npm package. The conformance suite is in the repository only.                                  | `angular-django2` moves in lockstep with the spec and keeps its own valid and invalid fixtures (`fixtures/openui/`), not the spec suite. |
| 9   | The glossary lists "component" and "UI component" as aliases of **Object**, and "app document" and `input.json` as aliases of **Concrete UI document**. In Angular a component is a generated artifact.                                                                                                                                      | §7 keeps the framework meaning for "component" and uses "document".                                                                      |
