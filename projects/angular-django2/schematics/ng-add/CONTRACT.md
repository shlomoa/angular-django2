# ng-add Schematic Contract

## Purpose

The `ng-add` schematic registers `angular-django2` as a schematic collection in the Angular workspace's `angular.json` configuration file. This schematic is invoked by `ng add angular-django2` and is a critical dependency for the djng `ng-workspace` skill.

## Input

The schematic accepts **no options** (empty schema). It operates on the workspace `angular.json` file from the schematics `Tree`.

## Behavior

| Precondition                                               | Behavior                                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `angular.json` is present and parseable                    | Register the collection; see output specification below                                          |
| `angular.json` is missing                                  | Throw `SchematicsException` with message: `Could not find angular.json in the target workspace.` |
| `angular.json` is present but not valid JSON               | Throw a JSON parse error (not swallowed)                                                         |
| `angular-django2` is already in `cli.schematicCollections` | Return unchanged tree (idempotent, no-op)                                                        |

## Output

When `angular.json` is present and `angular-django2` is not yet registered:

- `angular.json` is updated in-place.
- `cli.schematicCollections` is set to `['angular-django2', ...existingCollections]` — i.e., `angular-django2` is **prepended** so it takes precedence over later-registered collections.
- All other `angular.json` content remains unchanged.
- The file ends with a newline and is formatted with 2-space indentation (Angular CLI conventions).
- If `cli` did not previously exist, it is created: `{ "cli": { "schematicCollections": ["angular-django2"] } }`.

## Side Effects

**None** beyond updating `angular.json`. The schematic does not:

- Install npm packages
- Create files
- Modify `package.json`

## Examples

### Before (no cli key)

```json
{
  "version": 1,
  "projects": { "my-app": {} }
}
```

### After

```json
{
  "version": 1,
  "projects": { "my-app": {} },
  "cli": {
    "schematicCollections": ["angular-django2"]
  }
}
```

---

### Before (existing collections)

```json
{
  "cli": {
    "schematicCollections": ["@schematics/angular"]
  }
}
```

### After

```json
{
  "cli": {
    "schematicCollections": ["angular-django2", "@schematics/angular"]
  }
}
```

## Test Coverage

All behavior is verified in `tests/schematics.spec.ts`:

- **TC-01:** Registers collection in a workspace with no existing cli config
- **TC-02:** Registers collection prepended before existing collections
- **TC-03:** Is idempotent — does not duplicate an already-registered collection
- **TC-04:** Throws when angular.json is missing
- **TC-05:** Preserves all other angular.json content unchanged
- **TC-06:** Output is valid JSON with 2-space indentation and trailing newline

## Related

This schematic is used by the [django-angular3](https://github.com/shlomoa/django-angular3) integration package to register `angular-django2` (ngdj) as a schematic collection. The django-angular3 package invokes this schematic using `django-admin` commands.
