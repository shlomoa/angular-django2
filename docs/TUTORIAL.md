# Tutorial: task-oriented workflows

Choose one workflow for your goal rather than following every command in
sequence. Each workflow links to the [CLI reference](cli/index.md), which owns
the complete option contracts and constraints.

In this guide, `ng` means the local Angular CLI invoked with `npx ng`, and
`angular-django2:<schematic>` identifies a schematic in this collection.

## Prerequisites and workspace choice

**Use this first** to choose the workspace that owns setup and to check the
tools every workflow needs.

- Node.js `^22.22.3 || ^24.15.0 || >=26.0.0`
- npm `>=11`

```bash
node --version
npm --version
```

If `django-angular3` manages your workspace, it owns the Django-side lifecycle.
Use the [CLI reference](cli/index.md) to select the applicable command instead
of creating another Angular workspace. For a standalone app, begin with the
fastest or explicit setup workflow below.

**Expected result:** you have a supported Node.js/npm installation and have
chosen either the existing managed workspace or a new standalone workspace.

## Fastest complete Material app

**Use this workflow** when you want a runnable Angular Material application with
the standard directory structure and responsive sidenav shell as quickly as
possible. Start in an empty directory.

```bash
mkdir ngdj-tutorial
cd ngdj-tutorial
npx -y @angular/cli@22 new ngdj-tutorial --directory . --no-create-application --package-manager npm --skip-git --defaults
npm install angular-django2
npx ng add angular-django2 --skip-confirmation
npx ng generate angular-django2:workspace-setup ngdj-tutorial
npx ng generate angular-django2:material-app ngdj-tutorial --theme=indigo-pink --typography=true --animations=true --ssr=false --zoneless=true --defaults
npm install
npx ng build ngdj-tutorial
npx ng serve ngdj-tutorial
```

Open the local URL printed by `ng serve`. You should see a Material toolbar,
sidenav, and router outlet. See [`material-app`](cli/material-app.md) for its
options and generated output.

**Expected result:** `ng build` succeeds and the generated Material application
runs locally.

## Explicit step-by-step composition

**Use this workflow** when you want the standard application, Material
configuration, and directory structure but do not want the `material-app`
responsive shell. Start in an empty directory.

```bash
mkdir ngdj-composed
cd ngdj-composed
npx -y @angular/cli@22 new ngdj-composed --directory . --no-create-application --package-manager npm --skip-git --defaults
npm install angular-django2
npx ng add angular-django2 --skip-confirmation
npx ng generate angular-django2:workspace-setup ngdj-composed
npx ng generate angular-django2:application ngdj-composed
npm install @angular/material @angular/cdk @angular/animations
npx ng generate angular-django2:material-setup --project=ngdj-composed --theme=indigo-pink --typography=true --animations=true
npx ng generate angular-django2:project-structure --project=ngdj-composed
npm install
npx ng build ngdj-composed
```

This deliberately leaves the generated root component without the Material
sidenav layout. Read [`application`](cli/application.md),
[`material-setup`](cli/material-setup.md), and
[`project-structure`](cli/project-structure.md) before changing the composition
or its options.

**Expected result:** `ng build` succeeds, Material is configured, and the
project has `core/`, `shared/`, and `features/` barrels without a sidenav shell.

## Component composition

**Use this workflow** after either application setup workflow when a feature
needs a standalone component wired into an existing parent.

```bash
npx ng generate angular-django2:component dashboard-card --project=ngdj-tutorial --path=src/app/features/dashboard
npx ng generate angular-django2:embed-component --component=projects/ngdj-tutorial/src/app/features/dashboard/dashboard-card/dashboard-card.ts --parent=projects/ngdj-tutorial/src/app/app.ts
npx ng build ngdj-tutorial
```

The generated child is imported by the root component and inserted into its
template. The child uses the component embedding markers, so do not generate it
with an inline template when you need automatic HTML embedding. For package
components, advanced composition, output-handler stubs, and all options, use
[`embed-component`](cli/embed-component.md),
[`component`](cli/component.md), and
[`complex-component`](cli/complex-component.md).

**Expected result:** the build succeeds with `dashboard-card` rendered by the
root application component.

## Forms and validation

