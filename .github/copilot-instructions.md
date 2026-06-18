# Repo Instructions

## General instructions

The source of truth for the general instructions is [here](https://github.com/shlomoa/shlomoa/blob/main/.github/copilot-instructions.md).

Treat this file as the canonical repository-specific instruction file.
Keep `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` aligned with it.

Do not duplicate detailed product, runtime, schematic, testing, or release
inventories in this file when an existing repository document already owns that
information.

Expected instruction-file chain:

- `AGENTS.md` should only reference this file
- `CLAUDE.md` and `GEMINI.md` should only reference `AGENTS.md` and keep only model-specific notes

## angular django2 repo Repo Instructions

### Source Priority

When validating repository-specific facts, use sources in this order and stop
as soon as a higher-priority source answers the question:

1. **This repo — executable/configuration truth first**
   - `package.json`
   - `angular.json`
   - `projects/angular-django2/src/public-api.ts`
   - `projects/angular-django2/src/lib`
   - `projects/angular-django2/schematics`
   - `.github/workflows/publish.yml`
2. **This repo — maintained documentation**
   - `README.md`
   - `projects/angular-django2/README.md`
   - `docs/REQUIREMENTS.md`
   - `tests/README.md`
   - `docs/RELEASING.md`
3. **`django-angular3` repo** for Django-side workspace lifecycle or
   integration details not documented here
4. **Other `shlomoa` repos** only if the higher-priority sources are silent and
   the relationship is directly relevant
5. **Upstream framework/tool docs** such as Angular, Django, DRF, npm, or
   GitHub Actions for framework behavior, never to override verified local repo
   state

When sources conflict, prefer code/config over prose, and prefer higher-priority
sources over lower-priority ones.

### Documentation Map

Use the existing repository documents instead of restating their contents here:

- `README.md` — repository overview, runtime usage, schematic workflows, and
  local development commands
- `projects/angular-django2/README.md` — published package usage summary
- `docs/REQUIREMENTS.md` — product requirements, current runtime/schematic
  boundaries, and documentation expectations
- `tests/README.md` — general repository testing index
- `docs/INTEGRATION_TESTING.md` — canonical integration and end-to-end testing
  guide, including build prerequisites and temp-workspace caveats
- `docs/RELEASING.md` — release flow and publish workflow details

Instruction-file priority:

- `.github/copilot-instructions.md` — single source of truth for repository-specific AI agent instructions
- `AGENTS.md` — reference-only pointer to the canonical repository-specific guidance
- `CLAUDE.md` and `GEMINI.md` — model-specific companion files that should reference `AGENTS.md` and avoid duplicating shared repo guidance

### Working Agreement

- Prefer small, reviewable changes.
- Treat this as an Angular library package unless the user explicitly asks for an application.
- If the request is ambiguous between library scope and application scope, ask one clarifying question before generating code.
- Keep Django integration boundaries explicit: configuration, auth boundaries, CSRF naming, URL handling, and serialization behavior should be visible in code.
- Keep Django integration concerns explicit rather than hiding behavior behind package magic.
- Prefer clear TypeScript APIs, narrow public exports, and maintainable Angular patterns.
- Prefer standalone Angular patterns and provider functions; do not introduce NgModules for new package APIs.
- All public exports must go through `projects/angular-django2/src/public-api.ts`. Do not export internal helpers; mark internal symbols with `@internal`.
- Avoid generated-looking boilerplate that does not add package value.
- Move non-generic implementation inventories back into `README.md`,
  `projects/angular-django2/README.md`, `docs/REQUIREMENTS.md`,
  `tests/README.md`, or `docs/RELEASING.md` instead of expanding this file.

### Testing And Verification

Use root `package.json` scripts as the canonical verification command list.
Use `tests/README.md` for the general testing index and
`docs/INTEGRATION_TESTING.md` for integration/E2E command coverage,
build-before-run requirements, and temp-workspace caveats.

## Release And Publishing Notes

Use `docs/RELEASING.md` as the canonical release procedure and
`.github/workflows/publish.yml` as the executable source of truth for the
checked-in publish automation.

### Documentation Alignment

Keep these files aligned with the actual workspace state:

- `.github/copilot-instructions.md`
- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `README.md`
- `tests/README.md`
- `docs/INTEGRATION_TESTING.md`
- `projects/angular-django2/README.md`
- `docs/REQUIREMENTS.md`
- `docs/RELEASING.md`

### What To Optimize For

- Treat this as an Angular library package unless the user explicitly asks for an application.
- Keep changes small and reviewable.
- Prefer Angular.dev-style examples based on standalone providers and `provide*` APIs.
- Only report commands as successful if they were actually run.
- Do not fabricate Angular.dev URLs; only reference documentation when the user asks.

---
