# `site`

Assemble a routed Angular Material site from one bounded, non-CRM OpenUI JSON
source. `site` is an orchestrator: it delegates page, reactive-form, and
optional OpenAPI setup to their published contracts instead of generating a
client or backend authorization policy.

Assembly is deterministic: the same validated OpenUI source, options, and
workspace state select the same delegated operations and produce the same
output or the same explicit validation error.

```bash
ng generate angular-django2:site \
  --project=my-app \
  --source=src/app/openui/site.json
```

## Prerequisites

Run `workspace-setup` and `material-app` first when starting from an empty
workspace. `site` requires an existing standalone Angular application with
`app.routes.ts`, `provideRouter(routes)`, a Material prebuilt theme, and the
unmodified `material-app` root shell. It refuses to replace a custom shell or
navigation. It also requires Material, CDK, router, and HTTP dependencies (and
forms when the OpenUI source declares forms).

Protected pages require the named `--auth-guard` (default `authGuard`) to
already be imported and applied through `canActivate` in `app.routes.ts`.
Client guards guide navigation only; Django/DRF remains the authorization
boundary.

## OpenUI source contract

`--source` is a source-root-relative `.json` file and is the only input used to
discover pages, navigation, forms, and optional OpenAPI setup. No CRM resource
definition is accepted. Form definition paths are also source-root-relative and
are passed to [`reactive-form`](reactive-form.md); OpenAPI remains a separately
typed input and is passed to [`openapi-setup`](openapi-setup.md).

```json
{
  "pages": [
    {
      "name": "contact",
      "routePath": "contact",
      "access": "public",
      "navigation": { "id": "contact", "label": "Contact", "icon": "mail" }
    }
  ],
  "forms": [{ "name": "contact", "definition": "src/app/openui/contact-form.json" }],
  "openapi": {
    "spec": "openapi.json",
    "outputPath": "src/app/api",
    "helpersPath": "src/app/api-integration"
  }
}
```

Page names, route paths, and navigation identifiers must be unique. Page and
form output paths must remain under the selected application source root.
`site` validates the complete plan, including page/form contracts and protected
navigation, on a virtual branch before it mutates the workspace.

Without `--source`, pass `--defaults` to generate exactly one public `Home`
page at `/home`; omitting both fails.

## Output and lifecycle

`site` adds an explicit `provideHttpClient(withXsrfConfiguration(...))` provider
using Django's `csrftoken` / `X-CSRFToken` defaults, writes OpenUI navigation
into the known Material shell, invokes the owned page and form outputs, and
records the shell baseline and inspected definition in
`.angular-django2/site/<project>.json`.

| Option               | Default       | Description                                     |
| -------------------- | ------------- | ----------------------------------------------- |
| `--source`           | —             | Source-root-relative OpenUI JSON source.        |
| `--defaults`         | `false`       | Generate only the documented Home-only default. |
| `--project`          | inferred      | Target Angular application.                     |
| `--operation`        | `create`      | `create`, `modify`, or `delete`.                |
| `--confirm-delete`   | `false`       | Required for `delete`.                          |
| `--auth-guard`       | `authGuard`   | Existing guard identifier for protected pages.  |
| `--csrf-cookie-name` | `csrftoken`   | Django CSRF cookie name.                        |
| `--csrf-header-name` | `X-CSRFToken` | Django CSRF request header name.                |

Create and modify are idempotent. `modify` requires the ownership manifest and
refuses a changed shell. `delete` requires `--confirm-delete=true`, restores
only an unchanged site-owned shell, and removes only the ownership manifest;
it deliberately never deletes generated pages, forms, routes, or user-owned
navigation.
