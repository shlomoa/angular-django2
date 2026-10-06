# tabs

Compile an OpenUI `Tabs` container (`containers/tabs`) into a standalone `OnPush`
Angular Material component.

```bash
ng generate angular-django2:tabs --document=src/app/app.openui.json --node-id=settingsTabs
```

The schematic reads its content from an
[OpenUI](https://github.com/shlomoa/openui-spec) document: there is no CLI-only
form. Option names, attribute notation, and the document rules are those of the
[CLI overview](index.md#openui-documents).

## Options

| Option       | Required | Default         | Description                                                                         |
| ------------ | -------- | --------------- | ----------------------------------------------------------------------------------- |
| `--document` | yes      | —               | Workspace-relative path to the OpenUI JSON document.                                |
| `--node-id`  | no       | first `Tabs`    | Element id of the `Tabs` node to compile.                                           |
| `name`       | no       | dasherized id   | Kebab-case component name.                                                          |
| `--path`     | no       | `app` directory | Directory inside the application source root that receives the component directory. |
| `--project`  | no       | inferred        | Angular application project; required when more than one application is available.  |

## OpenUI tabs nodes

| Node   | Attribute                    | Value                                            | Result                                                               |
| :----- | :--------------------------- | :----------------------------------------------- | :------------------------------------------------------------------- |
| `Tabs` | `uses.selectedIndex`         | integer as an unquoted string, default `"0"`     | Initial value of the `selectedIndex` model signal.                   |
| `Tabs` | `uses.orientation`           | `"\"horizontal\""` (default) or `"\"vertical\""` | Material tab group, or an ARIA vertical tablist (see below).         |
| `Tabs` | `produces.selectedTabChange` | `null`                                           | Adds the `selectedTabChange` output, which emits `{ index, label }`. |
| `tab`  | `uses.label`†                | quoted string literal, required                  | The visible tab label.                                               |
| `tab`  | `uses.disabled`†             | `"true"` or `"false"`                            | A disabled tab cannot be selected.                                   |

† `angular-django2` extension: the catalog declares no attribute for a `tab`
(its scope leaves the label and disabled state to the tab). The
[command mapping](https://github.com/shlomoa/angular-django2/blob/main/projects/angular-django2/schematics/command-mapping.json)
lists these extensions under `ui.nodes.tab.attributes.extensions`.

A `Tabs` node needs at least one `tab` child. The schematic rejects, and never
ignores, every other attribute and child type, an out-of-range
`uses.selectedIndex`, a `uses.selectedIndex` that selects a disabled tab, and a
`produces.selectedTabChange` that is not `null`. A **page stack** (tabs without
a visible tab strip) is not compiled: the contract has no attribute for it, so
every `Tabs` renders its tab strip.

### Tab content

The children of a `tab` are its content. Each child is compiled into its own
component in a subdirectory of the tabs component and embedded into the body of
its tab, in document order, with the same composition engine that
[`component`](component.md#openui-surface-containers) uses. Supported content:
`SurfaceContainers`, `Form`, `TextInputs`, `RangeControl`, and a nested `Tabs`.
A content node cannot set `uses.slot`, because a tab has one body.

Tab bodies are created lazily: the horizontal template wraps the embedded
elements in `<ng-template matTabContent>`, and the vertical template renders
only the panel of the selected tab. The child components are still imported
statically; the schematic does not generate `@defer` blocks.

### Orientation

| `uses.orientation` | Template                                                                                                                                                                                                           |
| :----------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `horizontal`       | `<mat-tab-group>` with `MatTabsModule`, two-way bound to `selectedIndex`.                                                                                                                                          |
| `vertical`         | `role="tablist"` with `aria-orientation="vertical"` of Material buttons and `role="tabpanel"` panels, because `mat-tab-group` has no vertical orientation. Arrow Up, Arrow Down, Home, and End move the selection. |

## Generated artifacts

For `settingsTabs` at the default path the schematic creates, next to the
component of every content node:

- `settings-tabs/settings-tabs.ts` — a standalone `OnPush` component with the
  begin/end embedding markers, the `selectedIndex` model signal, and, with
  `produces.selectedTabChange`, the `selectedTabChange` output and its
  `SettingsTabsTabChange` payload type
- `settings-tabs/settings-tabs.html` — the template, with one
  `tab-<tab id>` section per tab
- `settings-tabs/settings-tabs.<style>` and `settings-tabs.spec.ts`, as for
  [`component`](component.md)

A host can embed the component with [`embed-component`](embed-component.md) and
bind `[selectedIndex]` and `(selectedTabChange)`.

## Prerequisites

- a selected Angular application project with `sourceRoot`
- `@angular/material` installed (`@angular/cdk` and `@angular/forms` for `Form` and control content)

Run `ng add @angular/material` before running this schematic.
