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

## OpenUI application documents

With `--document`, the application is compiled from an OpenUI `Application`
node (the first, or the one named by `--node-id`); `--theme`, `--typography`,
`--animations`, and `--routing` are not allowed.

```bash
ng generate angular-django2:material-app --document=app.openui.json
```

- `--name` defaults to the dasherized `Application` id; `[title]` sets the
  toolbar title.
- Routing is enabled when the `Application` has a `Routing` child.
- A `Presentation` child sets `[theme]` (a `--theme` value) and `[typography]`
  / `[animations]` (`"true"` or `"false"`).
- Every `DashboardPage` in the document adds a sidenav link after Home, using
  the page's `[route]`, `[title]`, and `[icon]` (see [`page`](page.md#openui-page-nodes)).
  `EmptyPage` nodes have no navigation. Navigation links require a `Routing`
  child.
