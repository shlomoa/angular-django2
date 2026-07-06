export type UiCommandCategoryId =
  | 'workspace-setup'
  | 'application-creation'
  | 'ui-material-shell'
  | 'project-structure'
  | 'code-generation'
  | 'api-data';

export type UiCommandId =
  | 'ng-add'
  | 'application'
  | 'app-shell'
  | 'class'
  | 'component'
  | 'service'
  | 'material-setup'
  | 'project-structure'
  | 'ng-app'
  | 'ng-workspace'
  | 'ng-api'
  | 'data-service';

export type UiCommandEffect = 'visual' | 'text';

export type UiCommandCategoryCard =
  | {
      readonly kind: 'image';
      readonly description: string;
      readonly imagePath: string;
      readonly imageAlt: string;
    }
  | {
      readonly kind: 'text';
      readonly description: string;
      readonly imagePath?: never;
      readonly imageAlt?: never;
    };

export interface UiCommandCategory {
  readonly id: UiCommandCategoryId;
  readonly name: string;
  readonly summary: string;
  readonly card: UiCommandCategoryCard;
}

export interface UiCommandExampleState {
  readonly title: string;
  readonly description: string;
  readonly highlights: readonly string[];
}

export interface UiCommand {
  readonly id: UiCommandId;
  readonly categoryId: UiCommandCategoryId;
  readonly name: string;
  readonly command: string;
  readonly summary: string;
  readonly effect: UiCommandEffect;
  readonly before: UiCommandExampleState;
  readonly after: UiCommandExampleState;
  readonly illustration?: {
    readonly imagePath: string;
    readonly imageAlt: string;
  };
}

export const UI_COMMAND_CATEGORIES: readonly UiCommandCategory[] = [
  {
    id: 'workspace-setup',
    name: 'Workspace setup',
    summary: 'Register the collection and prepare an empty Angular workspace for package commands.',
    card: {
      kind: 'text',
      description:
        'Configuration-first commands that update workspace-level files before app code exists.',
    },
  },
  {
    id: 'application-creation',
    name: 'Application creation',
    summary:
      'Create Angular applications, from a plain app wrapper to the Django-friendly full app flow.',
    card: {
      kind: 'image',
      description: 'App creation commands with visible project and shell results.',
      imagePath: '/ui-categories/application-creation.svg',
      imageAlt: 'Application window layout illustration',
    },
  },
  {
    id: 'ui-material-shell',
    name: 'UI and Material shell',
    summary:
      'Configure Angular Material and generate the responsive shell users see in the browser.',
    card: {
      kind: 'image',
      description: 'Material theme and shell commands that visibly affect the app UI.',
      imagePath: '/ui-categories/ui-material-shell.svg',
      imageAlt: 'Material toolbar and navigation shell illustration',
    },
  },
  {
    id: 'project-structure',
    name: 'Project structure',
    summary:
      'Create conventional source folders and barrel files for maintainable app organization.',
    card: {
      kind: 'text',
      description: 'Folder and barrel-file commands without a direct visual UI surface.',
    },
  },
  {
    id: 'code-generation',
    name: 'Code generation',
    summary: 'Generate focused Angular building blocks with the package defaults.',
    card: {
      kind: 'text',
      description: 'Class, service, and standalone OnPush component generation shortcuts.',
    },
  },
  {
    id: 'api-data',
    name: 'API and data',
    summary: 'Bootstrap generated API clients and add typed data-service wrappers around them.',
    card: {
      kind: 'text',
      description: 'OpenAPI and data access commands that make Django API integration explicit.',
    },
  },
] as const;