**Use this workflow** after Material is configured when you need reusable
typed controls or a create-only Django REST Framework form.

Generate field primitives first:

```bash
npx ng generate angular-django2:field-component email-field --project=ngdj-tutorial --kind=email
npx ng generate angular-django2:form-field headcount --project=ngdj-tutorial --control-type=number --appearance=outline --subscript-sizing=dynamic
```

To generate a complete form, create `forms/contact-form.json`:

```json
{
  "$schema": "./node_modules/angular-django2/schematics/reactive-form/schema.json#/definitions/reactiveFormDefinition",
  "title": "Create contact",
  "endpoint": "/api/contacts/",
  "submitLabel": "Create contact",
  "fields": [
    {
      "name": "email",
      "label": "Email",
      "control": "email",
      "required": true,
      "autocomplete": "email"
    },
    {
      "name": "fullName",
      "label": "Full name",
      "control": "text",
      "validators": [{ "type": "required" }, { "type": "maxLength", "value": 120 }]
    },
    { "name": "notes", "label": "Notes", "control": "textarea", "hint": "Optional context" }
  ]
}
```

The `$schema` value is an installed-package path, so it resolves after
`npm install angular-django2`. Readers of this documentation can inspect the
[published reactive-form definition schema](https://github.com/shlomoa/angular-django2/blob/main/projects/angular-django2/schematics/reactive-form/schema.json#/definitions/reactiveFormDefinition)
online.

```bash
npx ng generate angular-django2:reactive-form contact --definition=forms/contact-form.json --project=ngdj-tutorial --path=src/app/features
npx ng build ngdj-tutorial
```

The generated form reuses primitives under `--primitives-path` when they match
the canonical `form-field` output; otherwise it renders Material controls
inline. See [`field-component`](cli/field-component.md),
[`form-field`](cli/form-field.md), and
[`reactive-form`](cli/reactive-form.md) for validation, integration, and option
details.

**Expected result:** the build succeeds and `src/app/features/contact-form/`
contains a typed, OnPush form that creates against `/api/contacts/`.

## Page and site generation

**Use this workflow** after a Material application exists when you want either
one feature-owned lazy route or a complete site assembly.

For one page:

```bash
npx ng generate angular-django2:page orders --project=ngdj-tutorial --path=src/app/features/orders --route-path=orders --navigation-label=Orders --navigation-icon=shopping_cart
npx ng build ngdj-tutorial
```

The command adds an `orders` lazy route and its navigation metadata without
changing unrelated routes. For route guards and all constraints, see
[`page`](cli/page.md).

For a whole site, use a fresh, unmodified `material-app` shell; the `site`
schematic refuses to replace a custom shell or navigation:

```bash
npx ng generate angular-django2:site --project=ngdj-tutorial --defaults
npx ng build ngdj-tutorial
```

Use `--source=src/app/site/site.json` instead of `--defaults` when your
workspace already has an explicit site assembly definition. The
[`site` reference](cli/site.md) owns that JSON contract, lifecycle operations,
and protected-page requirements.

**Expected result:** the page workflow adds one lazy route, while the site
workflow adds the documented Home page or exactly the routes and forms defined
by its source file.

## OpenAPI client integration

**Use this workflow** after an application exists and your Django backend
publishes an OpenAPI schema.

```bash
npx ng generate angular-django2:openapi-setup --openapi-spec-file=openapi.json
npm install
npm run generate:api
npx ng generate angular-django2:data-service users --project=ngdj-tutorial
npx ng build ngdj-tutorial
```

`openapi-setup` adds the `ng-openapi-gen` configuration and Django transport
helpers; the `data-service` command wraps a generated API service. Follow the
[`openapi-setup`](cli/openapi-setup.md) reference to compose the generated
transport at application bootstrap, and
[`data-service`](cli/data-service.md) for its wrapper contract.

**Expected result:** generated OpenAPI services are available under the
configured output path, Django integration helpers are available under
`src/app/api-integration/`, and the `UsersDataService` wrapper compiles.

## Related commands

The [CLI reference](cli/index.md) lists every schematic. In particular,
[`app-shell`](cli/app-shell.md), [`service`](cli/service.md), and
[`class`](cli/class.md) cover Angular SSR/prerendering shells and focused
application artifacts not shown in the workflows above.
