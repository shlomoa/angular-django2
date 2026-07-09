# embed-component

Embed a component into a parent component.

```bash
ng generate angular-django2:embed-component --component=<path> --parent=<path>
```

Options: file mode: `--component` (child `.ts` path), `--parent` (parent `.ts`
path). Package mode (add `--from`): `--component` (exported class name),
`--from` (module specifier), `--selector`, `--inputs`, `--outputs`
(comma-separated). Wires the child element, imports, `imports` array entry,
and `on<Output>()` stubs; idempotent.

Use this to wire a component generated with [`component`](component.md) into a
parent using its embedding markers.
