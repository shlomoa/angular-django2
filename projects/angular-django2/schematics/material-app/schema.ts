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
  /** Workspace-relative path to an OpenUI document with an `Application` node. */
  document?: string;
  /** Element id of the `Application` node. Requires `document`. */
  nodeId?: string;
}
