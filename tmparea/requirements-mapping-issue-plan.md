# Requirements mapping issue index

## Scope

This Epic tracks a review-gated mapping from
`docs/REQUIREMENTS.md` to `django-angular3/doc/requirements/`.

The plan is in [`tmp_plan.md`](../tmp_plan.md). Intermediate-result file rules
are in [`README.md`](README.md).

## GitHub issue migration

This is the replacement issue graph for mistakenly created
`django-angular3` issues #176-#190. The source issues are closed as superseded.

| Purpose | `angular-django2` issue |
| --- | --- |
| Epic | [#108](https://github.com/shlomoa/angular-django2/issues/108) |
| Angular reference discovery | [#109](https://github.com/shlomoa/angular-django2/issues/109) |
| Baseline requirement discovery | [#110](https://github.com/shlomoa/angular-django2/issues/110) |
| Functional requirement discovery | [#111](https://github.com/shlomoa/angular-django2/issues/111) |
| Quality requirement discovery | [#112](https://github.com/shlomoa/angular-django2/issues/112) |
| App-builder requirement discovery | [#113](https://github.com/shlomoa/angular-django2/issues/113) |
| AI-automation requirement discovery | [#114](https://github.com/shlomoa/angular-django2/issues/114) |
| Discovery-output review | [#115](https://github.com/shlomoa/angular-django2/issues/115) |
| Context-work-item coordination | [#116](https://github.com/shlomoa/angular-django2/issues/116) |
| Mapping-work-item coordination | [#117](https://github.com/shlomoa/angular-django2/issues/117) |
| Assessment-work-item coordination | [#118](https://github.com/shlomoa/angular-django2/issues/118) |
| Proposal-batch selection | [#119](https://github.com/shlomoa/angular-django2/issues/119) |
| Reference-edit proposal | [#120](https://github.com/shlomoa/angular-django2/issues/120) |
| Apply approved links | [#121](https://github.com/shlomoa/angular-django2/issues/121) |
| Validation | [#122](https://github.com/shlomoa/angular-django2/issues/122) |

## Execution order

1. Issues #109-#114 may run in parallel and each stops at its user-review gate.
2. #115 is blocked by #109-#114.
3. #116 is blocked by #115 and creates one context child issue per
   user-approved occurrence.
4. #117 is blocked by #109 and creates one mapping child issue per
   user-approved claim/source pair; it must also be blocked by each approved
   context child when that child is created.
5. #118 creates one assessment child issue per user-approved mapping and must
   be blocked by each approved mapping child when created.
6. #119 selects a user-approved assessment batch and must be blocked by every
   user-resolved assessment included in that batch.
7. #120 is blocked by #119; #121 is blocked by #120; #122 is blocked by #121.

Issues #116-#118 are coordination-only: they create bounded child issues after
the preceding user-intervention gate and must not perform variable-size corpus
work themselves.
