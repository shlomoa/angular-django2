# OpenUI Specification Implementation Plan for `angular-django2` (`ngdj`)

This plan describes how `angular-django2` (`ngdj`) implements the
[OpenUI Specification](https://github.com/shlomoa/openui-spec), version 0.8.0
(`@shlomoa/openui-spec`, pinned in [`package.json`](../package.json)). It
separates what is implemented today from what is planned.

Terminology follows the OpenUI
[glossary](https://github.com/shlomoa/openui-spec/blob/v0.8.0/spec/scopes/scope.md#glossary),
which `openui-spec` owns. In this repository, **object**, **element**, **known
object type**, and **scope** carry their OpenUI meaning. **Component** means an
Angular component, the generated artifact; the glossary uses the same word as an
alias of **object**, so this document never uses it for an OpenUI concept.

**Status legend**

- **Implemented**: shipped in the schematics collection, with named test
  evidence.
- **Planned**: not implemented. Everything not marked Implemented is Planned.

The per-schematic contract (accepted node types, supported attributes, test IDs,
and known limitations) is maintained in
[`ngdj-openui-spec-mapping.md`](ngdj-openui-spec-mapping.md). This plan links to
it instead of repeating it.

---

## 1. Architecture and Current Boundary

### 1.1 Target architecture: Option A (document-driven, JSON-first compiler)

`angular-django2` is designed as a **document-driven, JSON-first compiler**:

- It consumes concrete OpenUI JSON documents (for example `app.openui.json`) as
  structured input.
- Generation is deterministic: for the same OpenUI document and workspace state,
  it produces identical, verifiable Angular code, without runtime AI
  intervention.

### 1.2 Current boundary (Implemented)

- **Document input is per schematic.** Each schematic that accepts OpenUI input
  takes `--document` (and, for most, `--nodeId`) and compiles one node and its
  subtree: `reactive-form`, `form-field`, `field-component`, `component`,
  `complex-component`, `page`, `application`, `material-app`,
  `workspace-setup`, and `data-service`. `material-setup` and `app-shell` are
  CLI-driven by design. Evidence: the mapping document and the specs under
  `projects/angular-django-validation/unit/schematics/`.
- **No schematic compiles a whole document.** Selecting artifacts and
  orchestrating schematics across a whole application belongs to
  `django-angular3` (`djng`), per the ownership boundary in
  [#27](https://github.com/shlomoa/angular-django2/issues/27).
- **The scopes in §3 are not implemented.** Documents that contain them cannot
  be compiled yet.

### 1.3 Target constraint: spec-defined identifiers only

> **Target directive**: all object types and attribute contracts that `ngdj`
> consumes and generates must be those defined in `openui-spec`. No
> out-of-spec identifiers may be introduced.

Current status: **partially met**.

- **Object types**: met. Every document is validated by the canonical
  `openui-spec` validator, which rejects types outside the 0.8.0 catalog, and
  the schematics read only catalog types.
- **Application-scope attributes**: met. The attributes read on `Routing`,
  `Route`, `Navigation`, `NavItem`, `NavGroup`, `ToolBar`, `ToolAction`, `html`,
  and `link` are 0.8.0 catalog attributes, read with their declared value
  types. The validator checks those types and resolves their references.
- **Other attributes**: not met. The 0.8.0 catalog defines no Uses attributes
  for these instance types, so the attributes the schematics read on them are
  repository-local extensions:
  - `Form` `uses.title` and `uses.action` (`behaves.submit`, `behaves.validate`,
    and `produces.dirtyChange` are catalog attributes);
  - `ActionControls` `uses.label`;
  - the control attributes on `TextInputs` and `RangeControl` (`uses.type`,
    `uses.name`, `uses.label`, validation, and appearance attributes);
  - `SurfaceContainers` `uses.title` and `OverlayContainers` `uses.label`;
  - the composition attribute `uses.slot`;
  - the `DashboardPage` and `EmptyPage` heading `uses.title` (their path,
    access, label, and icon are read from `Route` and `NavItem`, which own
    them);
  - the `Presentation` tokens (`uses.theme`, `uses.typography`,
    `uses.animations`);
  - `uses.data` (`data-service`) and its `<apiPath>#<ApiService>` value format.
- **Value interpretation**: an `angular-django2` decision, aligned with the
  specification's typed attributes (0.6.0). A `uses.*` string is a quoted
  literal; an unquoted string is a binding expression, which the schematics
  reject because they generate static code. Booleans and numbers are JSON
  values, references are quoted element ids, and `behaves.*` values are
  unquoted expressions. See the
  [mapping document](ngdj-openui-spec-mapping.md), section 1.3.

Points the specification leaves open, and the interpretation used meanwhile,
are listed in the [mapping document](ngdj-openui-spec-mapping.md), section 8.

### 1.4 Parser ownership and integration status

- **`openui-spec` owns** the grammar, JSON Schema (`openui.schema.json`),
  vocabulary catalog (`openui.json`), and the TypeScript parser, validator, and
  AST types (`OpenUiJson`, `OpenUiDocument`, `OpenUiElement`). The TypeScript
  package was delivered by
  [openui-spec#135](https://github.com/shlomoa/openui-spec/issues/135)
  (closed).
- **Utility support (Implemented)**: `readOpenUiDocument()` and
  `validateOpenUiDocument()` in `schematics/utility/openui.ts` load documents
  and validate them with the canonical validator, and
  `schematics/utility/ast-compiler.ts` resolves and reads nodes. Tests:
  `schematics.openui.spec.ts` (`TC-OPENUI-01…12`) and `ast-compiler.spec.ts`.
- **Production schematic integration (Implemented)**: the schematics listed in
  §1.2 consume the validated AST. Tests: see the mapping document.
- **Integration history** (all closed or merged):
  - [#98](https://github.com/shlomoa/angular-django2/issues/98): parser and
    validator integration epic.
  - [#101](https://github.com/shlomoa/angular-django2/issues/101): integration
    of the `@shlomoa/openui-spec` npm package.
  - [#103](https://github.com/shlomoa/angular-django2/issues/103): schematics
    pipeline integration.
  - [#104](https://github.com/shlomoa/angular-django2/issues/104): openui-spec
    0.2.0 integration.
  - [#131](https://github.com/shlomoa/angular-django2/pull/131): openui-spec
    0.3.0 integration.
  - [#129](https://github.com/shlomoa/angular-django2/issues/129) /
    [#132](https://github.com/shlomoa/angular-django2/pull/132): `ToolBar`
    compilation.
  - [openui-spec#152](https://github.com/shlomoa/openui-spec/issues/152):
    application routing, navigation, and toolbar contracts (in 0.3.0).

### 1.5 Known limitations of application compilation

These are current behavior, documented by maintainer decision rather than fixed:

- `application --document` does not read `Navigation` or `Routing` content;
  only `material-app` does. The validator still checks the declared value types
  and references of the whole document for every schematic.
- Some accepted attributes are validated but not used: `Route` `uses.title`,
  `Routing` `uses.defaultRoute`, `Route` `uses.redirectTo`, `Navigation` `uses.ariaLabel`, and
  `NavGroup` `uses.expanded`. `NavGroup` entries are flattened, and its `uses.label` is
  not rendered. `Route` `uses.access` is read by `page` only.
- `Route` `uses.target` is an untyped `reference` in the catalog: the validator checks that it names an element, not which kind.
- A page is registered under one route path, so a page that several `Route`
  elements target is rejected.

Routing has a single source. OpenUI makes `Route` the sole owner of a route path
and access requirement and `NavItem` the sole owner of a navigation label and
icon, and pages content-only. `page` and `material-app` both read the full path
of a `Route` (its `uses.path` joined to the `uses.path` of every `Route` above it), so
a registered route and its sidenav link cannot disagree.

---

## 2. Target Pipeline: Three-Layer Compiler Architecture

This section describes the **target** pipeline. Parts of it exist today (see
the notes after the diagram); the scopes in §3 do not.

```mermaid
graph TD
    subgraph Input["Input Boundary"]
        DOC["OpenUI JSON Document (app.openui.json)"]
        PARSER["Canonical TypeScript Parser & Validator (@shlomoa/openui-spec 0.8.0)"]
        DOC --> PARSER
    end

    subgraph Compiler["angular-django2 Three-Layer Compiler (target)"]
        direction TB
        AST["Validated OpenUiDocument AST"]
        PARSER --> AST

        subgraph Layer3["Layer 3: ngdj Specifics (Full-Stack Django & Signals)"]
            L3_1["OpenUI Attribute Bindings: uses.data, uses.loading, uses.error, behaves.sort, behaves.filter, behaves.paginate"]
            L3_2["Django REST Framework (DRF) Integration: { count, next, previous, results }"]
            L3_3["Integration with ngdj:data-service & OpenAPI Client"]
            L3_4["CSRF Cookie Injection & Django Template View Adapters"]
        end

        subgraph Layer2["Layer 2: Angular Material & CDK (Design System Primitives)"]
            L2_1["MDC-Based Material 3 Tokens & Theming"]
            L2_2["Automated @angular/material Schematics (@angular/material:table, navigation, tree)"]
            L2_3["Curated material.angular.dev Example Templates (MatDialog, MatStepper, MatTabs)"]
            L2_4["Angular CDK Primitives (BreakpointObserver, Overlay, A11y FocusTrap)"]
        end

        subgraph Layer1["Layer 1: HTML5 + JavaScript (Web Standards Baseline)"]
            L1_1["Semantic Markup: &lt;table&gt;, &lt;dialog&gt;, &lt;details&gt;, &lt;form&gt;, &lt;nav&gt;"]
            L1_2["W3C WAI-ARIA Semantics: role='table', 'row', 'columnheader', 'cell'"]
            L1_3["Native Web APIs: CSS Grid, Flexbox, Sticky Headers, PointerEvents"]
            L1_4["Keyboard Trapping & Standard Focus Traversal"]
        end

        AST --> Layer3
        Layer3 --> Layer2
        Layer2 --> Layer1
    end

    subgraph Output["Output: Standalone Angular Workspace Files"]
        FILES["*.component.ts (Standalone, OnPush)<br/>*.component.html (HTML5 + Material)<br/>*.component.scss (M3 Tokens)<br/>*.component.spec.ts (Vitest Suite)"]
        Layer1 --> FILES
        Layer2 --> FILES
        Layer3 --> FILES
    end
```

What exists today:

- **Layers 1 and 2** for the implemented schematics: forms and controls,
  surface and overlay containers, pages, and the Material application layout
  (toolbar, sidenav, router outlet).
- **Layer 3**, in part: `openapi-setup` generates Django CSRF, credential, and
  auth transport helpers; `data-service` generates data services with a DRF
  `results` / `count` response adapter; `page` registers auth guards.
- **Not implemented**: the table attribute bindings (`uses.data`, `uses.loading`,
  `uses.error`, `behaves.sort`, `behaves.filter`, `behaves.paginate`), invoking
  `@angular/material` schematics, and Django template view adapters.

### Layer 1: HTML5 + JavaScript (Web Standards Baseline)

- **Role**: native browser foundation providing standards-compliant semantic
  elements, accessibility, and baseline layout.
- **Key elements**:
  - Semantic HTML tags: `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`,
    `<dialog>`, `<details>`, `<summary>`, `<nav>`, `<form>`.
  - W3C WAI-ARIA patterns: `role="table"`, `role="row"`,
    `role="columnheader"`, `role="cell"`, `aria-sort`, `aria-expanded`,
    `aria-modal`.
  - Native Web APIs: CSS Grid and Flexbox for structural layout, CSS sticky
    positioning for headers, native keyboard event handling, and focus
    management.

### Layer 2: Angular Material (Design System Primitives & Material 3 Templates)

- **Role**: Material 3 visual styling, component primitives, and CDK behavioral
  plumbing.
- **Acquisition strategies (target)**:
  1. **Automated `ng generate` scaffolding**: where `@angular/material` provides
     official CLI schematics (for example `@angular/material:table`,
     `@angular/material:navigation`, `@angular/material:address-form`), `ngdj`
     runs them through DevKit `externalSchematic` and applies standalone,
     OnPush, and signal post-processing.
  2. **Curated template extraction**: where richer widgets are needed (for
     example `MatDialog` workflows, `MatStepper` wizards, `MatTabs` groups,
     `MatExpansionPanel` panels), canonical Material 3 examples from
     `material.angular.dev` / `@angular/components` are parameterized into
     templates under `projects/angular-django2/schematics/*/templates.ts`.
- **Angular CDK**: `@angular/cdk/layout` (`BreakpointObserver`),
  `@angular/cdk/overlay`, `@angular/cdk/a11y` (`FocusTrap`, `LiveAnnouncer`).

### Layer 3: `ngdj` Specifics (Composites & Django Full-Stack Integration)

- **Role**: binding OpenUI attributes to Angular signals, connecting UI
  components to Django backends, and enforcing standalone `OnPush`
  architectures.
- **Capabilities (target)**:
  - **OpenUI attribute mapping**: binding `uses.data`, `uses.loading`, `uses.error`,
    `behaves.sort`, `behaves.filter`, `behaves.paginate`, and `produces.selectionChange` to typed Angular
    signals (`input()`, `output()`, `computed()`).
  - **Django REST Framework (DRF) bridge**: standard DRF pagination responses
    (`{ count: number, next: string | null, previous: string | null, results: T[] }`),
    query parameters (`?limit=20&offset=40` or `?page=2&page_size=20`), and
    ordering parameters (`?ordering=-created_at`).
  - **Data service integration**: direct binding with `ngdj:data-service` to
    consume OpenAPI-generated client endpoints.
  - **Django security and auth**: CSRF cookie header injection (`X-CSRFToken`)
    and auth guard protection.

---

## 3. Scope Implementation Matrix (Planned)

Every row is **Planned**. Scope paths are canonical OpenUI 0.8.0
`<category>/<id>` paths. The schematic names are proposed Angular / Material
names, not OpenUI identifiers; for example, `accordion` does not appear in the
OpenUI catalog, whose scope is `containers/expandablePanels` (an accordion or a
disclosure).

| OpenUI scope                  | Status  | Proposed schematic | Layer 1 building blocks                                                   | Layer 2 building blocks                           | Layer 3 `ngdj` specifics                                                 |
| :---------------------------- | :------ | :----------------- | :------------------------------------------------------------------------ | :------------------------------------------------ | :----------------------------------------------------------------------- |
| `widgets/table`               | Planned | `table`            | `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`, ARIA table roles | `MatTable`, `MatSort`, `MatPaginator`             | DRF pagination adapter, search/filter query sync, `data-service` binding |
| `widgets/dataGrid`            | Planned | `data-grid`        | ARIA grid pattern, keyboard cell navigation                               | CDK Table, virtual scroll                         | Editable cells, multi-select, DRF batch updates                          |
| `widgets/dialog`              | Planned | `dialog`           | Native `<dialog>`, focus trap                                             | `MatDialogModule`, CDK A11y                       | Strongly typed launch service, Django CRUD submit integration            |
| `widgets/stepper`             | Planned | `stepper`          | Form validation events                                                    | `MatStepperModule`, `MatStep`                     | Multi-step `reactive-form` binding, draft state persistence              |
| `containers/tabs`             | Planned | `tabs`             | ARIA tablist/tabpanel                                                     | `MatTabsModule`, CDK Portal                       | Lazy-loaded tab bodies via `embed-component`                             |
| `containers/expandablePanels` | Planned | `accordion`        | `<details>/<summary>`, ARIA accordion                                     | `MatExpansionModule`                              | Multi/single expand mode, `embed-component` child slots                  |
| `containers/sheetContainers`  | Planned | `bottom-sheet`     | CSS backdrop, touch drag                                                  | `MatBottomSheetModule`, CDK Overlay               | Dismiss gestures, mobile action sheet layout                             |
| `widgets/menuWidgets`         | Planned | `menu`             | ARIA menu/menuitem, keyboard navigation                                   | `MatMenuModule`, `MatMenuTrigger`                 | Context menus, nested cascading menus, route-link integration            |
| `widgets/feedbackWidgets`     | Planned | `feedback`         | Live regions (`aria-live`)                                                | `MatSnackBarModule`, CDK LiveAnnouncer            | Django messages framework adapter, HTTP error interceptor                |
| `widgets/dateTimePickers`     | Planned | `date-picker`      | Native `<input type="date">`                                              | `MatDatepickerModule`, `provideNativeDateAdapter` | Date range support, Django ISO-8601 formatting                           |
| `widgets/chart`               | Planned | `chart`            | SVG primitives, Canvas API                                                | Angular chart adapter (SVG/CDK)                   | DRF aggregation API data binding, responsive resizing                    |

**Modality is a behavior in 0.8.0.** `containers/overlayContainers` now covers
popovers only. Modal focus and dismissal come from `behaviors/modalOverlay`,
background scroll locking from `behaviors/viewportAndFocusControl`, and the
backdrop from `presentation`. `widgets/dialog` follows `behaviors/modalOverlay`
for modal focus and dismissal, and `containers/sheetContainers` treats edge
placement, navigation content, and modality as independent. The `dialog` and
`bottom-sheet` rows therefore depend on those behaviors, which have no schematic
and no plan (see the [mapping document](ngdj-openui-spec-mapping.md), Missing).

---

## 4. First Focus: `widgets/table` (Planned)

`table` is a single specification concept under `widgets/`. The former
`Controls/Table/` scope was retired; `spec/scopes/Controls/` in 0.8.0 has no
table scope.

### Specification facts (OpenUI v0.8.0)

- **Identity**: scope `id: table`, scope `type: Table`. The instance element is
  `type: table`, with `tr` row children (`tableRow`).
- **Normative attributes**, from
  [`scopes/Widgets/table.scope.md`](https://github.com/shlomoa/openui-spec/blob/v0.8.0/spec/scopes/Widgets/table.scope.md):
  only `behaves.sort`, `behaves.filter`, and `behaves.paginate`, all in the Behaves category. The
  0.8.0 Purpose also names columns, cells, a caption, and header associations,
  but the Child model still defines only `tr` rows, so those are not part of the
  contract yet.
- **Worked example**:
  [`examples/Widgets/table.example.json`](https://github.com/shlomoa/openui-spec/blob/v0.8.0/spec/examples/Widgets/table.example.json)
  uses exactly this contract: a `table` with `behaves.sort`, `behaves.filter`, and
  `behaves.paginate` and `tr` rows. In 0.3.0 the example used attributes and child
  types outside the contract; 0.3.1 fixed it
  ([openui-spec#154](https://github.com/shlomoa/openui-spec/issues/154)).
- **Not in the contract**: data binding (`uses.data`, `uses.selection`, `uses.loading`,
  `uses.error`, `produces.selectionChange`), column definitions, pagination, and empty
  state. The catalog has no `Column`, `Pagination`, or `EmptyState` type. Before
  `ngdj:table` depends on any of these, they must become part of the
  `openui-spec` contract (§1.3).

### Three-layer structure of `ngdj:table` (Planned)

1. **Layer 1**: semantic `<table>` with `role="table"`, a responsive horizontal
   scroll container, and a sticky `<th>` header row.
2. **Layer 2**: Angular Material `mat-table` with `MatSortModule`
   (`mat-sort-header`) and `MatPaginatorModule` (`mat-paginator`).
3. **Layer 3**: strongly typed standalone OnPush component wired to
   `ngdj:data-service` and DRF pagination conventions.

---

## 5. Roadmap

### Completed (Implemented)

- [x] Consume the canonical TypeScript parser, validator, and AST types from
      `@shlomoa/openui-spec` (§1.4).
- [x] Compile OpenUI nodes in the existing schematics (§1.2). Contracts and
      test IDs: [`ngdj-openui-spec-mapping.md`](ngdj-openui-spec-mapping.md).
- [x] Integrate openui-spec 0.3.0, including `Routing` / `Navigation`
      compilation in `material-app`
      ([#131](https://github.com/shlomoa/angular-django2/pull/131)).
- [x] Move to openui-spec 0.3.1 (`2125108`). Its catalog is identical to 0.3.0;
      it fixes the table example.
- [x] Integrate openui-spec 0.4.0. The only catalog attribute change is
      `[target]` (the 0.4.0 notation) on the six Behaviors, which no schematic
      reads. The catalog adds `InputAssistance`, `ModalOverlay`, and
      `ViewportAndFocusControl` and no longer contains the types `page`, `view`,
      `container`, and `widget`, which no repository document uses. Terminology
      is aligned with the OpenUI glossary; see the
      [mapping document](ngdj-openui-spec-mapping.md), section 7.
- [x] Take page routing from `Route` and `NavItem`, as the OpenUI application
      contract assigns it. A `DashboardPage` or `EmptyPage` no longer carries
      `uses.route`, `uses.access`, `uses.icon`, or `uses.authGuard` (a breaking change to
      documents); `page --document` reads the path and access from the `Route`
      that targets the page and the label and icon from the `NavItem` that
      presents it, and `uses.title` remains the page heading. `page` and
      `material-app` share one route resolver that also composes nested
      `Route` paths (tests `TC-APP-18…20`).
- [x] Compile `ToolBar` content
      ([#129](https://github.com/shlomoa/angular-django2/issues/129),
      [#132](https://github.com/shlomoa/angular-django2/pull/132); tests
      `TC-APP-15…17` in `schematics.openui-app.spec.ts`).
- [x] Integrate openui-spec 0.8.0 (the changes of 0.5.0 to 0.8.0), a breaking
      change to every document:
  - **Typed attributes (0.6.0)**: keys are `uses.<name>`, `behaves.<name>`, and
    `produces.<name>` instead of `[name]` and `(name)`; values are typed, with
    strings as quoted literals. Every schematic, fixture, example, and CLI page
    moved to the new form.
  - **Validator (0.6.0)**: documents pass the grammar, document, catalog, and
    contract stages. `version` must equal `0.8.0`, and declared value types and
    references are checked by the validator, so the schematics' own
    unknown-target checks were removed.
  - **Terminology and scope (0.5.0, 0.7.0, 0.8.0)**: no known object type or
    attribute changed. Glossary, taxonomy, and scope text moved; the
    [mapping document](ngdj-openui-spec-mapping.md) tracks the terms and
    lists, in section 8, the points the specification leaves open.
  - **Validation**: a data-driven fixture suite of valid and invalid documents
    with their expected diagnostics, and example documents that the tests
    validate and compile, so the CLI pages cannot drift from the code.

### Planned

None of these items has a tracking issue yet.

- **Data presentation and dialogs**:
  - [ ] `table` (`widgets/table`)
  - [ ] `dialog` (`widgets/dialog`)
  - [ ] `stepper` (`widgets/stepper`)
- **Containers and navigation**:
  - [ ] `tabs` (`containers/tabs`)
  - [ ] `accordion` (`containers/expandablePanels`)
  - [ ] `menu` (`widgets/menuWidgets`)
  - [ ] `bottom-sheet` (`containers/sheetContainers`)
- **Pickers, feedback, and specialized widgets**:
  - [ ] `date-picker` (`widgets/dateTimePickers`)
  - [ ] `feedback` (`widgets/feedbackWidgets`)
  - [ ] `data-grid` (`widgets/dataGrid`)
  - [ ] `chart` (`widgets/chart`)
- **For each new schematic**:
  - [ ] Vitest unit tests in `projects/angular-django-validation/unit/schematics/`.
  - [ ] A demonstration page in `projects/angular-django2-reference`.
  - [ ] A mapping entry in [`ngdj-openui-spec-mapping.md`](ngdj-openui-spec-mapping.md).
  - [ ] Passing `npm run test:node` and `npm run test:e2e`.
