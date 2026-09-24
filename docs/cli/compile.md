# compile

Compile a complete Angular Material application from one OpenUI document.

```bash
ng generate angular-django2:compile app.openui.json
```

`--document` (or the first positional argument) is the workspace-relative path
of a canonical OpenUI JSON document with exactly one root `Application`
element. Run it in an Angular workspace (for example one created with
`ng new --no-create-application`).

## What it generates

The schematic dispatches each root element to the schematic that owns it, in
this order:

1. `Application` → [`material-app`](material-app.md#openui-application-documents):
   the application, Material theme from `Presentation`, routing from `Routing`,
   and one sidenav link per `DashboardPage`. Its `IndexHtml` and `Favicon`
   children update the host files as in
   [`workspace-setup`](workspace-setup.md#openui-host-documents).
2. `DashboardPage` / `EmptyPage` → [`page`](page.md#openui-page-nodes) under
   `src/app/features/<page>`, registered in `app.routes.ts`; page children are
   compiled and embedded into the page's slots.
3. `SurfaceContainers` → [`component`](component.md#openui-surface-containers)
   and `Form` → [`reactive-form`](reactive-form.md), under `src/app/features`.
4. Every element with a `[data]` binding, anywhere in the document →
   [`data-service`](data-service.md#openui-data-bindings).

The Angular project is named after the dasherized `Application` id. A root
element of any other type is rejected, unless it carries a `[data]` binding: it
then produces only its data service, with a warning that its own markup has no
compiler yet.

## Example

```json
{
  "version": "0.2.0",
  "id": "root",
  "type": "html",
  "children": [
    {
      "id": "shop",
      "type": "Application",
      "attrs": { "[title]": "Shop admin" },
      "children": [
        { "id": "routing", "type": "Routing" },
        { "id": "look", "type": "Presentation", "attrs": { "[theme]": "purple-green" } }
      ]
    },
    {
      "id": "profile",
      "type": "DashboardPage",
      "attrs": { "[title]": "My profile", "[icon]": "person" },
      "children": [{ "id": "summary", "type": "SurfaceContainers" }]
    },
    {
      "id": "orderRows",
      "type": "Table",
      "attrs": { "[data]": "src/app/api/services#OrdersApiService" }
    }
  ]
}
```
