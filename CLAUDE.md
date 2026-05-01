# CLAUDE.md

This repository is `angular-django2`, an Angular 21 library workspace for a Django-friendly npm package.

## Required Reading

**MANDATORY:** You MUST follow the detailed guidance in [.github/copilot-instructions.md](./.github/copilot-instructions.md). That file contains:

- Comprehensive planning and collaboration rules
- Implementation rules (KISS, DRY, Single source of truth)
- Plan execution rules for both interactive and agentic modes
- General definitions for context, ambiguity, and sufficient information

Use [AGENTS.md](./AGENTS.md) as the canonical shared guidance for all agents.

## Architecture

### Repository Structure

This is an **Angular library workspace**, not an application:

```
angular-django2/
├── projects/angular-django2/        # Library source (source of truth)
│   ├── src/lib/                     # Runtime library code
│   │   ├── angular-django2.service.ts
│   │   ├── angular-django2.config.ts
│   │   └── public-api.ts            # Public API exports
│   └── schematics/                  # Angular CLI schematics
│       ├── ng-add/                  # Registration schematic
│       ├── application/             # App generation
│       ├── component/               # Component generation
│       └── service/                 # Service generation
├── dist/angular-django2/            # Published build output
├── tests/                           # Node-side tests
├── tools/                           # Repository automation
└── docs/                            # Documentation
```

### Integration Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Django Backend (django-angular3)                       │
│  • Django management commands (django-admin)            │
│  • Automatic ng add angular-django2 invocation          │
│  • Angular workspace operations                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ integrates with
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Angular Frontend (angular-django2 / ngdj)              │
│                                                          │
│  Runtime API:                                            │
│  • provideAngularDjango2(config?)  - DI provider        │
│  • ANGULAR_DJANGO2_CONFIG          - injection token    │
│  • AngularDjango2Service           - URL/CSRF utilities │
│                                                          │
│  Configuration (Django conventions):                     │
│  • apiBaseUrl: ''                                        │
│  • csrfCookieName: 'csrftoken'                          │
│  • csrfHeaderName: 'X-CSRFToken'                        │
│  • withCredentials: true                                │
│                                                          │
│  Schematics:                                             │
│  • ng-add          - register collection                │
│  • application     - standalone + routing               │
│  • component       - standalone + OnPush                │
│  • service, class  - pass-through behavior              │
└─────────────────────────────────────────────────────────┘
```

### Package Distribution

- **Package name:** `angular-django2` (also known as `ngdj`)
- **npm registry:** https://www.npmjs.com/package/angular-django2
- **Current state:** v0.1.2, pre-release (not production-ready)
- **Build output:** `dist/angular-django2`
- **Contents:** compiled runtime library + compiled schematics collection

### Typical Usage Pattern

```typescript
import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideAngularDjango2 } from 'angular-django2';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withXsrfConfiguration({
        cookieName: 'csrftoken',
        headerName: 'X-CSRFToken',
      }),
    ),
    provideAngularDjango2({
      apiBaseUrl: 'https://api.example.com',
      withCredentials: true,
    }),
  ],
};
```

## Coding Guidance

- Prefer standalone Angular patterns and provider functions.
- Keep Django-related configuration and CSRF behavior explicit.
- Keep the public API small and typed.
- Avoid speculative abstractions and unnecessary boilerplate.
- Treat this as an Angular **library package**, not an application, unless explicitly asked.

## Verification

Use package scripts from root `package.json`:

- `npm run format:check`
- `npm run lint`
- `npm run test:ci`
- `npm run build`
- `npm run pack:dry-run`

Only report commands as successful if they were actually run.

## Documentation Alignment

Keep these files synchronized:

- `README.md`
- `projects/angular-django2/README.md`
- `docs/RELEASING.md`
- `AGENTS.md`
- `.github/copilot-instructions.md`
- `CLAUDE.md` (this file)
- `GEMINI.md`
