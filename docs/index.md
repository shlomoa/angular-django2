# angular-django2

`angular-django2` provides an Angular CLI schematics collection for custom `ng generate` flows in Django-backed applications.

The package surface is a schematics collection: `application`, `service`, `class`, `app-shell`, `component`, `material-setup`, `project-structure`, `material-app`, `workspace-setup`, `api-setup`, `data-service`

Start with the [tutorial](TUTORIAL.md) to go from an empty directory to a
working app with Angular CLI and the ngdj schematics. See the [CLI guide](cli/index.md)
for install, `ng add`, `ng generate`, app setup, and OpenAPI workflow examples.

## Workspace file provisioning

The completed workspace-file outcome from [GitHub issue #30](https://github.com/shlomoa/angular-django2/issues/30) is implemented by the `workspace-setup` schematic.

`workspace-setup` always writes the generated workspace bootstrap files:

- `.github/copilot-instructions.md`
- `README.md`
- `eslint.config.mjs` when missing
- `vitest.config.mts` when missing
- lint and Vitest package scripts/dependencies in `package.json`
- missing lint targets in `angular.json`

It can also provision Angular application source files from explicit per-file hooks. The hook set follows Angular's documented [application source files](https://angular.dev/reference/configs/file-structure#application-source-files), including `index.html`, `main.ts`, global styles, root component files, route config, standalone app config, and the optional NgModule entry point.

Each hook supports exactly one source mode:

- `content` — inline file contents written verbatim
- `path` — a local file path read when the schematic runs
- `template` — a literal template with `{{key}}` placeholders replaced from `params`

When `project` is provided, file targets are resolved under that project's `sourceRoot`; otherwise, they are written under `/src`.

## Quick start

```bash
npx -y @angular/cli@22 new demo-workspace --no-create-application --package-manager npm --skip-git --defaults
cd demo-workspace
npm install angular-django2
npx ng add angular-django2 --skip-confirmation
npx ng generate angular-django2:workspace-setup my-app
npx ng generate angular-django2:material-app my-app --ssr=false --zoneless=true --defaults
npm install
npx ng build my-app
npx ng serve my-app
```

See the [tutorial](TUTORIAL.md) for the step-by-step walkthrough of this same
flow, and the [CLI guide](cli/index.md) for the full command reference.

See the [GitHub repository](https://github.com/shlomoa/angular-django2) for full README, changelog, and contributing guidelines.
