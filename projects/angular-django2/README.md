# angular-django2

[![Documentation Status](https://readthedocs.org/projects/angular-django2/badge/?version=latest)](https://angular-django2.readthedocs.io/)
[![npm](https://img.shields.io/npm/v/angular-django2)](https://www.npmjs.com/angular-django2)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`angular-django2` provides an Angular CLI schematics collection for custom `ng generate` flows in Django-backed applications. It covers application and workspace setup, Angular Material integration, routed pages, typed reactive forms, reusable form fields, component composition, and OpenAPI/Django REST framework data services.

Generation uses deterministic Angular CLI schematics with explicit, validated inputs. The package does not load or execute AI agents, provider SDKs, prompts, or SKILLS; external orchestrators may invoke the same public schematic contracts without changing their behavior.

**Full documentation: <https://angular-django2.readthedocs.io/>**

---

## Installation

```bash
ng add angular-django2
```

`ng add` automatically registers `angular-django2` in your `angular.json` schematic collections. To register it manually:

```json
{
  "cli": {
    "schematicCollections": ["angular-django2", "@schematics/angular"]
  }
}
```

---

## Schematics Collection

The collection provides 18 specialized schematics grouped by functional domain:

### Application Generation

- **`material-app`**: Generates a complete standalone Angular app configured with Angular Material 3 in a single step (routing, zoneless change detection, theme setup, standard directory structure, and responsive sidenav layout).
- **`compile`**: Compiles a complete Angular Material application (app shell, theme, routed pages, composed components, forms, and data services) from one OpenUI document.
- **`application`**: Scaffolds a lean, standalone, zoneless Angular application with strict SCSS and routing.
- **`app-shell`**: Generates an application shell with responsive navigation.

### Workspace & Setup

- **`ng-add`**: Configures an existing workspace to use `angular-django2`.
- **`workspace-setup`**: Scaffolds workspace root configurations (`README.md`, ESLint, Vitest, lint/test package scripts, and application source-file hooks).
- **`material-setup`**: Configures Angular Material 3 theming (prebuilt or custom), typography, and animations.
- **`project-structure`**: Scaffolds standard directory conventions (`core/`, `shared/`, `features/`) with barrel exports.

### Component Authoring & Composition

- **`component`**: Generates standalone OnPush components with embedding hook markers (`imports`, `injected services`, `inputs`, `outputs`, and template `children`).
- **`embed-component`**: Wires child components into parent components using embedding hooks in file mode or package mode (e.g. embedding Material components).
- **`complex-component`**: Composes `component` and `embed-component` to create, modify, or confirmed-delete advanced standalone OnPush Material components featuring `<ng-container>` multi-slot projection BKM, mixins, or CDK overlay dialogs.

### Form Engineering

- **`form-field`**: Scaffolds a typed standalone OnPush `ControlValueAccessor` Angular Material form field supporting text, email, password, number, and textarea controls with accessible validation states.
- **`field-component`**: Generates a convenience façade component wrapping canonical form fields.
- **`reactive-form`**: Generates a strictly typed standalone OnPush Angular Material reactive form from a declarative JSON schema definition, complete with Django REST Framework error handling and initial value restoration.

### Routing & Architecture

- **`page`**: Generates a standalone OnPush Angular Material routed page with its own lazy `Routes` definition and navigation metadata.
- **`service`**: Scaffolds an injectable Angular service.
- **`class`**: Scaffolds a TypeScript model class.

### OpenAPI & Data Services

- **`openapi-setup`**: Configures `ng-openapi-gen` and generates Django transport integration helpers (CSRF handling, auth interceptors, `ResourceAdapter`, and paginated results).
- **`data-service`**: Generates a typed data service wrapping generated OpenAPI services with search and CRUD helpers.

---

## Package Dependencies

`angular-django2` authoritatively declares and maintains its runtime dependencies for Angular 22:

- **Angular Core & Platform**: `@angular/core`, `@angular/common`, `@angular/compiler`, `@angular/platform-browser`, `@angular/animations`, `@angular/router`
- **Angular Forms**: `@angular/forms`
- **Angular Material & CDK**: `@angular/material`, `@angular/cdk`
- **Specifications & Utilities**: `@shlomoa/openui-spec`, `rxjs`, `tslib`

---

## Standalone Package Scripts

This package is developed and maintained as a standalone npm workspace under `projects/angular-django2`. You can run commands from within `projects/angular-django2/` or delegate via the workspace root:

| Command                   | Action                                                                    |
| :------------------------ | :------------------------------------------------------------------------ |
| `npm run build`           | Compiles TypeScript schematics, copies schemas and manifests into `dist/` |
| `npm run compile`         | Runs TypeScript compilation (`tsc -p tsconfig.schematics.json`)           |
| `npm run pack`            | Builds and produces an npm package tarball in `./dist`                    |
| `npm run pack:dry-run`    | Validates tarball contents and manifest without creating files            |
| `npm run lint`            | Runs ESLint against schematic TypeScript sources                          |
| `npm run lint:fix`        | Automatically fixes ESLint violations                                     |
| `npm run format:check`    | Checks code formatting with Prettier                                      |
| `npm run format`          | Applies Prettier code formatting                                          |
| `npm run publish:dry-run` | Verifies npm publication in dry-run mode                                  |
| `npm run publish:package` | Publishes `./dist` to the npm registry with public access                 |

---

## Reference Application

An interactive Angular Material 3 reference application showcasing all schematics with live visualizer sandboxes, terminal simulation, and routed guides is available in [`projects/angular-django2-reference`](../angular-django2-reference/).

---

## License

MIT © [Shlomo Anker](https://github.com/shlomoa)
