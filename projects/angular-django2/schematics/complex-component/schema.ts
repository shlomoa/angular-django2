export type ComplexComponentFeature = 'mixins' | 'nested' | 'projection' | 'cdk-overlay';
export type ComplexComponentMode = 'create' | 'modify' | 'delete';

export interface ComplexComponentSchema {
  /** Kebab-case name for the component directory and class. */
  name: string;

  /** Destination directory, relative to the selected project's root. */
  path: string;

  /** Angular application project. Required only when it cannot be inferred. */
  project?: string;

  /** Comma-separated advanced features to apply. */
  features: string;

  /** Lifecycle operation to perform. */
  mode?: ComplexComponentMode;

  /** Required acknowledgement before deleting generated files. */
  confirm?: boolean;
}
