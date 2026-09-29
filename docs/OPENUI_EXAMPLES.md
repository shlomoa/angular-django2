# OpenUI document examples

Complete [OpenUI](https://github.com/shlomoa/openui-spec) 0.8.0 documents and the
commands that compile them. Every document on this page is validated with
`@shlomoa/openui-spec`, and every command is run against a fresh workspace by the
repository test suite (`documentation-validation`), so the examples cannot drift
from the schematics. The attribute language is described in
[OpenUI documents](OPENUI_DOCUMENTS.md).

Each document has a `root` element of type `html`, the `version` the tool
implements, and the elements to compile as its children. Save a document in the
workspace and pass its path as `--document`; use `--node-id` to choose the element
when the document holds several candidates.

## Contact form

A `Form` with a text field, a numeric range, and a submit action. Strings are
quoted literals, booleans and numbers are JSON values.

<!-- openui: example path=forms/contact.openui.json -->

```json
{
  "version": "0.8.0",
  "id": "root",
  "type": "html",
  "children": [
    {
      "id": "contact",
      "type": "Form",
      "attrs": {
        "uses.title": "\"Contact us\"",
        "uses.action": "\"/api/contacts/\""
      },
      "children": [
        {
          "id": "email",
          "type": "TextInputs",
          "attrs": {
            "uses.type": "\"email\"",
            "uses.label": "\"Email\"",
            "uses.required": true,
            "uses.autocomplete": "\"email\""
          }
        },
        {
          "id": "age",
          "type": "RangeControl",
          "attrs": {
            "uses.label": "\"Age\"",
            "uses.min": 18,
            "uses.max": 120,
            "uses.value": 30
          }
        },
        {
          "id": "send",
          "type": "ActionControls",
          "attrs": { "uses.label": "\"Send\"" }
        }
      ]
    }
  ]
}
```

```bash
ng generate angular-django2:reactive-form contact --document=forms/contact.openui.json --node-id=contact
```

See [`reactive-form`](cli/reactive-form.md#openui-form-documents) for the
attributes a `Form` and its controls accept.

## A single field

One `TextInputs` node drives both the reusable Material field primitive and a
field component.

<!-- openui: example path=forms/work-email.openui.json -->

```json
{
  "version": "0.8.0",
  "id": "root",
  "type": "html",
  "children": [
    {
      "id": "workEmail",
      "type": "TextInputs",
      "attrs": {
        "uses.type": "\"email\"",
        "uses.name": "\"work-email\"",
        "uses.appearance": "\"outline\"",
        "uses.subscriptSizing": "\"dynamic\""
      }
    }
  ]
}
```

```bash
ng generate angular-django2:form-field --document=forms/work-email.openui.json --node-id=workEmail
```

```bash
ng generate angular-django2:field-component --document=forms/work-email.openui.json --node-id=workEmail
```

## A settings panel

A `SurfaceContainers` node becomes a component. Its children are compiled into
their own components and embedded in the section named by `uses.slot` (`header`,
`content`, or `actions`; `content` when absent).

<!-- openui: example path=panels/settings.openui.json -->

```json
{
  "version": "0.8.0",
  "id": "root",
  "type": "html",
  "children": [
    {
      "id": "settingsPanel",
      "type": "SurfaceContainers",
      "attrs": { "uses.title": "\"Settings\"" },
      "children": [
        {
          "id": "toolbar",
          "type": "SurfaceContainers",
          "attrs": { "uses.slot": "\"header\"" }
        },
        {
          "id": "displayName",
          "type": "TextInputs",
          "attrs": { "uses.label": "\"Display name\"" }
        },
        {
          "id": "save",
          "type": "SurfaceContainers",
          "attrs": { "uses.slot": "\"actions\"" }
        }
      ]
    }
  ]
}
```

```bash
ng generate angular-django2:component --document=panels/settings.openui.json --node-id=settingsPanel --path=src/app/features
```

## A card with an overlay

`complex-component` compiles the same container as a Material card and turns one
optional `OverlayContainers` child into a connected overlay opened by a toggle
button.

<!-- openui: example path=panels/order.openui.json -->

```json
{
  "version": "0.8.0",
  "id": "root",
  "type": "html",
  "children": [
    {
      "id": "orderCard",
      "type": "SurfaceContainers",
      "attrs": { "uses.title": "\"Order\"" },
      "children": [
        {
          "id": "orderSummary",
          "type": "SurfaceContainers",
          "attrs": { "uses.slot": "\"header\"" }
        },
        {
          "id": "moreDetails",
          "type": "OverlayContainers",
          "attrs": { "uses.label": "\"More details\"" },
          "children": [{ "id": "shippingNotes", "type": "SurfaceContainers" }]
        }
      ]
    }
  ]
}
```

```bash
ng generate angular-django2:complex-component --document=panels/order.openui.json --node-id=orderCard --path=src/app/features
```

## A data service

Any element carrying `uses.data` names the generated API service to wrap, as
`<apiPath>#<ApiService>` in a quoted string.

<!-- openui: example path=data/orders.openui.json -->

```json
{
  "version": "0.8.0",
  "id": "root",
  "type": "html",
  "children": [
    {
      "id": "orderRows",
      "type": "Table",
      "attrs": { "uses.data": "\"src/app/api/services#OrdersApiService\"" }
    }
  ]
}
```

```bash
ng generate angular-django2:data-service --document=data/orders.openui.json --node-id=orderRows
```

## Host page

The first `html` node under the root sets `lang`, `dir`, and the title of
`index.html`. The `link` node that names the favicon is described in
[`workspace-setup`](cli/workspace-setup.md#openui-host-documents).

<!-- openui: example path=host.openui.json -->

```json
{
  "version": "0.8.0",
  "id": "root",
  "type": "html",
  "children": [
    {
      "id": "indexHtml",
      "type": "html",
      "attrs": {
        "uses.lang": "\"he\"",
        "uses.dir": "\"rtl\"",
        "uses.title": "\"Shop & Co\""
      }
    }
  ]
}
```

```bash
ng generate angular-django2:workspace-setup --name=demo --project=demo-app --document=host.openui.json
```

## A complete application

An `Application` holds a `Routing` model, the `Navigation` that presents it, a
`ToolBar`, and a `Presentation`. The pages are siblings: a `Route` names its page
by `uses.target`, a `NavItem` names its route by `uses.route`, and both are quoted
element ids that the validator resolves. A page is content-only, so its path and
access come from its `Route`, and its navigation label and icon from its `NavItem`.

<!-- openui: example path=app.openui.json -->

```json
{
  "version": "0.8.0",
  "id": "root",
  "type": "html",
  "children": [
    {
      "id": "shop",
      "type": "Application",
      "children": [
        {
          "id": "routing",
          "type": "Routing",
          "attrs": { "uses.defaultRoute": "\"homeRoute\"" },
          "children": [
            {
              "id": "homeRoute",
              "type": "Route",
              "attrs": {
                "uses.path": "\"home\"",
                "uses.target": "\"home\"",
                "uses.title": "\"Home\""
              }
            },
            {
              "id": "ordersRoute",
              "type": "Route",
              "attrs": {
                "uses.path": "\"orders\"",
                "uses.target": "\"orders\"",
                "uses.access": "\"public\""
              }
            }
          ]
        },
        {
          "id": "navigation",
          "type": "Navigation",
          "attrs": { "uses.ariaLabel": "\"Primary\"" },
          "children": [
            {
              "id": "homeNavigation",
              "type": "NavItem",
              "attrs": {
                "uses.label": "\"Home\"",
                "uses.route": "\"homeRoute\"",
                "uses.icon": "\"home\""
              }
            },
            {
              "id": "ordersNavigation",
              "type": "NavItem",
              "attrs": {
                "uses.label": "\"Orders\"",
                "uses.route": "\"ordersRoute\"",
                "uses.icon": "\"receipt_long\""
              }
            }
          ]
        },
        {
          "id": "toolbar",
          "type": "ToolBar",
          "attrs": { "uses.ariaLabel": "\"Shop actions\"" },
          "children": [
            {
              "id": "actionsRow",
              "type": "ToolBarRow",
              "children": [
                {
                  "id": "refresh",
                  "type": "ToolAction",
                  "attrs": {
                    "uses.label": "\"Refresh\"",
                    "uses.icon": "\"refresh\"",
                    "produces.activate": null
                  }
                }
              ]
            }
          ]
        },
        {
          "id": "presentation",
          "type": "Presentation",
          "attrs": {
            "uses.theme": "\"indigo-pink\"",
            "uses.typography": true,
            "uses.animations": true
          }
        }
      ]
    },
    {
      "id": "home",
      "type": "DashboardPage",
      "attrs": { "uses.title": "\"Welcome\"" }
    },
    { "id": "orders", "type": "EmptyPage" }
  ]
}
```

`application` creates the Angular application, enabling routing because the
`Application` has a `Routing` child. Each `page` command then registers the page
under the path of the `Route` that targets it.

```bash
ng generate angular-django2:application --document=app.openui.json
ng generate angular-django2:page --document=app.openui.json --node-id=home --path=src/app/features/home
ng generate angular-django2:page --document=app.openui.json --node-id=orders --path=src/app/features/orders
```

`material-app` builds the same application with the Material layout: a toolbar
with the `ToolAction` rows (`produces.activate: null` generates an
`on<ActionId>Activate($event)` handler stub), and a sidenav with one link per
`NavItem`.

```bash
ng generate angular-django2:material-app --document=app.openui.json
```

## Rejected documents

A document is rejected before any file changes. The validator reports each
problem as `path: code: message`, where the code names the stage: `grammar`,
`document`, `catalog`, or `contract`.

### The pre-0.6.0 attribute keys

Attribute keys carry their category as a prefix. The bracket and parenthesis
forms of earlier versions are no longer keys.

<!-- openui: invalid -->

```json
{
  "version": "0.8.0",
  "id": "root",
  "type": "html",
  "children": [
    {
      "id": "contact",
      "type": "Form",
      "attrs": { "[title]": "\"Contact us\"", "(submit)": "save()" }
    }
  ]
}
```

```text
/children/0/attrs/[title]: grammar/invalid-key: invalid attribute key [title]
/children/0/attrs/(submit): grammar/invalid-key: invalid attribute key (submit)
```

### A document for another version

<!-- openui: invalid -->

```json
{
  "version": "0.4.0",
  "id": "root",
  "type": "html",
  "children": [{ "id": "contact", "type": "Form" }]
}
```

```text
/version: document/unsupported-version: spec version 0.4.0 is not 0.8.0, the version this tool implements
```

### A reference to nothing

A reference is a quoted element id, and the validator resolves it. The type of
the target is checked when the attribute is declared as `reference(Type)`.

<!-- openui: invalid -->

```json
{
  "version": "0.8.0",
  "id": "root",
  "type": "html",
  "children": [
    {
      "id": "homeNavigation",
      "type": "NavItem",
      "attrs": { "uses.label": "\"Home\"", "uses.route": "\"homeRoute\"" }
    }
  ]
}
```

```text
/children/0/attrs/uses.route: contract/unresolved-reference: uses.route names no element: homeRoute
```

### A string that is not a literal

The validator accepts an unquoted string for any attribute, because it is a
binding expression in the target language. The schematics generate static code, so
they only accept a quoted literal and stop with the message below.

<!-- openui: rejected -->

```json
{
  "version": "0.8.0",
  "id": "root",
  "type": "html",
  "children": [
    {
      "id": "contact",
      "type": "Form",
      "attrs": { "uses.title": "Contact us", "uses.action": "\"/api/contacts/\"" }
    }
  ]
}
```

```bash
ng generate angular-django2:reactive-form contact --document=forms/rejected.openui.json --node-id=contact
```

```text
OpenUI node "forms/rejected.openui.json#contact": attribute "uses.title" must be a quoted string literal, for example "\"text\"", not "Contact us". An unquoted string is a binding expression, which is not compiled.
```
