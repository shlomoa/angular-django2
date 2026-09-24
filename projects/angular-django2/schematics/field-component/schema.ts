/**
 * Supported native Material control kinds. All kinds expose string values.
 */
export type FieldControlKind = 'text' | 'email' | 'password' | 'textarea';

/**
 * Options accepted by the field-component schematic.
 */
export interface FieldComponentSchema {
  /** Kebab-case component name. Required unless `document` is given. */
  name?: string;

  /** Destination directory within the selected application source tree. */
  path?: string;

  /** Angular application project. Required for multi-application workspaces. */
  project?: string;

  /** Native Material control kind to generate. */
  kind?: FieldControlKind;

  /** Workspace-relative path to an OpenUI JSON document describing the control. */
  document?: string;

  /** Id of the `TextInputs` node to compile; defaults to the first one. */
  nodeId?: string;
}
