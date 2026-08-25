# angular-django2

[![Documentation Status](https://readthedocs.org/projects/angular-django2/badge/?version=latest)](https://angular-django2.readthedocs.io/)

`angular-django2` provides an Angular CLI schematics collection for custom `ng generate` flows in Django-backed applications. It covers application and workspace setup, Angular Material integration, pages and sites, reactive forms and form fields, component composition and embedding, and OpenAPI/Django data services.

Generation uses deterministic Angular CLI schematics with explicit, validated
inputs. The package does not load or execute AI agents, provider SDKs, prompts,
or SKILLS; external orchestrators may invoke the same public schematic
contracts without changing their behavior.

**Full documentation: <https://angular-django2.readthedocs.io/>**

## Install

```bash
ng add angular-django2
```

`ng add` registers the collection in `angular.json`. To register it manually:

```json
{
  "cli": {
    "schematicCollections": ["angular-django2", "@schematics/angular"]
  }
}
```

## Usage

Generate a complete Angular Material app in one step, then add features:

```bash
ng generate angular-django2:material-app my-app --defaults
ng generate angular-django2:page orders --project=my-app
ng generate angular-django2:reactive-form contact --project=my-app --definition=forms/contact-form.json
ng generate angular-django2:data-service users
```

See the [CLI reference](https://angular-django2.readthedocs.io/en/latest/cli/) for the full command list, options, and end-to-end flows.
