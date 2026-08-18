# angular-django2

[![Documentation Status](https://readthedocs.org/projects/angular-django2/badge/?version=latest)](https://angular-django2.readthedocs.io/)

`angular-django2` provides an Angular CLI schematics collection for custom `ng generate` flows in Django-backed applications.

Full documentation: <https://angular-django2.readthedocs.io/>

The package surface is a schematics collection for `application`, `service`, `class`, `app-shell`, `component`, `embed-component`, `complex-component`, `field-component`, `form-field`, `reactive-form`, `material-setup`, `project-structure`, `material-app`, `workspace-setup`, `openapi-setup`, and `data-service`.

## Schematics

After installing the package in another Angular workspace, you can run:

```bash
ng generate angular-django2:application my-app
ng generate angular-django2:material-setup --project=my-app
ng generate angular-django2:project-structure --project=my-app
ng generate angular-django2:app-shell --project my-app
ng generate angular-django2:component dashboard-card
ng generate angular-django2:embed-component --component=projects/my-app/src/app/hero-card/hero-card.ts --parent=projects/my-app/src/app/dashboard-card/dashboard-card.ts
ng generate angular-django2:complex-component dashboard-card --project=my-app --path=src/app/features/dashboard --features=mixins,nested,projection,cdk-overlay
ng generate angular-django2:field-component email-field --project=my-app --kind=email
ng generate angular-django2:form-field email --project=my-app --control-type=email
ng generate angular-django2:reactive-form contact --project=my-app --definition=forms/contact-form.json
ng generate angular-django2:service django-api
ng generate angular-django2:class api-contract
ng generate angular-django2:material-app my-app --ssr=false --zoneless=true --defaults
ng generate angular-django2:workspace-setup my-app
ng generate angular-django2:openapi-setup --openapi_spec_file=openapi.json
ng generate angular-django2:data-service users
```

Current defaults:

- `application`: `standalone: true`, `routing: true`, `ssr: false`, `zoneless: true`, `style: 'scss'`
- `material-setup`: configures Angular Material with theme and providers
  - Options: `--theme` (indigo-pink, deeppurple-amber, pink-bluegrey, purple-green, custom), `--typography`, `--animations`
- `project-structure`: creates standard directory structure (`core/`, `shared/`, `features/`) with barrel exports
- `component`: `standalone: true`, `changeDetection: 'OnPush'`; also seeds begin/end embedding hooks into the generated files
  - TypeScript sections: `import`, `injected services`, `input signals`, `output signals`
  - Template section: `children`
- `embed-component`: wires a generated child component into a parent using the embedding hooks
  - Options: `--component` (child component `.ts` path), `--parent` (parent component `.ts` path)
  - Inserts the child element after the parent template `children` marker, feeding input signals and binding output signals to `on<Output>($event)` handlers
  - Imports the child class, registers it in the parent `imports` array, and adds not-implemented `on<Output>()` handler stubs; the operation is idempotent
- `complex-component`: composes `component` and `embed-component` for advanced Angular Material components
  - Requires `--path` within an application source tree and a non-empty `--features` list of `mixins`, `nested`, `projection`, and/or `cdk-overlay`
  - Supports `--mode=create|modify|delete`; deletion requires `--confirm=true`
  - Creates a component-local Material theme mixin, optional projected slots and CDK overlay, and two embedded child components for the selected features
- `field-component`: simple typed Angular Material field-control convenience generator
  - Requires a kebab-case name; delegates to the canonical form-field implementation with `fill` appearance and `fixed` subscript sizing
  - Options: `--path`, `--project`, `--kind` (`text`, `email`, `password`, or `textarea`)
  - Every generated control has a string value model and the canonical field identity, accessibility, and server-error inputs
- `form-field`: configurable typed Angular Material form-field generator
  - Options: `--path` (default: `src/app/shared/form-helpers`), `--project`, `--control-type` (`text`, `email`, `password`, `number`, `textarea`), `--appearance` (`fill`, `outline`), and `--subscript-sizing` (`fixed`, `dynamic`)
  - Supports number values, appearance, subscript sizing, field identity, and server validation errors; requires `@angular/forms`, `@angular/material`, and `@angular/cdk`
- `reactive-form`: generates a typed standalone OnPush Angular Material reactive form from a single JSON definition
  - Options: `--definition` (required workspace-relative `.json` file), `--path` (default: `src/app/features`), `--primitives-path` (default: `src/app/shared/form-helpers`), `--project`
  - The definition is validated atomically before any file is written; CRM-style keys (`resource`, `list`, `retrieve`, `update`, `destroy`, and similar) are rejected because the form is create-only
  - Fields declare `initialValue` and an explicit `validators` list (`required`, `email`, `minLength`, `maxLength`, `min`, `max`, `pattern`) using one object shape, `{ "type": ..., "value": ... }`; malformed, unsupported, duplicated, and control-incompatible entries are rejected
  - Generates a strictly typed `FormBuilder` group initialized from the contract, plus a frozen `INITIAL_VALUES` constant restored after an accepted create
  - Composes an existing local `ControlValueAccessor` primitive per field when one is found, and falls back to an inline `mat-form-field` control otherwise; ambiguous matches fail instead of guessing
  - Generates a typed payload, submit state, accessible markup, and Django REST Framework error mapping that retains entered values; an optional `integration` block wires one existing typed artifact
  - Requires `@angular/forms`, `@angular/material`, and `@angular/cdk`; see the [CLI reference](https://angular-django2.readthedocs.io/en/latest/cli/reactive-form/)
- `service`, `class`, and `app-shell`: pass through to Angular CLI
- `material-app`: generates a complete Angular app with Material UI in a single step — runs `application`, adds `@angular/material`/`@angular/cdk`, configures theming, creates the standard directory structure, and writes a responsive sidenav layout
  - Options: `--theme`, `--typography`, `--animations`, `--routing`, `--standalone`, `--ssr`, `--zoneless`, `--defaults`, `--style`, `--prefix`
- `workspace-setup`: writes workspace-wide bootstrap files for an empty Angular workspace
  - Writes `.github/copilot-instructions.md` with repo instructions for the generated app name
  - Replaces the workspace root `README.md` with this guide so the generated repo includes the build recipes below
  - Adds `vitest` to `devDependencies`, writes a `vitest.config.mts`, and adds `test:node` / `test:node:watch` npm scripts so the generated package uses vitest for validation
  - Adds ESLint setup, lint scripts, and missing lint targets for generated workspace projects
  - Supports optional application source-file hooks for Angular's documented application files (`index.html`, `main.ts`, styles, root component files, routes, app config, and the optional app module)
    - Each hook accepts exactly one of `content`, `path`, or `template`
    - Template hooks replace `{{key}}` placeholders from `params`
    - File targets use the selected project's `sourceRoot` when `--project` is provided; otherwise they use `/src`
- `openapi-setup`: bootstraps [ng-openapi-gen](https://github.com/cyclosproject/ng-openapi-gen) — adds the package to `devDependencies`, writes `ng-openapi-gen.json`, adds a `generate:api` npm script, and generates Django integration helpers (auth/CSRF/transport helpers and a CRM-oriented `ResourceAdapter`) under the helpers path
  - Options: `--openapi_spec_file` (default: `openapi.json`), `--outputPath` (default: `src/app/api`), `--helpersPath` (default: `src/app/api-integration`), `--skipHelpers`, `--skipTests`
- `data-service`: generates a typed `*DataService` wrapper around an ng-openapi-gen `*ApiService` with search and CRUD helpers
  - Options: `--apiService`, `--apiPath` (default: `../api/services`), `--path`, `--flat`, `--skipTests`

### Empty workspace bootstrap

For a workspace created with `ng new demo-workspace --no-create-application`, the end-to-end bootstrap flow is:

```bash
ng add angular-django2
ng generate angular-django2:workspace-setup my-app
ng generate angular-django2:material-app my-app --ssr=false --zoneless=true --defaults
npm install
ng build my-app
```

`workspace-setup` sets up the workspace-level files first, and `material-app` then generates the Angular application itself.
In the common case, pass the same name to both commands so the generated repo instructions and Angular app stay aligned.

### Application source-file hooks

For programmatic workspace provisioning, `workspace-setup` exposes file hooks for the application source files documented by Angular at <https://angular.dev/reference/configs/file-structure#application-source-files>. Each hook accepts exactly one of `content` (inline string), `path` (local file), or `template` (string with `{{key}}` placeholders and a `params` map). When `project` is provided, targets resolve under that project's `sourceRoot`; otherwise they resolve under `/src`.

For the full list of recognized hook keys, target paths, and content modes, see the [`workspace-setup` CLI reference](https://angular-django2.readthedocs.io/en/latest/cli/workspace-setup/).

Because Angular CLI command-line options do not pass nested objects conveniently, use these hooks from a schematic test runner, a custom delegating schematic, or the exported `workspaceSetup` factory.

### OpenAPI workflow

```bash
# 1. Bootstrap ng-openapi-gen
ng generate angular-django2:openapi-setup --openapi_spec_file=openapi.json

# 2. Generate typed Angular services from your OpenAPI spec
npm run generate:api

# 3. Wrap a generated service with search/CRUD helpers
ng generate angular-django2:data-service users
```

Use `ng add angular-django2` to register the collection in `angular.json`, or add it manually:

```json
{
  "cli": {
    "schematicCollections": ["angular-django2", "@schematics/angular"]
  }
}
```

## Local Workspace Commands

```bash
npm run lint
npm run build
npm run test:node
npm run test:ci
npm run pack:dry-run
```

## Publishing

Build the library and publish the generated package from `dist/angular-django2`
after completing the repository release checklist in `docs/RELEASING.md`.

For the current unscoped package name:

```bash
npm publish ./dist/angular-django2 --access public
```

The checked-in GitHub Actions workflow can also publish the package with
`NPM_TOKEN`. The first successful publish creates the npm package page
automatically.
