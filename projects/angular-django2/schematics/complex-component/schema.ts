export type ComplexComponentFeature = 'mixins' | 'nested' | 'projection' | 'cdk-overlay';
export type ComplexComponentMode = 'create' | 'modify' | 'delete';

export interface ComplexComponentSchema {
  /**
   * Kebab-case name for the component directory and class. Required unless
   * `document` is given; defaults to the dasherized node id.
   */
  name?: string;

  /** Destination directory, relative to the selected project's root. */
  path: string;

  /** Angular application project. Required only when it cannot be inferred. */
  project?: string;

  /** Comma-separated advanced features to apply. Required unless `document` is given. */
  features?: string;

  /** Lifecycle operation to perform. */
  mode?: ComplexComponentMode;

  /** Required acknowledgement before deleting generated files. */
  confirm?: boolean;

  /**
   * Workspace-relative path to an OpenUI document. Compiles a `SurfaceContainers`
   * node; cannot be combined with `features`.
   */
  document?: string;

  /** Element id within `document` to compile. Requires `document`. */
  nodeId?: string;
}
