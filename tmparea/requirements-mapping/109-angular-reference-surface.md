# Angular requirements reference surface

## Source paths searched or read

- `tmparea/tmp_plan.md` — approved plan steps 1.1, 1.2.1-1.2.3, and 1.3.
- `tmparea/requirements-mapping/README.md` — intermediate-result requirements.
- `docs/REQUIREMENTS.md` — searched for the six exact terms and read the
  surrounding statements at lines 1-42 and 215-224.

## Exact results

The required literal-term search of `docs/REQUIREMENTS.md` found:

| Term              | Exact result                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `django-angular3` | 8 occurrences: line 13; line 27; line 32 twice (link text and URL); line 218 twice (link text and URL); lines 219 and 222. |
| `djng`            | 1 occurrence: line 31.                                                                                                     |
| `ngdj`            | 2 occurrences: lines 25 and 31.                                                                                            |
| `build_app`       | 0 occurrences.                                                                                                             |
| `OpenAPI`         | 0 occurrences.                                                                                                             |
| `OpenUI`          | 4 occurrences: lines 33, 35, 38, and 40.                                                                                   |

### Occurrence statements and classifications

No correctness assessment was made.

| Location                                       | Surrounding requirement statement                                                                                                                                                                                               | Classification      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Source-priority list, lines 13-14              | Use the `django-angular3` repository for Django-side integration details not specified here.                                                                                                                                    | Integration fact    |
| Terminology, lines 25-26                       | `angular-django2`, also called `ngdj`, is this Angular 22 workspace and produces a Django-friendly npm schematics package.                                                                                                      | Terminology         |
| Terminology, lines 27-29                       | `django-angular3` is a companion Django package that provides `django-admin` management commands for Angular workspace operations, including automatic `ng add angular-django2` invocation.                                     | Integration fact    |
| Terminology, lines 30-32                       | `djangoangular` is the Django-Angular integration code name formed by `djng` and `ngdj`; its canonical definition is in `django-angular3` architecture §2.6.1.                                                                  | Terminology         |
| Terminology, lines 33-42                       | OpenUI is an external UI-description specification whose contract is defined by the linked OpenUI sources; schematics accepting an OpenUI document must validate it with the bundled parser before mutating the workspace tree. | External dependency |
| Django Integration Requirements, lines 217-218 | This library is designed to integrate with `django-angular3`.                                                                                                                                                                   | Integration fact    |
| Django Integration Requirements, lines 219-220 | `django-angular3` provides `django-admin` management commands for Angular workspace operations.                                                                                                                                 | Integration fact    |
| Django Integration Requirements, lines 221-222 | `django-angular3` automatically invokes `ng add angular-django2` to register the schematic collection.                                                                                                                          | Integration fact    |

## Finite Angular claim inventory for cross-repository mapping

The following distinct claims require a `djng` requirements-document reference
if the user admits them to mapping:

1. **Integration relationship:** `angular-django2` is designed to integrate with
   `django-angular3` (`docs/REQUIREMENTS.md:217-218`).
2. **Workspace operations:** `django-angular3` provides `django-admin`
   management commands for Angular workspace operations
   (`docs/REQUIREMENTS.md:27-29,219-220`).
3. **Schematic registration:** `django-angular3` automatically invokes
   `ng add angular-django2` to register the schematic collection
   (`docs/REQUIREMENTS.md:27-29,221-222`).

The source-priority statement, terminology statements, and OpenUI external
dependency statement are not claims for `djng` requirements-document mapping.
The `djangoangular` terminology statement already retains its
architecture-owned reference and is therefore excluded.

## Completed plan steps

- [x] 1.1 — searched `docs/REQUIREMENTS.md` for the six specified exact terms.
- [x] 1.2.1 — recorded each occurrence statement and section.
- [x] 1.2.2 — classified each statement.
- [x] 1.2.3 — did not assess correctness.
- [x] 1.3 — produced the finite claim inventory above.

## Required user intervention

**STOP.** The user must review the three-claim Angular inventory and explicitly
select the claims permitted to enter cross-repository mapping. Do not begin
Step 2 discovery, context reading, mapping, assessment, or reference edits
until that review gate resolves.

## Required GitHub handoff

GitHub issue-comment update capability was unavailable. The user must update
issues #108, #110, #111, #112, #113, #114, and #115 with:

> `tmparea/requirements-mapping/109-angular-reference-surface.md` — Step 1 is
> complete; three Angular integration claims await user selection before Step 2.
