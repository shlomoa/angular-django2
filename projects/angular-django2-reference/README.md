# angular-django2-reference

The official Angular Material tutorial and online reference application for [`angular-django2`](https://github.com/shlomoa/angular-django2).

This project is a standalone-capable Angular 22 / Angular Material 3 application that serves as an interactive documentation hub, design showcase, and visual testing playground for the `angular-django2` schematics collection.

---

## Table of Contents

- [Overview & Purpose](#overview--purpose)
- [Architecture & Directory Organization](#architecture--directory-organization)
- [Angular Material 3 Design & Theming](#angular-material-3-design--theming)
- [Interactive Command Visualization Engine](#interactive-command-visualization-engine)
- [Standalone Subproject Architecture](#standalone-subproject-architecture)
- [Component Style Budget Management](#component-style-budget-management)
- [Development & Quality Workflows](#development--quality-workflows)
- [Available Schematics Explored](#available-schematics-explored)

---

## Overview & Purpose

While the root package [`angular-django2`](https://github.com/shlomoa/angular-django2) publishes the Angular CLI schematics collection to npm, `angular-django2-reference`:

1. **Demonstrates Best Practices**: Implements modern Angular 22 conventions (standalone components, signal inputs/outputs, OnPush change detection, zoneless architecture, flat routing).
2. **Exemplifies Material 3 (M3)**: Serves as a reference implementation for Material 3 design tokens, surface hierarchies, and dynamic theme switching.
3. **Provides Interactive Command Visualization**: Enables developers to preview the visual and architectural impact of running `angular-django2` schematics without generating files in their own workspace.
4. **Maintains Independent Tooling**: Provides its own dedicated manifests (`package.json`, `angular.json`), test harness (Vitest), linter (ESLint flat config), and formatter (Prettier).

---

## Architecture & Directory Organization

The application is structured into clearly separated architectural layers:

```
projects/angular-django2-reference/
├── README.md                          # This documentation file
├── package.json                       # Standalone package manifest
├── angular.json                       # Standalone Angular CLI project config
├── vitest.config.mts                  # Dedicated Vitest configuration (jsdom)
├── eslint.config.mjs                  # Flat ESLint config for TS and templates
├── .prettierrc                        # Prettier code style rules
├── .prettierignore                    # Prettier ignore patterns
├── tsconfig.app.json                  # Application TypeScript config
├── tsconfig.spec.json                 # Test TypeScript config
└── src/
    ├── index.html                     # HTML shell (Roboto + Material Icons)
    ├── main.ts                        # Application bootstrap
    ├── styles.scss                    # Global M3 theme palettes & sandbox helpers
    └── app/
        ├── app.ts                     # Root shell component (mat-sidenav-container)
        ├── app.reference.html         # Toolbar, drawer navigation, content surface
        ├── app.scss                   # M3 surface container & layout rules
        ├── app.routes.ts              # Route definitions (/ui, /guides)
        ├── core/                      # Core singleton services and state
        │   ├── index.ts               # Core barrel export
        │   └── services/
        │       └── theme.service.ts   # Centralized M3 color scheme manager
        ├── shared/                    # Reusable UI components & utilities
        │   ├── index.ts               # Shared barrel export
        │   └── components/
        │       └── breadcrumbs/       # Accessible Material breadcrumbs component
        ├── ui/                        # UI Command Explorer feature slice
        │   ├── ui-command-catalog.ts  # Catalog data and category definitions
        │   ├── ui-command-overview-page.ts   # Category grid with mat-card
        │   ├── ui-command-category-page.ts   # Category detail & "Apply Command"
        │   └── visualizers/           # Command visualization engine
        │       ├── index.ts           # Visualizer barrel export
        │       ├── command-visualizer.ts     # Dynamic sandbox & terminal engine
        │       ├── command-visualizer.scss   # Scoped visualizer layout
        │       └── command-visualizer.spec.ts# Unit tests for visualizer
        └── guides/                    # Interactive Guides feature slice
            ├── guides-catalog.ts      # Tutorial and guides metadata
            ├── guides-overview-page.ts# Guides catalog view
            └── guides-detail-page.ts  # Guide step-by-step detail view
```

---

## Angular Material 3 Design & Theming

### Material 3 Token Injection

The application configures Material 3 through `@angular/material`'s modern `@include mat.theme()` mixins in [`src/styles.scss`](file:///c:/Users/shlom/source/repos/shlomoa/angular-django2/projects/angular-django2-reference/src/styles.scss). Four distinctive color schemes are preconfigured:

| Theme Scheme                     | Primary Palette        | Tertiary Palette      | Color Scheme |
| -------------------------------- | ---------------------- | --------------------- | ------------ |
| **`theme-azure-blue`** (Default) | `mat.$azure-palette`   | `mat.$blue-palette`   | Light        |
| **`theme-rose-red`**             | `mat.$rose-palette`    | `mat.$red-palette`    | Light        |
| **`theme-magenta-violet`**       | `mat.$magenta-palette` | `mat.$violet-palette` | Dark         |
| **`theme-cyan-orange`**          | `mat.$cyan-palette`    | `mat.$orange-palette` | Dark         |

### Reactive Theme Switching

[`ThemeService`](file:///c:/Users/shlom/source/repos/shlomoa/angular-django2/projects/angular-django2-reference/src/app/core/services/theme.service.ts) exposes signal-based theme management:

```typescript
// Read active scheme and available options:
const currentScheme = themeService.scheme(); // 'azure-blue' | 'rose-red' | ...
const isDark = themeService.isDarkMode(); // computed boolean signal

// Switch scheme:
themeService.setScheme('magenta-violet');
```

Theme changes are automatically reflected on the root `<app-root>` element, activating the corresponding CSS class and system token definitions (`--mat-sys-surface`, `--mat-sys-primary`, `--mat-sys-surface-container`).

### Typography & Icons

- **Typography**: Google Fonts **Roboto** (`300;400;500;700`) is loaded in [`src/index.html`](file:///c:/Users/shlom/source/repos/shlomoa/angular-django2/projects/angular-django2-reference/src/index.html) and assigned as the primary M3 font family.
- **Iconography**: Google **Material Icons** font provides scalable vector icons used across toolbars, drawer menus, buttons, cards, and file trees.

---

## Interactive Command Visualization Engine

When exploring commands at `/ui/:categoryId`, selecting a command and clicking **Apply Command** activates the [`CommandVisualizerComponent`](file:///c:/Users/shlom/source/repos/shlomoa/angular-django2/projects/angular-django2-reference/src/app/ui/visualizers/command-visualizer.ts).

### 1. Dynamic Interactive Sandboxes

Different schematic types trigger specialized, functional micro-sandboxes:

- **`material-app`**: A functioning mini-application shell complete with a toggleable navigation drawer, active menu state, and live status cards illustrating Django API connection and CSRF token boundaries.
- **`app-shell`**: A responsive mini-shell layout featuring a navigation rail and a styled `<router-outlet />` placeholder.
- **`component`**: An interactive standalone card with `ChangeDetectionStrategy.OnPush` and a live signal counter with **Increment** and **Decrement** buttons.
- **`material-setup`**: An interactive palette swatch picker enabling users to switch between Azure, Rose, Magenta, and Cyan palettes in real-time.
- **`application`**: An architecture breakdown highlighting zoneless change detection, standalone routing, and SCSS styling.

### 2. Catppuccin-Themed CLI Terminal Simulation

Renders a simulated terminal window displaying:

- Exact CLI execution string (e.g. `ng g angular-django2:material-app ...`)
- Schematic validation checkmarks
- Step-by-step code generation confirmation

### 3. Workspace File Tree Updates

Displays an interactive list of file updates triggered by the schematic:

- **`CREATE`**: Green badge highlighting new components, templates, styles, specs, or barrel exports.
- **`UPDATE`**: Purple badge indicating modifications to `angular.json`, `package.json`, or configuration files.

---

## Standalone Subproject Architecture

To ensure the reference application can be developed, tested, and maintained independently of the schematics build:

1. **Isolated Manifests**:
   - `package.json`: Declares private status, dedicated scripts, and matching Angular dependencies.
   - `angular.json`: Contains project-level build, serve, test, and lint targets.
2. **Independent Toolchains**:
   - **Vitest**: Configured in `vitest.config.mts` using `jsdom` for fast component test execution.
   - **ESLint**: Configured in `eslint.config.mjs` using flat config with explicit `tsconfigRootDir: import.meta.dirname` to resolve monorepo path candidates cleanly.
   - **Prettier**: Prettier configuration in `.prettierrc` with `singleQuote: true` and `printWidth: 100`.

---

## Component Style Budget Management

In Angular 22 workspaces, component-level CSS is monitored by the `anyComponentStyle` budget (warning at `4.00 kB`, error at `8.00 kB`):

- **Scoped Component Rules**: Kept inside [`command-visualizer.scss`](file:///c:/Users/shlom/source/repos/shlomoa/angular-django2/projects/angular-django2-reference/src/app/ui/visualizers/command-visualizer.scss) for component layout and badge borders.
- **Global Demo Utilities**: Reusable sandbox utilities (mini-app frames, terminal body, swatch buttons) are defined in [`src/styles.scss`](file:///c:/Users/shlom/source/repos/shlomoa/angular-django2/projects/angular-django2-reference/src/styles.scss). This avoids duplicate encapsulation attributes (`[_ngcontent-%COMP%]`) and ensures production builds produce **0 warnings and 0 errors**.

---

## Development & Quality Workflows

All commands can be run either from the **workspace root** or from **within `projects/angular-django2-reference/`**:

| Action               | From Workspace Root           | From Reference App Directory |
| -------------------- | ----------------------------- | ---------------------------- |
| **Start Dev Server** | `npm run serve:reference-app` | `npm start`                  |
| **Run Unit Tests**   | `npm run test:reference-app`  | `npm test`                   |
| **Run Linter**       | `npm run lint:reference-app`  | `npm run lint`               |
| **Fix Lint Issues**  | `npm run lint:fix`            | `npm run lint:fix`           |
| **Check Formatting** | `npm run format:check`        | `npm run format:check`       |
| **Fix Formatting**   | `npm run format`              | `npm run format`             |
| **Build Production** | `npm run build:reference-app` | `npm run build`              |

---

## Available Schematics Explored

The reference application provides interactive explorations for the full collection:

| Category                   | Schematics Explored                                                |
| -------------------------- | ------------------------------------------------------------------ |
| **Workspace Setup**        | `ng-add`, `workspace-setup`, `material-setup`, `project-structure` |
| **Application Generation** | `application`, `material-app`, `app-shell`                         |
| **Component Authoring**    | `component`, `embed-component`, `complex-component`                |
| **Form Engineering**       | `field-component`, `form-field`, `reactive-form`                   |
| **Routing & Architecture** | `page`, `service`, `class`                                         |
| **OpenAPI & Data Flow**    | `openapi-setup`, `data-service`                                    |
