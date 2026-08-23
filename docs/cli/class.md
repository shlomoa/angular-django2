# class

Generate a class.

```bash
ng generate angular-django2:class <name>
```

This schematic wraps Angular's own `@schematics/angular:class`, making `--path`
project-relative and forwarding all other options unchanged.

## Options

The most relevant options are project-relative `--path` and `--project`. Because
this schematic forwards options to `@schematics/angular:class`, it also accepts
that schematic's full option set (for example `--type` and `--skip-tests`). See
Angular's [`class` documentation](https://angular.dev/cli/generate/class) for
the authoritative, version-specific list.
