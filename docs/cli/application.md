# application

Generate an Angular application using package defaults.

```bash
ng generate angular-django2:application <name>
```

Options: `--routing` default `true`, `--standalone` default `true`, `--ssr`
default `false`, `--zoneless` default `true`, `--style` default `scss`.

See the [step-by-step app setup](index.md#step-by-step-app-setup) flow to
combine this with [`material-setup`](material-setup.md) and
[`project-structure`](project-structure.md). That flow produces a
Material-configured app with the standard structure but not the sidenav layout,
which only [`material-app`](material-app.md) writes.
