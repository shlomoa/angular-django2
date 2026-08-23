# app-shell

Generate an Angular **App Shell** for server-side rendering (SSR) and
prerendering. This schematic is a thin pass-through that delegates to Angular's
own [`@schematics/angular:app-shell`](https://angular.dev/cli/generate/app-shell)
and forwards every option unchanged.

```bash
ng generate angular-django2:app-shell --project=<name>
```

## Not the Material layout

This is **not** the responsive Material sidenav layout that
[`material-app`](material-app.md) writes. Angular's App Shell is an unrelated
SSR/prerendering feature that renders a static placeholder shown while the
client application bootstraps. Use `material-app` (or `material-setup` plus
`project-structure`) for the Material UI layout.

## Prerequisites

Angular's App Shell requires an SSR-enabled application. Configure SSR first,
then run this schematic:

```bash
ng add @angular/ssr --project=<name>
```

## Options

Because this schematic forwards options directly to
`@schematics/angular:app-shell`, it accepts that schematic's full option set —
not just `--project`. See Angular's
[`app-shell` documentation](https://angular.dev/cli/generate/app-shell) for the
authoritative and version-specific list of options.