export const UI_COMMANDS: readonly UiCommand[] = [
  {
    id: 'ng-add',
    categoryId: 'workspace-setup',
    name: 'Register schematic collection',
    command: 'ng add angular-django2',
    summary:
      'Registers angular-django2 in angular.json so future ng generate calls can use the collection.',
    effect: 'text',
    before: {
      title: 'Collection not registered',
      description: 'The workspace does not list angular-django2 in cli.schematicCollections.',
      highlights: [
        'ng generate calls need the full package collection name.',
        'No package defaults are active.',
      ],
    },
    after: {
      title: 'Collection registered',
      description: 'angular.json includes angular-django2 in cli.schematicCollections.',
      highlights: [
        'The collection can be used by Angular CLI generation commands.',
        'Existing collections are preserved.',
      ],
    },
  },
  {
    id: 'ng-workspace',
    categoryId: 'workspace-setup',
    name: 'Initialize workspace files',
    command: 'ng generate angular-django2:ng-workspace my-app',
    summary: 'Writes workspace-level bootstrap files for empty Angular workspaces.',
    effect: 'text',
    before: {
      title: 'Empty workspace shell',
      description: 'The workspace can exist before application source files have been generated.',
      highlights: [
        'Root documentation may be missing.',
        'Repo-level Copilot guidance may be absent.',
      ],
    },
    after: {
      title: 'Workspace initialized',
      description:
        'Workspace README and repository instruction files are present for the Angular side.',
      highlights: [
        'README.md is written at the workspace root.',
        '.github/copilot-instructions.md is created.',
      ],
    },
  },
  {
    id: 'application',
    categoryId: 'application-creation',
    name: 'Generate Angular application',
    command: 'ng generate angular-django2:application my-app',
    summary:
      'Creates an Angular application with standalone routing, no SSR, zoneless mode, and SCSS.',
    effect: 'visual',
    before: {
      title: 'No application project',
      description: 'The workspace has no app project for browser-visible Angular code.',
      highlights: ['No app route tree exists.', 'No app source root exists.'],
    },
    after: {
      title: 'Application project created',
      description:
        'A standalone Angular application project is available for package setup and UI work.',
      highlights: ['Routing is enabled.', 'SSR is disabled.', 'Zoneless mode is enabled.'],
    },
    illustration: {
      imagePath: '/ui-commands/application.svg',
      imageAlt: 'New Angular application project illustration',
    },
  },
  {
    id: 'ng-app',
    categoryId: 'application-creation',
    name: 'Generate Django-friendly app',
    command: 'ng generate angular-django2:ng-app my-app --ssr=false --zoneless=true --defaults',
    summary:
      'Creates a complete Django-friendly Angular app with Material setup, structure, and shell.',
    effect: 'visual',
    before: {
      title: 'Manual setup required',
      description:
        'The user would otherwise run multiple setup commands to reach a styled app shell.',
      highlights: [
        'No Material theme is configured.',
        'No standard feature folder structure is present.',
      ],
    },
    after: {
      title: 'Runnable Material app',
      description:
        'The application includes Material UI setup, a standard structure, and a responsive app shell.',
      highlights: [
        'Application generation is complete.',
        'Material setup, project structure, and app shell are applied.',
      ],
    },
    illustration: {
      imagePath: '/ui-commands/ng-app.svg',
      imageAlt: 'Complete generated Angular Material app illustration',
    },
  },
  {
    id: 'material-setup',
    categoryId: 'ui-material-shell',
    name: 'Configure Angular Material',
    command: 'ng generate angular-django2:material-setup --project=my-app',
    summary: 'Configures Angular Material in an existing project with theme and provider options.',
    effect: 'visual',
    before: {
      title: 'Plain Angular styling',
      description:
        'The project does not yet have package-driven Material theme and animation provider setup.',
      highlights: [
        'Material theme styles are absent.',
        'Animation provider choice is not configured.',
      ],
    },
    after: {
      title: 'Material configured',
      description:
        'The app has Material theme styles and provider wiring based on the selected options.',
      highlights: [
        'Theme configuration is written.',
        'Typography and animations follow command options.',
      ],
    },
    illustration: {
      imagePath: '/ui-commands/material-setup.svg',
      imageAlt: 'Angular Material theme setup illustration',
    },
  },
  {
    id: 'app-shell',
    categoryId: 'ui-material-shell',
    name: 'Generate app shell',
    command: 'ng generate angular-django2:app-shell --project=my-app',
    summary: 'Generates or updates the application shell using the collection flow.',
    effect: 'visual',
    before: {
      title: 'No shell layout',
      description: 'The app lacks a package-provided navigation surface.',
      highlights: [
        'No responsive shell is present.',
        'Users have fewer visual cues for app structure.',
      ],
    },
    after: {
      title: 'Shell layout available',
      description: 'The app has a Material-style shell that can host generated features.',
      highlights: [
        'Navigation and content regions are visible.',
        'The shell can be customized by the app.',
      ],
    },
    illustration: {
      imagePath: '/ui-commands/app-shell.svg',
      imageAlt: 'Responsive app shell illustration',
    },
  },
  {
    id: 'project-structure',
    categoryId: 'project-structure',
    name: 'Create project structure',
    command: 'ng generate angular-django2:project-structure --project=my-app',
    summary: 'Creates core, shared, and feature folders with barrel exports.',
    effect: 'text',
    before: {
      title: 'Unstructured app source',
      description: 'The project may only contain the default app files.',
      highlights: [
        'No core folder exists.',
        'No shared component or pipe barrels exist.',
        'Feature areas are not separated.',
      ],
    },
    after: {
      title: 'Standard folders created',
      description: 'The app source contains conventional folders and barrel files for future code.',
      highlights: [
        'core/ is available.',
        'shared/components/ and shared/pipes/ are available.',
        'features/ is available.',
      ],
    },
  },
  {
    id: 'component',
    categoryId: 'code-generation',
    name: 'Generate component',
    command: 'ng generate angular-django2:component feature-card',
    summary: 'Creates a standalone OnPush component using package defaults.',
    effect: 'visual',
    before: {
      title: 'Component absent',
      description: 'The target UI building block has not been created yet.',
      highlights: ['No component files exist.', 'No component test exists.'],
    },
    after: {
      title: 'Component generated',
      description: 'A standalone component is available with OnPush change detection defaults.',
      highlights: [
        'Component TypeScript, template, style, and spec files are created.',
        'The component can be composed into app pages.',
      ],
    },
    illustration: {
      imagePath: '/ui-commands/component.svg',
      imageAlt: 'Generated component card illustration',
    },
  },
  {
    id: 'service',
    categoryId: 'code-generation',
    name: 'Generate service',
    command: 'ng generate angular-django2:service api-status',
    summary: 'Creates an Angular service through the collection wrapper.',
    effect: 'text',
    before: {
      title: 'Service absent',
      description: 'No injectable service exists for the target responsibility.',
      highlights: [
        'Shared logic may be duplicated.',
        'Tests for the service behavior do not exist yet.',
      ],
    },
    after: {
      title: 'Service generated',
      description: 'An injectable service file and spec are available for shared logic.',
      highlights: ['The service can centralize behavior.', 'A focused spec file is created.'],
    },
  },
  {
    id: 'class',
    categoryId: 'code-generation',
    name: 'Generate class',
    command: 'ng generate angular-django2:class user-summary',
    summary: 'Creates a TypeScript class through the collection wrapper.',
    effect: 'text',
    before: {
      title: 'Class absent',
      description: 'The target model or helper type has not been created.',
      highlights: ['Plain objects may be repeated inline.', 'No class-specific test file exists.'],
    },
    after: {
      title: 'Class generated',
      description: 'A TypeScript class file is ready for model or helper behavior.',
      highlights: [
        'The class can be imported by app code.',
        'The generated file follows Angular CLI conventions.',
      ],
    },
  },
  {
    id: 'ng-api',
    categoryId: 'api-data',
    name: 'Bootstrap OpenAPI client generation',
    command: 'ng generate angular-django2:ng-api --inputPath=openapi.json',
    summary: 'Adds ng-openapi-gen configuration and the generate:api script.',
    effect: 'text',
    before: {
      title: 'No generated API workflow',
      description: 'The workspace has no ng-openapi-gen config or script.',
      highlights: ['API client generation is manual.', 'No output path is configured.'],
    },
    after: {
      title: 'API generation configured',
      description: 'The workspace can generate typed clients from an OpenAPI document.',
      highlights: ['ng-openapi-gen.json is written.', 'package.json includes generate:api.'],
    },
  },
  {
    id: 'data-service',
    categoryId: 'api-data',
    name: 'Generate data service wrapper',
    command: 'ng generate angular-django2:data-service users',
    summary: 'Creates a typed data service wrapper around generated OpenAPI services.',
    effect: 'text',
    before: {
      title: 'Generated API only',
      description: 'OpenAPI services exist without an app-facing data access wrapper.',
      highlights: [
        'CRUD calls may be scattered through components.',
        'Search and list behavior may be duplicated.',
      ],
    },
    after: {
      title: 'Data service wrapper generated',
      description: 'A typed app service wraps generated API calls with reusable data operations.',
      highlights: [
        'Search and CRUD helpers are centralized.',
        'Components can depend on the wrapper instead of raw generated services.',
      ],
    },
  },
] as const;

export function getUiCommandCategory(categoryId: UiCommandCategoryId): UiCommandCategory {
  const category = UI_COMMAND_CATEGORIES.find((candidate) => candidate.id === categoryId);

  if (!category) {
    throw new Error(`Unknown UI command category: ${categoryId}`);
  }

  return category;
}

export function getUiCommandsByCategory(categoryId: UiCommandCategoryId): readonly UiCommand[] {
  return UI_COMMANDS.filter((command) => command.categoryId === categoryId);
}
