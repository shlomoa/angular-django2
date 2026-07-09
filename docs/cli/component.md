# component

Generate a standalone OnPush component with embedding hooks.

```bash
ng generate angular-django2:component <name>
```

Options: project-relative `--path`, `--project`, `--standalone` default
`true`, `--changeDetection` default `OnPush`. Seeds begin/end
import/services/input/output/children markers.

Use [`embed-component`](embed-component.md) to wire a generated component into
a parent using those markers.
