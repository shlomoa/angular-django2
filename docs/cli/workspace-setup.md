# workspace-setup

Initialize workspace-level files for an empty Angular workspace.

```bash
ng generate angular-django2:workspace-setup my-app
```

Options: optional `--project`; advanced `files` hooks are programmatic, not
command-line friendly.

Use `workspace-setup` before [`material-app`](material-app.md) in an empty
workspace. It writes workspace-level bootstrap files and validation setup for
the generated workspace. The schematic also supports advanced per-file
application source hooks through its `files` option.

Because the Angular CLI does not pass nested object options cleanly on the
command line, drive `files` programmatically through a wrapper schematic, a
test runner, or direct factory invocation.

Recognized file hook keys and targets:

| Key                  | Target path                 |
| -------------------- | --------------------------- |
| `favicon`            | `favicon.ico`               |
| `indexHtml`          | `index.html`                |
| `mainTs`             | `main.ts`                   |
| `stylesCss`          | `styles.css`                |
| `appConfigTs`        | `app/app.config.ts`         |
| `appComponentTs`     | `app/app.component.ts`      |
| `appComponentHtml`   | `app/app.component.html`    |
| `appComponentCss`    | `app/app.component.css`     |
| `appComponentSpecTs` | `app/app.component.spec.ts` |
| `appModuleTs`        | `app/app.module.ts`         |
| `appRoutesTs`        | `app/app.routes.ts`         |

Each hook accepts exactly one content source:

| Mode       | Field      | Behavior                                                                                                                                              |
| ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inline     | `content`  | Write the supplied content directly to the target file, overwriting any existing file.                                                                |
| Local file | `path`     | Read content from an absolute path or a path relative to the current working directory at schematic execution time.                                   |
| Template   | `template` | Write a literal template and replace `{{key}}` placeholders from `params`. Optional whitespace inside the braces (e.g. `{{ key }}`) is also accepted. |
