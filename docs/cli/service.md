# service

Generate a service.

```bash
ng generate angular-django2:service <name>
```

This schematic wraps Angular's own `@schematics/angular:service`, making
`--path` project-relative and forwarding all other options unchanged.

## Options

The most relevant options are project-relative `--path` and `--project`. Because
this schematic forwards options to `@schematics/angular:service`, it also
accepts that schematic's full option set (for example `--flat`, `--type`, and
`--skip-tests`). See Angular's
[`service` documentation](https://angular.dev/cli/generate/service) for the
authoritative, version-specific list.
