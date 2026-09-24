# Schematics → OpenUI migration: progress

Working log for [`docs/migrate_schematics_to_openui_plan.md`](../docs/migrate_schematics_to_openui_plan.md).
The plan doc holds the checkboxes and per-phase implementation notes; this file
holds status, standing decisions, and environment notes.

> This file was created at the start of Phase 3. The earlier project doc
> referenced by the maintainer was not present in the repository, so Phases 1–2
> are summarized from the plan doc and PR #126.

## Status

| Phase | Scope                                                   | Status | PR / commit |
| :---- | :------------------------------------------------------ | :----- | :---------- |
| 1     | Shared AST compiler infrastructure                      | Done   | #126        |
| 2     | `reactive-form`, `form-field`, `field-component`        | Done   | #126        |
| 3     | `component`, `complex-component`, `embed-component`     | Done   | #127        |
| 4     | `page`, `material-app`, `application`, `app-shell`, ... | Done   | #127        |
| 5     | Validation-only master document compiler                | Done   | #127        |
| 6     | Deprecation and legacy adapter                          | Done   | #127        |
| 7     | Verification and documentation alignment                | Done   | #127        |

Branch: `shlomoa/migrate_schematics_to_openui_phase3` (PR #127, against `main`).

## Standing decisions (maintainer)

- Attributes use the OpenUI catalog style: `[input]` for inputs, `(event)` for
  events. Values are strings.
- `dashboard`, `emptyPage`, and `shellPage` are `pages/` scopes; `accordion` is
  an alias of `containers/expandablePanels`.
- Phase 3 embedding: each child node compiles into its own component and is
  inserted into the parent in document order, reusing `embed-component` logic.
  A child chooses a named projection slot with `[slot]` (`header` | `content` |
  `actions`); otherwise it goes in `content`.

- Phase 4 vocabulary (asked 2026-09-24): page nodes carry `[title]`, `[route]`,
  `[icon]`, `[access]`, `[authGuard]`; theme tokens come from a `Presentation`
  child of `Application` (`[theme]`, `[typography]`, `[animations]`);
  `[data]="<apiPath>#<ApiService>"` drives `data-service`; `IndexHtml`
  `[lang]`/`[dir]`/`[title]` and `Favicon` `[href]` drive `workspace-setup`.

- Phase 6 (2026-09-24): no migration utility; `reactiveFormDefinition` files
  exist only in angular-django2 and django-angular3. The `--definition`
  warning prints the equivalent OpenUI `Form` node instead.

Low-ambiguity decisions taken during each phase are recorded in the plan doc's
"Phase N implementation notes".

## Way of working

Each phase ends with code, unit tests, the plan doc updated, the full check
suite (`npm run format:check`, `lint`, `build`, `test:ci`, `pack:dry-run`), a
commit, a confirmed push, and a browser demo with a screenshot.

## Environment notes

- The container's Node (22.22.2) is too old for the Angular CLI. Install Node 24
  outside the repo (`npm i node@24` in a scratch directory) and put its
  `node_modules/.bin` first on `PATH`. npm stays at 10.x; `npm ci` still works
  (engine warning only).
- `fonts.googleapis.com` is blocked: turn off `optimization.fonts` for demo
  builds.
- Playwright's bundled headless shell is missing; launch Chromium with
  `executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`.
- Demo workspaces borrow the repo's `node_modules` through symlinks. Schematics
  that schedule `npm install` (Angular's `application`, so `material-app`)
  would then write into the repo's `node_modules`: run them with
  `npm_config_dry_run=true`. `ng new` refuses to run here; create the empty
  workspace with the `@schematics/angular:workspace` schematic instead, and link
  `node_modules/angular-django2` to `projects/angular-django2/dist`.
- Unit specs run against `projects/angular-django2/dist`, so run
  `npm run build` before `npm run test:node`.

## Phase 3 log

- New: `component/ast.ts` (surface container compiler and child dispatcher),
  `component/generate.ts` (legacy generator, moved), `embed-component/compose.ts`
  (composition engine), `embed-component --slot`, `complex-component --document`,
  `reactive-form` `compileNestedFormFromAst`.
- Tests: `projects/angular-django-validation/unit/schematics/schematics.composition.spec.ts`
  (TC-COMPOSE-01…11).
- Checks: format, lint, build, test:ci (224 node + 50 reference-app tests),
  pack:dry-run all pass.
- Demo: a scratch Angular 22 workspace generated from a `profileCard` OpenUI
  document with `complex-component --document` (Card → header summary,
  Form → Email/Age controls, actions Nickname field, overlay details), built
  with strict templates and rendered in Chromium with no console errors.

## Phase 4 log

- New: `page/ast.ts`, `application/ast.ts`, `data-service/ast.ts`;
  `--document` / `--nodeId` on `page`, `application`, `material-app`,
  `data-service`; `--document` on `workspace-setup`.
- `[data]` path semantics: `<apiPath>` is the generated `services` module
  (like `--apiPath`), e.g. `src/app/api/services#UsersApiService`, not a
  service file; a file path would break the derived `strict-http-response`
  import.
- Tests: `schematics.openui-app.spec.ts` (TC-APP-01…13).

## Phase 5 log

- First implemented as a public `angular-django2:compile` schematic
  (`381f6c4`) without asking the maintainer: a new public API is a high-ambiguity
  decision and should have been raised first.
- Maintainer decision (2026-09-24): keep the compiler for validation only; no
  exposure to external packages and no traces in user-facing code,
  documentation, or configuration. It now lives in the private validation
  project as `compileOpenUiApplication`
  (`unit/integration/openui-application-compiler.ts`), and the public
  schematic, its CLI page, collection entry, README / REQUIREMENTS /
  INTEGRATION_TESTING / mkdocs entries, and the `workspace-setup` export were
  removed.
- Tests: `unit/integration/openui-application.integration.spec.ts`
  (INT-OPENUI-01…04).

## Phase 6 log

- `--definition` deprecated (non-breaking): `x-deprecated` on the option, a
  deprecation note on `definitions/reactiveFormDefinition`, and a warning that
  prints the equivalent Form node (`definitionDeprecationWarning`).
- Test: TC-REACTIVE-FORM-OPENUI-DEPRECATION (warning node round-trips to
  identical output; no warning with `--document`).
- Follow-up outside this repo: django-angular3 should switch its
  reactive-form calls to `--document`.

## Phase 7 log

- Docs: REQUIREMENTS OpenUI input contracts, mapping-doc AST coverage table
  (app-shell and material-setup are CLI-driven by design),
  implementation-plan milestone, CLI index OpenUI section, `--document`
  examples for application and workspace-setup, tutorial form moved to an
  OpenUI document.
- Tests: TC-REACTIVE-FORM-OPENUI-TUTORIAL (tutorial JSON compiles identically to
  the former definition); documentation spec updated.
- Checks: full suite plus `lint:validation` and strict MkDocs build (scratch
  venv from `docs/requirements.txt`).

## Open follow-ups

- django-angular3: switch reactive-form calls to `--document` before
  `--definition` is removed.

Not follow-ups of this plan:

- `app-shell` and `material-setup` need no `--document`: `app-shell` is a
  pass-through to Angular's SSR app-shell generator with nothing a node could
  describe, and `material-setup`'s options are exactly the `Presentation`
  tokens, which `material-app --document` already reads and passes on.
- The widget schematics (`table`, `dialog`,
  `stepper`, `tabs`, `accordion`) appear in this plan only as _(Planned)_ rows
  of the section 2 inventory; no phase step builds them. They are scheduled by
  `docs/openui-spec-implementation-plan.md` (its phases 1–2).
