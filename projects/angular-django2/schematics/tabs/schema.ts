export interface TabsSchema {
  /** Workspace-relative path to a canonical OpenUI JSON document containing a `Tabs` node. */
  document: string;

  /** Element id within `document` to compile. Defaults to the first `Tabs` element. */
  nodeId?: string;

  /** Kebab-case component name. Defaults to the dasherized node id. */
  name?: string;

  /** Destination directory within the application source tree. Defaults to the `app` directory. */
  path?: string;

  /** Angular application project. Required when the workspace has multiple applications. */
  project?: string;
}
