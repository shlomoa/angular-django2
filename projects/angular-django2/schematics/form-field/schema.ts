export const FORM_FIELD_CONTROL_TYPES = ['text', 'email', 'password', 'number', 'textarea'] as const;
export const FORM_FIELD_APPEARANCES = ['fill', 'outline'] as const;
export const FORM_FIELD_SUBSCRIPT_SIZINGS = ['fixed', 'dynamic'] as const;

export type FormFieldControlType = (typeof FORM_FIELD_CONTROL_TYPES)[number];
export type FormFieldAppearance = (typeof FORM_FIELD_APPEARANCES)[number];
export type FormFieldSubscriptSizing = (typeof FORM_FIELD_SUBSCRIPT_SIZINGS)[number];

/** Options accepted by the form-field schematic. */
export interface FormFieldSchema {
  /** Kebab-case base name for the generated component. */
  name: string;

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
}
