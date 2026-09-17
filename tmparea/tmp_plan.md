## Revised plan

### 1. Identify the Angular-side reference surface

1.1. Search `angular-django2/docs/REQUIREMENTS.md` for exact occurrences of:

- `django-angular3`
- `djng`
- `ngdj`
- `build_app`
- `OpenAPI`
- `OpenUI`

1.2. For each occurrence:
1.2.1. Record its section and surrounding requirement statement.  
1.2.2. Classify it as terminology, integration fact, generated-app requirement, planned orchestration, or external dependency.  
1.2.3. Do **not** assess correctness yet.

1.3. Produce the finite list of Angular claims requiring a `djng` document reference.

### 2. Identify the relevant `djng` requirement sources

#### 2.1. Corpus inventory — **complete**

2.1.1. List files under `django-angular3/doc/requirements/`.  
2.1.2. Read only each document’s heading and declared scope/ownership.  
2.1.3. Record the five owners without reviewing their detailed contents.

#### 2.2. `REQUIREMENTS.md` discovery

2.2.1. Search only for exact `ngdj` and `angular-django2` occurrences.  
2.2.1.1. Record each occurrence’s section location.  
2.2.1.2. Report the occurrence count and locations only.  
2.2.1.3. Do not infer behavior or consistency.

2.2.2. For each located occurrence, request approval before reading its immediate context.

2.2.3. After approved context reads:
2.2.3.1. Identify whether it establishes `djng` ownership, an `ngdj` boundary, or merely terminology.  
2.2.3.2. Record its candidate Angular reference target.

#### 2.3. `APPLICATION_FUNCTIONAL_REQUIREMENTS.md` discovery

2.3.1. Search only for exact `ngdj`, `angular-django2`, `Angular`, `OpenAPI`, and `OpenUI` occurrences.  
2.3.2. Record locations only.  
2.3.3. Request approval before contextual reading of any result.  
2.3.4. For approved results, identify only requirements that constrain Angular-generated outputs or governed inputs.

#### 2.4. `APPLICATION_QUALITY_REQUIREMENTS.md` discovery

2.4.1. Search only for exact `ngdj`, `angular-django2`, and `Angular` occurrences.  
2.4.2. Record locations only.  
2.4.3. Request approval before contextual reading.  
2.4.4. Include a result in the map only if it directly constrains `ngdj` output or integration.

#### 2.5. `APP_BUILDER_REQUIREMENTS.md` discovery

2.5.1. Search only for exact `ngdj`, `angular-django2`, wrapper-command names, and schematic names.  
2.5.2. Record locations and distinguish declared current implementation status from target-state behavior.  
2.5.3. Request approval before contextual reading.  
2.5.4. For approved results, identify only direct wrapper-selection or schematic-orchestration claims.

#### 2.6. `AI_AUTOMATION_REQUIREMENTS.md` discovery

2.6.1. Search only for exact `ngdj` and `angular-django2` occurrences.  
2.6.2. If absent, record the document as having no direct Angular-package requirement.  
2.6.3. If present, request approval before reading context.

### 3. Build the bounded mapping

3.1. Take one Angular claim from step 1 at a time.

3.1.1. Match it only to a `djng` requirement passage identified and context-approved in step 2.  
3.1.2. Record the exact source file and section.  
3.1.3. Mark whether the source is current integration boundary, generated-app target requirement, planned `build_app` behavior, or unrelated/out of scope.

3.2. Do not add a `djng` reference where no direct requirement owner exists; retain architecture links for architecture-owned facts.

### 4. Assess and report inconsistencies

4.1. Assess one mapped pair at a time.

4.1.1. Compare only the explicit claims.  
4.1.2. Separate an actual contradiction from a scope/ownership distinction or current-versus-target-state difference.  
4.1.3. Verify implementation claims against the source hierarchy required by `angular-django2/copilot-instructions.md`.

4.2. Report each finding with the Angular and `djng` source locations, classification, explanation, and recommended resolution owner.

4.3. Do not edit either repository during this step.

### 5. Propose reference edits

5.1. Draft only reference-link changes for `angular-django2/docs/REQUIREMENTS.md`.  
5.2. Preserve the existing distinction between `ngdj` package requirements and `djng` generated-app requirements.  
5.3. Present the exact proposed edits and wait for approval.

### 6. Apply approved edits

6.1. Re-read the current Angular requirements file immediately before editing.  
6.2. Apply only the approved reference changes.  
6.3. Do not alter substantive requirements unless separately approved.

### 7. Validate and close

7.1. Run `npm run format:check` in `angular-django2`.  
7.2. Report validation output and the final inconsistency list.  
7.3. Identify any follow-up that belongs in `django-angular3`, without making those changes.
