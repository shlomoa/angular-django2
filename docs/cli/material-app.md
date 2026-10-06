# material-app

Generate a Django-friendly Angular app with Material UI and a sidenav layout.

```bash
ng generate angular-django2:material-app my-app --theme=indigo-pink --typography=true --animations=true --ssr=false --zoneless=true --defaults
```

It composes the lower-level [`application`](application.md),
[`material-setup`](material-setup.md), and
[`project-structure`](project-structure.md) schematics, then writes its own
responsive Material sidenav layout (toolbar, sidenav, and `router-outlet`)
into the generated app's root component. This layout is separate from the
standalone [`app-shell`](app-shell.md) schematic, which wraps Angular's own
SSR/prerendering app-shell feature and is unrelated to Material. `material-app`
also adds the Google Material Icons stylesheet to the generated app
`index.html` so the layout's `mat-icon` ligatures render correctly.

Supported options:

| Option         | Default                      | Description                                                                                                       |
| -------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `name`         | Required positional argument | Application name.                                                                                                 |
| `--theme`      | `indigo-pink`                | Angular Material prebuilt theme: `indigo-pink`, `deeppurple-amber`, `pink-bluegrey`, `purple-green`, or `custom`. |
| `--typography` | `true`                       | Include Angular Material typography styles.                                                                       |
| `--animations` | `true`                       | Enable Angular animations.                                                                                        |
| `--routing`    | `true`                       | Enable routing.                                                                                                   |
| `--standalone` | `true`                       | Generate standalone components.                                                                                   |
| `--ssr`        | `false`                      | Configure the generated application for SSR and SSG/prerendering.                                                 |
| `--zoneless`   | `true`                       | Generate an application that does not use `zone.js`.                                                              |
| `--defaults`   | `true`                       | Disable interactive prompts for options that have defaults.                                                       |
| `--style`      | `scss`                       | Stylesheet format.                                                                                                |
| `--prefix`     | `app`                        | Component selector prefix.                                                                                        |

## Re-running on an existing project

When the project already exists, `material-app` skips creating it and re-derives the
layout, so a changed document (a route, a navigation item, a toolbar action, the title or
a presentation token) is applied by running the same command again. The result matches a
clean regeneration, and an unchanged document leaves the output byte-identical.

The layout files mark the text the schematic owns between `openui:begin <name>` and
`openui:end <name>` comments:

| File          | Generated regions                                                      |
| ------------- | ---------------------------------------------------------------------- |
| `app.html`    | `toolbar` (the whole toolbar) and `nav` (the sidenav links after Home) |
| `app.scss`    | `layout`                                                               |
| `app.ts`      | `title`                                                                |
| `app.spec.ts` | `title` (the toolbar title assertion)                                  |

- A re-run replaces only the text inside these regions; anything you add around them
  (extra markup, styles, members, imports, tests) is kept. Do not edit inside a region:
  the next run overwrites it.
- Toolbar action handlers are not in a region. A re-run adds a stub for a new
  `produces.activate` action and never changes or removes a handler, so an implemented
  handler survives, and so does one whose action left the document.
- A file without any region (Angular's default file, or output of an earlier version, or a
  file written by hand) is replaced whole once; later runs keep your edits.
- If you delete the markers of one region in a file that has others, that region is left
  as it is and the run logs a warning.
- A `Presentation` change is applied by [`material-setup`](material-setup.md#re-running).

## OpenUI application documents

With `--document`, the application is compiled from an OpenUI `Application`
node (the first, or the one named by `--node-id`); `--theme`, `--typography`,
`--animations`, and `--routing` are not allowed.

```bash
ng generate angular-django2:material-app --document=app.openui.json
```

- `--name` defaults to the dasherized `Application` id; `html` `uses.title` sets the
  existing toolbar title.
- Routing is enabled when the `Application` has a `Routing` child.
- A `Presentation` child sets `uses.theme` (a `--theme` value) and
  `uses.typography` / `uses.animations` (`"true"` or `"false"`).
- Every `DashboardPage` in the document adds a sidenav link after Home, using
  the page's `uses.route`, `uses.title`, and `uses.icon` (see [`page`](page.md#openui-page-nodes)).
  `EmptyPage` nodes have no navigation. Navigation links require a `Routing`
  child.
- An optional `ToolBar` `uses.ariaLabel` adds its ordered `ToolBarRow` command rows
  after the title row. Each `ToolAction` renders its required `uses.label`, optional
  `uses.icon`, and `uses.disabled` state; `produces.activate: null` generates a matching
  `on<ActionId>Activate($event)` handler stub for the application to implement.
