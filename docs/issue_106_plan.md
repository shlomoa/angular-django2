# Execution Plan: Review and Refresh OpenUI Implementation Plan and Mapping Documentation

This plan outlines the detailed, enumerated execution steps to address [Issue #106: Review and refresh OpenUI implementation plan and mapping documentation](https://github.com/shlomoa/angular-django2/issues/106) in accordance with repository instructions in [.github/copilot-instructions.md](../.github/copilot-instructions.md) and the external Single Source of Truth (SSOT).

---

## 1. Audit Summary and Key Findings

An audit of the repository, related GitHub issues ([#27](https://github.com/shlomoa/angular-django2/issues/27), [#98](https://github.com/shlomoa/angular-django2/issues/98), [#101](https://github.com/shlomoa/angular-django2/issues/101), [#103](https://github.com/shlomoa/angular-django2/issues/103), [#104](https://github.com/shlomoa/angular-django2/issues/104)), and upstream specification artifacts (`spec/openui.json` and `spec/openui.schema.json` at 0.2.0) revealed the following findings and discrepancies to resolve:

1. **Parser & Package State vs. Production Schematic Usage**:
   - `package.json` and `projects/angular-django2/package.json` depend on `@shlomoa/openui-spec: "^0.2.0"`.
   - The parsing and validation utility `readOpenUiDocument()` is implemented in `projects/angular-django2/schematics/utility/openui.ts` and validated via Vitest unit tests in `projects/angular-django-validation/unit/schematics/schematics.openui.spec.ts`.
   - **Crucial gap**: No production schematic in `projects/angular-django2/schematics` currently invokes `readOpenUiDocument()` or accepts an OpenUI AST document as input. Schematics integration is tracked under [#103](https://github.com/shlomoa/angular-django2/issues/103). The current documentation erroneously presents compiler behavior as active.
2. **Cross-Repository Ownership Boundary ([#27](https://github.com/shlomoa/angular-django2/issues/27))**:
   - `openui-spec` owns the canonical vocabulary catalog, JSON Schema, and parser library.
   - `django-angular3` (`djng`) owns Django-side artifact selection, canonical OpenUI-to-schematic mapping, wrappers, orchestration, stage gating, and final generated-app acceptance.
   - `angular-django2` (`ngdj`) owns its public schematic contracts, deterministic code generation, and test suites. Applications are assembled explicitly using supported schematics (e.g., `material-app`, `page`).
   - The documentation must not conflate `djng` orchestration with `ngdj` schematic execution.
3. **Classification of Mappings in `docs/ngdj-openui-spec-mapping.md`**:
   - The document currently groups 20 concepts under "Active Functional Mappings" marked as "Equal". In reality, existing schematics (such as `reactive-form`, `component`, `page`) accept CLI arguments or isolated local JSON contracts (e.g., `definitions/reactiveFormDefinition`), not OpenUI AST documents.
   - These must be reclassified accurately into distinct categories (Active Ingestion Utility, Indirect/Conceptual Schematics, Planned Direct Schematics, and Missing).
   - Inconsistency: `dialog` was listed both as an active mapping (under `complex-component`) and as missing in Section 3.
4. **Vocabulary, Casing, and Terminology Drift (OpenUI 0.2.0)**:
   - Scopes in `openui-spec` 0.2.0 use camelCase IDs and singular names for several widgets and controls:
     - `widgets/chart` (`id: chart`, `type: Chart`) — previously misnamed `charts`
     - `widgets/list` (`id: list`, `type: List`) — previously misnamed `lists`
     - `widgets/dataGrid` (`id: dataGrid`, `type: DataGrid`) — previously misnamed `data_grid`
     - `views/form` (`id: form`, `type: Form`) — previously misnamed `forms`
     - `views/report` (`id: report`, `type: Report`) — previously misnamed `reports`
     - `controls/pickerControl` (`id: pickerControl`, `type: PickerControl`) — previously misnamed `pickerControls`
     - `controls/rangeControl` (`id: rangeControl`, `type: RangeControl`) — previously misnamed `rangeControls`
     - `controls/statusIndicator` (`id: statusIndicator`, `type: StatusIndicator`) — previously misnamed `statusIndicators`
     - `containers/expandablePanels` — previously misnamed `expandable_panels`
     - `containers/sheetContainers` — previously misnamed `sheet_containers`
     - `widgets/dateTimePickers` lives under `widgets/`, not `controls/`
   - Diagram reference to `@openui/spec` is incorrect; the published package is `@shlomoa/openui-spec`.

---

## 2. Detailed Enumerated Execution Plan

### Phase 1: Environment & Baseline Verification

1. **Verify Workspace State & Dependencies**:
   - Verify that all project dependencies and CLI tools (`prettier`, `vitest`) are available.
   - Execute formatting check (`npm run format:check` or `npx prettier --check .`) to establish a clean baseline.
   - Execute node/schematics unit tests (`npm run test:node`) to verify the baseline pass rate for existing tests, including `projects/angular-django-validation/unit/schematics/schematics.openui.spec.ts`.

---

### Phase 2: Refresh `docs/openui-spec-implementation-plan.md`

1. **Clarify Compiler Vision vs. Current Execution Boundary (§1)**:
   - Update Section 1 to clearly delineate between the forward-looking "Option A (Document-Driven JSON-First Compiler)" target and the current operational boundary defined in [#27](https://github.com/shlomoa/angular-django2/issues/27).
   - State explicitly that `angular-django2` today provides public schematics driven by CLI options and schematic-specific schemas, while direct OpenUI AST document compilation is a planned schematic capability.
2. **Correct Package References and Parser Integration Status (§1.3 & §2)**:
   - Replace obsolete package placeholder `@openui/spec` with the authoritative package `@shlomoa/openui-spec` (0.2.0).
   - Update Section 1.3 to reflect that parser ingestion and validation utility integration is complete ([#98](https://github.com/shlomoa/angular-django2/issues/98), [#101](https://github.com/shlomoa/angular-django2/issues/101), [#104](https://github.com/shlomoa/angular-django2/issues/104)) via `readOpenUiDocument()`.
   - Explicitly document that production schematics integration is pending and tracked in [#103](https://github.com/shlomoa/angular-django2/issues/103).
3. **Update Architectural Diagram and Three-Layer Clarifications (§2)**:
   - Update the Mermaid diagram to cite `@shlomoa/openui-spec` and clarify that the diagram depicts the target pipeline for schematics consuming OpenUI documents.
   - Refine layer descriptions to align with current standalone, Signal-based, and zero-DOM `<ng-container>` conventions established in 0.5.0.
4. **Realign the Scope Implementation Matrix (§3)**:
   - Correct all scope IDs and casing to match canonical OpenUI 0.2.0:
     - `Widgets/dataGrid` (`id: dataGrid`)
     - `Widgets/chart` (`id: chart`)
     - `Containers/expandablePanels` (`id: expandablePanels`)
     - `Containers/sheetContainers` (`id: sheetContainers`)
     - `Widgets/menuWidgets` (`id: menuWidgets`)
     - `Widgets/feedbackWidgets` (`id: feedbackWidgets`)
     - `Widgets/dateTimePickers` (`id: dateTimePickers`)
   - Clearly mark all targets in this matrix as planned/future schematics.
5. **Update Section 4 (Unified `table` Focus)**:
   - Affirm alignment with canonical `widgets/table` (`id: table`, `type: Table`) and state that implementation as a dedicated public schematic is planned.
6. **Refresh Phased Implementation Roadmap (§5)**:
   - Mark completed items: Ingest/consume canonical OpenUI TypeScript AST types from `@shlomoa/openui-spec` (completed in [#101](https://github.com/shlomoa/angular-django2/issues/101), [#104](https://github.com/shlomoa/angular-django2/issues/104)) and document parser unit tests in `projects/angular-django-validation/unit/schematics/schematics.openui.spec.ts`.
   - Update pending items with links to tracking issues: Schematics integration ([#103](https://github.com/shlomoa/angular-django2/issues/103)), Application assembly orchestration ([#27](https://github.com/shlomoa/angular-django2/issues/27)), and subsequent component generators.

---

### Phase 3: Refresh `docs/ngdj-openui-spec-mapping.md`

1. **Re-Architect Mapping Structure for Truthful Classification**:
   - Restructure mapping sections so that no planned or indirect behavior is claimed as an active 1:1 functional compiler mapping:
     - **Section 1: Active Ingestion & Validation Utility**: Document `readOpenUiDocument()` backed by `@shlomoa/openui-spec` 0.2.0, with test evidence in `schematics.openui.spec.ts`.
     - **Section 2: Conceptual and Primitive Correspondence (Supported Schematics)**: Map supported schematics (`application`, `material-app`, `page`, `component`, `embed-component`, `complex-component`, `form-field`, `field-component`, `reactive-form`, `material-setup`, `data-service`) to their corresponding OpenUI concepts, explicitly stating their actual input contracts (CLI options, local schemas) and that they do not parse OpenUI documents.
     - **Section 3: Planned Direct OpenUI Schematics**: List components where direct OpenUI AST compilation is planned (`table`, `dialog`, `stepper`, `tabs`, `accordion`, `menu`, etc.).
     - **Section 4: Infrastructure & Angular Tooling Schematics (Missing in OpenUI)**: Retain `ng-add`, `workspace-setup`, `project-structure`, `openapi-setup`, `service`, `class`.
     - **Section 5: Canonical OpenUI Scopes Missing in `angular-django2`**: Audit all 0.2.0 catalog scopes that have neither dedicated schematics nor primitive coverage.
2. **Reconcile Table Data and Fix Contradictions**:
   - Resolve the `dialog` conflict: classify `complex-component` projection/overlay as an indirect primitive, while noting a dedicated `MatDialog` schematic is planned and currently missing.
   - Reclassify `reactive-form` vs. OpenUI `form`: clarify that `reactive-form` is driven by `reactiveFormDefinition`, not an OpenUI AST.
   - Reclassify `data-service` vs. OpenUI `report`: clarify that `data-service` provides data transport for OpenAPI client endpoints, not UI report rendering.
3. **Harmonize 0.2.0 Vocabulary, Casing, and Hierarchy**:
   - Update all table rows and text to use exact canonical 0.2.0 names (`form`, `report`, `chart`, `list`, `dataGrid`, `expandablePanels`, `sheetContainers`, `pickerControl`, `rangeControl`, `statusIndicator`).
4. **Update Section 6 (formerly Section 4) on Naming Conventions**:
   - Rewrite the explanation of singular vs. plural naming conventions to reflect the actual 0.2.0 catalog state where discrete widgets (`chart`, `list`, `table`, `dialog`, `stepper`, `dataGrid`) and views (`form`, `report`) use singular names, while category container/control families (`textInputs`, `choiceControls`, `tabs`, `expandablePanels`, `feedbackWidgets`) use plural/grouped names.
5. **Incorporate Cross-Repository Architecture & Issue References**:
   - Link to [#27](https://github.com/shlomoa/angular-django2/issues/27), [#98](https://github.com/shlomoa/angular-django2/issues/98), [#101](https://github.com/shlomoa/angular-django2/issues/101), [#103](https://github.com/shlomoa/angular-django2/issues/103), and [#104](https://github.com/shlomoa/angular-django2/issues/104).

---

### Phase 4: Cross-Document Validation and Verification

1. **Internal and External Link Validation**:
   - Ensure all relative document links (`openui-spec-implementation-plan.md` <-> `ngdj-openui-spec-mapping.md`) and GitHub repository links are valid.
2. **Mutual Consistency Check**:
   - Ensure terms, package names, version references (0.2.0), status definitions, and roadmap milestones match 100% between the two documents.
3. **Documentation Build & Formatting Verification**:
   - Update `mkdocs.yml` `exclude_docs` if needed to ensure strict documentation builds succeed.
   - Run formatting check with `npx prettier --check docs/openui-spec-implementation-plan.md docs/ngdj-openui-spec-mapping.md docs/issue_106_plan.md`.
4. **Review Against Issue #106 Acceptance Criteria**:
   - Confirm neither document describes planned behavior as implemented.
   - Confirm parser ingestion status accurately distinguishes parsing/validation utility support from production schematic integration.
   - Confirm all mappings reflect executable evidence.
   - Confirm all OpenUI vocabulary conforms strictly to 0.2.0.
   - Confirm OpenUI-to-construction-input ownership boundary aligns with [#27](https://github.com/shlomoa/angular-django2/issues/27).
