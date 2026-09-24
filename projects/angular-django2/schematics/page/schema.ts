export type PageAccessMode = 'public' | 'protected';

export interface PageSchema {
  /**
   * Kebab-case feature/page name used for generated artifacts. Required unless
   * `document` is given; defaults to the dasherized node id.
   */
  name?: string;

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

  /** Workspace-relative path to an OpenUI document with a `DashboardPage` or `EmptyPage` node. */
  document?: string;

  /** Element id within `document` to compile. Requires `document`. */
  nodeId?: string;
}
