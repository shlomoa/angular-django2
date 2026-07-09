# ng-add

Register `angular-django2` as a schematic collection.

```bash
ng add angular-django2
```

Options: No options.

`ng add angular-django2` registers the schematics collection in `angular.json`.
If you need to configure it manually, add the collection before the default
Angular schematics collection:

```json
{
  "cli": {
    "schematicCollections": ["angular-django2", "@schematics/angular"]
  }
}
```
