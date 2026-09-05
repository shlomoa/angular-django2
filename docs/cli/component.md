# component

Generate a standalone OnPush component with embedding hooks.

```bash
ng generate angular-django2:component <name>
```

This schematic wraps Angular's own `@schematics/angular:component`, applying
`--standalone=true` and `--change-detection=OnPush` as defaults, then seeds
begin/end markers used by [`embed-component`](embed-component.md).

## Options

The most relevant options are project-relative `--path`, `--project`,
`--standalone` (default `true`), and `--change-detection` (default `OnPush`).
Because this schematic forwards options to `@schematics/angular:component`, it
also accepts that schematic's full option set (for example `--selector`,
`--prefix`, `--style`, `--flat`, and `--inline-template`). See Angular's
[`component` documentation](https://angular.dev/cli/generate/component) for the
authoritative, version-specific list.

## Embedding markers

The schematic seeds begin/end `import`, `injected services`, `input signals`,
and `output signals` markers in the component `.ts` file, and a `children`
marker in the component template.

> **Inline templates:** The `children` marker is only written into a physical
> `.html` template. When you generate with `--inline-template`, no HTML file is
> created, so the `children` marker is absent and [`embed-component`](embed-component.md)
> cannot wire a child element into that component's view.

Use [`embed-component`](embed-component.md) to wire a generated component into
a parent using those markers.
