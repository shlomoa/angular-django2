export type GuideId =
  | 'basic-tutorial'
  | 'complex-components'
  | 'data-flow'
  | 'forms'
  | 'quality'
  | 'security';

export interface GuideSection {
  readonly title: string;
  readonly body: readonly string[];
  readonly steps?: readonly string[];
}

export interface Guide {
  readonly id: GuideId;
  readonly order: string;
  readonly name: string;
  readonly summary: string;
  readonly icon: string;
  readonly sections: readonly GuideSection[];
}

export const GUIDES: readonly Guide[] = [
  {
    id: 'basic-tutorial',
    order: '3.1',
    name: 'Basic tutorial',
    summary:
      'A strawman walkthrough for standing up a Django-friendly Angular app with angular-django2.',
    icon: 'school',
    sections: [
      {
        title: 'Goal',
        body: [
          'Follow the shortest path from an empty workspace to a runnable Angular Material app that ' +
            'keeps Django API, credential, and CSRF behavior explicit in code.',
        ],
      },
      {
        title: 'Steps',
        body: ['Run the schematic flow, then wire the standalone providers.'],
        steps: [
          'ng add angular-django2 to register the schematic collection.',
          'ng generate angular-django2:ng-app my-app to scaffold a Material app in one step.',
          'Add provideAngularDjango2({ apiBaseUrl: \u0027/api\u0027 }) to the application config.',
          'Serve the app and confirm the resolved API base and CSRF header values render.',
        ],
      },
      {
        title: 'What to expect',
        body: [
          'The generated app boots with standalone routing, zoneless change detection, and SCSS. ' +
            'API URLs are built from the configured base URL instead of being hidden inside the package.',
        ],
      },
    ],
  },
  {
    id: 'complex-components',
    order: '3.2',
    name: 'Complex physical components',
    summary:
      'Compose larger UI surfaces by embedding generated components through the package embedding hooks.',
    icon: 'widgets',
    sections: [
      {
        title: 'Generate building blocks',
        body: [
          'Use ng generate angular-django2:component to create standalone, OnPush components that ' +
            'already include begin/end embedding hooks for imports, injected services, input signals, ' +
            'output signals, and template children.',
        ],
      },
      {
        title: 'Embed children into a parent',
        body: ['Wire a generated child component into a parent using the embedding hooks.'],
        steps: [
          'ng generate angular-django2:embed-component --component <child.ts> --parent <parent.ts>.',
          'The child element is added after the parent template children marker.',
          'Input signals are fed and output signals are bound to on<Output>() handler stubs.',
          'The child class is imported and registered in the parent imports array.',
        ],
      },
      {
        title: 'Why it matters',
        body: [
          'Physical components stay small and composable, and the wiring between them remains visible ' +
            'in the template and TypeScript instead of relying on hidden abstractions.',
        ],
      },
    ],
  },
  {
    id: 'data-flow',
    order: '3.3',
    name: 'Data flow integration and binding',
    summary:
      'Connect components to the Django API with typed data services and Angular signal binding.',
    icon: 'sync_alt',
    sections: [
      {
        title: 'Generate a typed API client',
        body: [
          'Bootstrap ng-openapi-gen with ng generate angular-django2:ng-api --inputPath=openapi.json, ' +
            'then run the generate:api script to produce typed services from the Django OpenAPI document.',
        ],
      },
      {
        title: 'Wrap the API in a data service',
        body: [
          'Use ng generate angular-django2:data-service to add a typed *DataService wrapper with search ' +
            'and CRUD helpers around the generated *ApiService, so components depend on the wrapper instead ' +
            'of raw generated services.',
        ],
      },
      {
        title: 'Bind data in the template',
        body: [
          'Expose data as signals and bind them with the control flow blocks. Reads flow from the data ' +
            'service into signals, and template events flow back into service calls, keeping the data ' +
            'direction explicit.',
        ],
      },
    ],
  },
  {
    id: 'forms',
    order: '3.4',
    name: 'Forms',
    summary:
      'Build reactive forms that submit to Django endpoints with visible CSRF and credentials.',
    icon: 'edit_note',
    sections: [
      {
        title: 'Build a reactive form',
        body: [
          'Use Angular reactive forms and Material form-field controls to capture input, and submit ' +
            'through a typed data service so the request target stays explicit.',
        ],
      },
      {
        title: '(Inter)Actions',
        body: [
          'Model interactions as explicit actions: a submit action calls the data service, disables the ' +
            'control while pending, and surfaces validation or server errors back to the user.',
        ],
        steps: [
          'Disable submit while a request is in flight.',
          'Map Django validation errors onto the matching form controls.',
          'Reset or navigate on success so the interaction has a clear end state.',
        ],
      },
      {
        title: 'CSRF and credentials',
        body: [
          'Prefer Angular\u0027s provideHttpClient(...) with withXsrfConfiguration(...) alongside ' +
            'provideAngularDjango2(...) so the CSRF header name and withCredentials behavior stay visible ' +
            'for form submissions.',
        ],
      },
    ],
  },
  {
    id: 'quality',
    order: '3.5',
    name: 'Quality',
    summary: 'Keep the app healthy with the shared format, lint, test, and build scripts.',
    icon: 'verified',
    sections: [
      {
        title: 'Verification commands',
        body: ['Use the shared root package scripts rather than ad hoc commands.'],
        steps: [
          'npm run format:check to verify formatting.',
          'npm run lint to run the Angular ESLint rules.',
          'npm run test:ci to run node, library, and reference-app tests.',
          'npm run build to produce the publishable library output.',
        ],
      },
      {
        title: 'Testing practices',
        body: [
          'Generated components and services ship with focused spec files. Keep tests close to the code ' +
            'they cover and only report a command as successful once it has actually run.',
        ],
      },
    ],
  },
  {
    id: 'security',
    order: '3.6',
    name: 'Security',
    summary: 'Keep Django auth boundaries, CSRF naming, and credentials explicit in the app.',
    icon: 'security',
    sections: [
      {
        title: 'Explicit CSRF configuration',
        body: [
          'The package stores csrfCookieName and csrfHeaderName in configuration and exposes a csrfHeader() ' +
            'helper. It does not ship a hidden interceptor, so CSRF wiring stays visible in the app code.',
        ],
      },
      {
        title: 'Credentials and auth boundaries',
        body: [
          'withCredentials is stored in config but is not applied automatically. Pair provideAngularDjango2(...) ' +
            'with Angular\u0027s provideHttpClient(...) and withXsrfConfiguration(...) so credentialed requests and ' +
            'auth boundaries remain intentional.',
        ],
      },
      {
        title: 'Review checklist',
        body: ['Confirm the security-sensitive boundaries before shipping.'],
        steps: [
          'API base URL points at the intended Django origin.',
          'CSRF cookie and header names match the Django configuration.',
          'Credentialed requests are limited to trusted endpoints.',
        ],
      },
    ],
  },
] as const;

export function getGuide(guideId: GuideId): Guide {
  const guide = GUIDES.find((candidate) => candidate.id === guideId);

  if (!guide) {
    throw new Error(`Unknown guide: ${guideId}`);
  }

  return guide;
}
