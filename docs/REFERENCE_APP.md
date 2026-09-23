# Angular Material Reference Application Guide

This document describes the design, architecture, and maintenance workflows for
`projects/angular-django2-reference`, the repo-owned Angular Material 3 tutorial
and reference application.

## Purpose and Scope

`projects/angular-django2-reference` fulfills four essential roles:

1. **Working Reference Implementation**: Demonstrates how Angular 22 and Angular Material 3
   integrate with Django-oriented architectures (zoneless detection, standalone components,
   CSRF protection patterns, and standalone HTTP clients).
2. **Interactive Command Explorer**: Provides a visual catalog where developers can explore
   every schematic provided by `angular-django2` and preview the result of applying each command.
3. **Interactive Sandboxes**: Replaces static graphics with functioning Angular Material
   micro-components (collapsible navigation drawers, reactive signal counters, dynamic theme
   palette swatches, and simulated CLI playback).
4. **Independent Monorepo Slice**: Operates as a self-contained subproject with its own
   `package.json`, `angular.json`, Vitest suite, ESLint flat configuration, and Prettier rules.

## Architectural Layers

```
projects/angular-django2-reference/src/app/
├── core/
│   ├── index.ts
│   └── services/
│       └── theme.service.ts       # M3 theme signals, palette management, dark mode
├── shared/
│   ├── index.ts
│   └── components/
│       └── breadcrumbs/           # Accessible Material breadcrumb trail
├── ui/
│   ├── ui-command-catalog.ts      # Schematic catalog data & category definitions
│   ├── ui-command-overview-page.ts# Material card category grid
│   ├── ui-command-category-page.ts# Command selector & "Apply Command" action
│   └── visualizers/
│       ├── index.ts
│       ├── command-visualizer.ts  # Dynamic micro-sandboxes & terminal simulation
│       ├── command-visualizer.scss# Scoped visualizer layout
│       └── command-visualizer.spec.ts
└── guides/
    ├── guides-catalog.ts          # Step-by-step tutorial guides metadata
    ├── guides-overview-page.ts    # Guide overview cards
    └── guides-detail-page.ts      # Multi-step tutorial detail view
```

### Core Layer

- **`ThemeService`**: A singleton service exposing Angular signals (`scheme`, `isDarkMode`, `availableThemes`). It dynamically updates the CSS theme class on `app-root` (`theme-azure-blue`, `theme-rose-red`, `theme-magenta-violet`, `theme-cyan-orange`).
- **Global Themes**: Configured in `src/styles.scss` using `@include mat.theme(...)` with Angular Material 3 tokens.

### Shared Layer

- **`BreadcrumbsComponent`**: A standalone component consuming the current active route and rendering accessible Material button links (`mat-button`) separated by chevron icons (`mat-icon`), with `aria-label="Breadcrumb"`.

### UI Command Explorer & Visualizer

- When navigating to `/ui/:categoryId`, selecting a command from the `<mat-action-list>` and clicking `<button mat-flat-button class="ui-command-category__apply-button">Apply Command</button>` reveals the `<app-command-visualizer>`:
  - **`material-app`**: Renders a mini-application frame with functioning drawer toggle and Django API connectivity cards.
  - **`app-shell`**: Renders a responsive sidenav rail shell with router-outlet placeholder.
  - **`component`**: Renders an interactive OnPush card with reactive counter signal buttons.
  - **`material-setup`**: Renders interactive theme palette swatches demonstrating live token adjustments.
  - **`application`**: Renders an architecture matrix showcasing zoneless change detection and standalone routing.
  - **Terminal Simulation**: Displays Catppuccin-styled CLI output demonstrating schematic execution.
  - **Workspace File Tree**: Details file creation and update actions (`CREATE`, `UPDATE`).

## Standalone Subproject Configuration

The reference application is designed to be fully functional both within the parent monorepo and as an isolated workspace slice:

- **`package.json`**: Declares private status, aligned Angular dependencies, and local scripts (`npm start`, `npm test`, `npm run lint`, `npm run format`).
- **`angular.json`**: Standalone Angular configuration declaring `build`, `serve`, `test`, and `lint` architect targets.
- **`vitest.config.mts`**: Local Vitest configuration using the `jsdom` environment.
- **`eslint.config.mjs`**: Flat ESLint config with `tsconfigRootDir: import.meta.dirname` to cleanly isolate typescript-eslint resolution.

## Style Budget Guidelines

Angular CLI enforces the `anyComponentStyle` budget (warning at `4.00 kB`, error at `8.00 kB`):

- Keep scoped component SCSS (`command-visualizer.scss`) lightweight by focusing strictly on component-specific layout and host borders.
- Reusable or global demo styles (such as mini-app frames, terminal windows, and palette swatches) should reside in `src/styles.scss`.
- This ensures component style encapsulation (`[_ngcontent-%COMP%]`) does not bloat bundle size and keeps builds free of budget warnings.

## Quality and Verification

Run these validation commands from the repository root:

```bash
# Build the reference app bundle (verifies 0 budget warnings)
npm run build:reference-app

# Lint the reference app
npm run lint:reference-app

# Run all reference app unit tests
npm run test:reference-app

# Serve locally for manual testing and preview
npm run serve:reference-app
```
