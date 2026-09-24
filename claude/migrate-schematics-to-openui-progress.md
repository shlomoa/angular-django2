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
| 5     | Master `compile` schematic                              | Next   | #127        |
| 6     | Deprecation and legacy adapter                          | —      |             |
| 7     | Verification and documentation alignment                | —      |             |

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
