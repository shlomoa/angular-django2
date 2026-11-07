export interface MaterialAppSchema {
  /** Application name. Required unless `document` is given; defaults to the dasherized Application id. */
  name?: string;
  theme?: 'indigo-pink' | 'deeppurple-amber' | 'pink-bluegrey' | 'purple-green' | 'custom';
  typography?: boolean;
  animations?: boolean;
  routing?: boolean;
  standalone?: boolean;
  ssr?: boolean;
  zoneless?: boolean;
  defaults?: boolean;
  style?: string;
  prefix?: string;
  /** Existing guard identifier applied to protected routes of the document. Defaults to `authGuard`. */
  authGuard?: string;
  /**
   * Project-relative module path of the guard file, without extension (for example
   * `src/app/auth/auth.guard`). `app.routes.ts` gets the import when it lacks one; the file
   * does not have to exist yet.
   */
  authGuardPath?: string;
  /** Workspace-relative path to an OpenUI document with an `Application` node. */
  document?: string;
  /** Element id of the `Application` node. Requires `document`. */
  nodeId?: string;
}
