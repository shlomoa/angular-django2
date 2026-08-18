/**
 * Supported native Material control kinds. All kinds expose string values.
 */
export type FieldControlKind = 'text' | 'email' | 'password' | 'textarea';

/**
 * Options accepted by the field-component schematic.
 */
export interface FieldComponentSchema {
  /** Kebab-case component name. */
  name: string;

  /** Destination directory within the selected application source tree. */
  path?: string;

  /** Angular application project. Required for multi-application workspaces. */
  project?: string;

  /** Native Material control kind to generate. */
  kind?: FieldControlKind;
}
