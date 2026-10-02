export interface DialogSchema {
  /**
   * Kebab-case name of the dialog component and its directory. Defaults to the
   * dasherized node id.
   */
  name?: string;

  /** Directory that receives the dialog directory. Defaults to the application's `app` directory. */
  path?: string;

  /** Angular application project. Required when the workspace has multiple application source roots. */
  project?: string;

  /** Workspace-relative path to an OpenUI document with a `dialog` node. */
  document: string;

  /** Element id within `document` to compile. When omitted, the first `dialog` element. */
  nodeId?: string;
}
