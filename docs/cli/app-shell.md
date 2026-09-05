# app-shell

Generate an Angular **App Shell** for server-side rendering (SSR) and
prerendering. This thin pass-through delegates to Angular's
[`@schematics/angular:app-shell`](https://angular.dev/cli/generate/app-shell)
schematic and adds no package-owned behavior.

## Prerequisites

Configure the target application for SSR before invoking this command. Angular's
SSR setup and app-shell requirements are version-specific; follow the upstream
documentation for the installed Angular CLI version.

## Command synopsis

```bash
ng generate angular-django2:app-shell --project=my-app
```

## Options and output

The local schema exposes `--project` for the target application. Because it
accepts additional options and forwards them unchanged, Angular CLI's
[`app-shell` documentation](https://angular.dev/cli/generate/app-shell)
defines the complete option set, defaults, constraints, and generated files.

## Related commands

This is **not** the responsive Material sidenav layout written by
[`material-app`](material-app.md). Use `material-app`, or
[`material-setup`](material-setup.md) with
[`project-structure`](project-structure.md), for Material UI setup.
