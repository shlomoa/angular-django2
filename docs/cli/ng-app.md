# ng-app

Generate a Django-friendly Angular app with Material UI and an app shell.

```bash
ng generate angular-django2:ng-app my-app --theme=indigo-pink --typography=true --animations=true --ssr=false --zoneless=true --defaults
```

It composes the lower-level [`application`](application.md),
[`material-setup`](material-setup.md),
[`project-structure`](project-structure.md), and [`app-shell`](app-shell.md)
schematics. It also adds the Google Material Icons stylesheet to the generated
app `index.html` so the shell's `mat-icon` ligatures render correctly.

Supported options:

| Option         | Default                      | Description                                                                                                       |
| -------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `name`         | Required positional argument | Application name.                                                                                                 |
| `--theme`      | `indigo-pink`                 | Angular Material prebuilt theme: `indigo-pink`, `deeppurple-amber`, `pink-bluegrey`, `purple-green`, or `custom`. |
| `--typography` | `true`                         | Include Angular Material typography styles.                                                                       |
| `--animations` | `true`                         | Enable Angular animations.                                                                                         |
| `--routing`    | `true`                         | Enable routing.                                                                                                   |
| `--standalone` | `true`                         | Generate standalone components.                                                                                   |
| `--ssr`        | `false`                        | Configure the generated application for SSR and SSG/prerendering.                                                 |
| `--zoneless`   | `true`                         | Generate an application that does not use `zone.js`.                                                              |
| `--defaults`   | `true`                         | Disable interactive prompts for options that have defaults.                                                       |
| `--style`      | `scss`                         | Stylesheet format.                                                                                                 |
| `--prefix`     | `app`                          | Component selector prefix.                                                                                        |
