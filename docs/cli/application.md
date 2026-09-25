# application

Generate an Angular application using package defaults.

```bash
ng generate angular-django2:application <name>
```

Options: `--routing` default `true`, `--standalone` default `true`, `--ssr`
default `false`, `--zoneless` default `true`, `--style` default `scss`.

Combine this with [`material-setup`](material-setup.md) and
[`project-structure`](project-structure.md) for a Material-configured
application with the standard structure. Use [`material-app`](material-app.md)
instead when the responsive Material sidenav layout is also needed.

## OpenUI application documents

With `--document`, `--name` defaults to the dasherized id of the OpenUI
`Application` node (the first, or the one named by `--node-id`), and routing is
enabled when that node has a `Routing` child; `--routing` is not allowed.
An optional `ToolBar` is decoded and validated with its `ToolBarRow` and
`ToolAction` content. Use [`material-app`](material-app.md) to render those
validated command rows in a Material layout.

```bash
ng generate angular-django2:application --document=app.openui.json
```
