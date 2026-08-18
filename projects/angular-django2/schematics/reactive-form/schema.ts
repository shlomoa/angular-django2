export const REACTIVE_FORM_CONTROL_KINDS = [
  'text',
  'email',
  'password',
  'number',
  'textarea',
] as const;

export type ReactiveFormControlKind = (typeof REACTIVE_FORM_CONTROL_KINDS)[number];

/**
 * Validator kinds the contract can declare, in the canonical order they are
 * emitted onto the generated control.
 */
export const REACTIVE_FORM_VALIDATOR_KINDS = [
  'required',
  'email',
  'minLength',
  'maxLength',
  'min',
  'max',
  'pattern',
] as const;

export type ReactiveFormValidatorKind = (typeof REACTIVE_FORM_VALIDATOR_KINDS)[number];

/**
 * A single validator entry using the one supported object shape:
 * `{ "type": "minLength", "value": 3 }`.
 *
 * `required` and `email` take no `value`; `minLength` and `maxLength` take a
 * non-negative integer; `min` and `max` take a number; `pattern` takes a
 * regular-expression string.
 */
export interface ReactiveFormValidatorDefinition {
  /** Supported validator kind. */
  type: ReactiveFormValidatorKind;

  /** Validator argument, required for every kind except `required` and `email`. */
  value?: number | string;
}

/** A single control described by the reactive-form definition contract. */
export interface ReactiveFormFieldDefinition {
  /** Payload key; it must match the Django REST Framework serializer field name. */
  name: string;

  /** Accessible label rendered for the control. */
  label: string;

  /** Native Material control kind used for the field. */
  control: ReactiveFormControlKind;

  /**
   * Initial control value; defaults to `null`. It must match the control kind:
   * `number` controls take a number, every other control takes a string.
   */
  initialValue?: string | number | null;

  /** Shorthand for a `required` validator; it may not be combined with one. */
  required?: boolean;

  /** Explicit validators emitted onto the generated control. */
  validators?: ReactiveFormValidatorDefinition[];

  /** Hint text rendered under the control. */
  hint?: string;

  /** Placeholder text rendered inside the control. */
  placeholder?: string;

  /** Native `autocomplete` token rendered on inline controls. */
  autocomplete?: string;
}

/**
 * Optional integration with a typed artifact that already exists in the
 * workspace. The schematic never creates the artifact.
 */
export interface ReactiveFormIntegrationDefinition {
  /** Path to the existing artifact file within the selected application. */
  artifact: string;

  /** Exported injectable class used to submit the payload. */
  symbol: string;

  /** Create-only method invoked on the exported class. */
  method: string;
}

/**
 * The single, isolated, create-only form definition contract.
 *
 * It intentionally carries no CRM resource semantics: it never describes list,
 * retrieve, update, or delete operations.
 */
export interface ReactiveFormDefinition {
  /** Accessible form title. */
  title: string;

  /** Explicit Django endpoint the form creates against. */
  endpoint: string;

  /** Submit button label; defaults to the form title. */
  submitLabel?: string;

  /** Ordered, non-empty list of controls with unique names. */
  fields: ReactiveFormFieldDefinition[];

  /** Optional typed integration with a local artifact. */
  integration?: ReactiveFormIntegrationDefinition;
}

/** Options accepted by the reactive-form schematic. */
export interface ReactiveFormSchema {
  /** Kebab-case base name for the generated form component. */
  name: string;

  /** Workspace-relative path of the JSON form definition file. */
  definition: string;

  /** Destination directory, relative to the selected project root. */
  path?: string;

  /** Application project; required only when it cannot be inferred. */
  project?: string;

  /** Directory scanned for reusable field primitives to compose. */
  primitivesPath?: string;
}
