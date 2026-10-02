/** Options accepted by the table schematic. */
export interface TableSchema {
  /**
   * Kebab-case base name for the generated component. Defaults to the dasherized
   * id of the OpenUI `table` node.
   */
  name?: string;

  /** Destination directory, relative to the selected project root. */
  path?: string;

  /** Application project; required only when it cannot be inferred. */
  project?: string;

  /** Workspace-relative path to an OpenUI JSON document containing the `table` node. */
  document: string;

  /** Id of the `table` node to compile; defaults to the first one. */
  nodeId?: string;
}
