export const FORM_FIELD_CONTROL_TYPES = [
  'text',
  'email',
  'password',
  'number',
  'textarea',
] as const;
export const FORM_FIELD_APPEARANCES = ['fill', 'outline'] as const;
export const FORM_FIELD_SUBSCRIPT_SIZINGS = ['fixed', 'dynamic'] as const;
export const FORM_FIELD_PRIMITIVE_BINDINGS = [
  'fieldId',
  'label',
  'hint',
  'placeholder',
  'required',
  'controlType',
  'serverErrors',
] as const;

export type FormFieldControlType = (typeof FORM_FIELD_CONTROL_TYPES)[number];
export type FormFieldAppearance = (typeof FORM_FIELD_APPEARANCES)[number];
export type FormFieldSubscriptSizing = (typeof FORM_FIELD_SUBSCRIPT_SIZINGS)[number];
export type FormFieldPrimitiveBinding = (typeof FORM_FIELD_PRIMITIVE_BINDINGS)[number];

/** Options accepted by the form-field schematic. */
export interface FormFieldSchema {
  /**
   * Kebab-case base name for the generated component. Required unless
   * `document` is given, in which case it defaults to the node's dasherized
   * `[name]` attribute or id.
   */
  name?: string;

  /** Destination directory, relative to the selected project root. */
  path?: string;

  /** Application project; required only when it cannot be inferred. */
  project?: string;

  /** Native Material input control to generate. */
  controlType?: FormFieldControlType;

  /** Angular Material form-field appearance. */
  appearance?: FormFieldAppearance;

  /** Angular Material hint/error subscript sizing behavior. */
  subscriptSizing?: FormFieldSubscriptSizing;

  /** Workspace-relative path to an OpenUI JSON document describing the control. */
  document?: string;

  /** Id of the `TextInputs` or `RangeControl` node to compile; defaults to the first one. */
  nodeId?: string;
}
