/**
 * Options accepted by the stepper schematic.
 */
export interface StepperSchema {
  /** Kebab-case component name. Defaults to the dasherized node id. */
  name?: string;

  /** Destination directory within the selected application source tree. */
  path?: string;

  /** Angular application project. Required when the workspace has more than one application. */
  project?: string;

  /** Workspace-relative path to an OpenUI document with a `Stepper` node. */
  document: string;

  /** Element id within `document` to compile; defaults to the first `Stepper`. */
  nodeId?: string;
}
