export type PageAccessMode = 'public' | 'protected';

export interface PageSchema {
  /** Kebab-case feature/page name used for generated artifacts. */
  name: string;

  /** Destination feature directory within the selected application source tree. */
  path: string;

  /** Angular application project. Required when the workspace has multiple applications. */
  project?: string;

  /** URL path for the lazily loaded page. Defaults to the page name. */
  routePath?: string;

  /** Whether the route is public or protected by the configured reusable guard. */
  access?: PageAccessMode;

  /** Locally imported auth-guard identifier, required for protected routes. */
  authGuard?: string;

  /** Label exposed as route navigation metadata. Defaults to the classified page name. */
  navigationLabel?: string;

  /** Optional Material icon name exposed as route navigation metadata. */
  navigationIcon?: string;
}
