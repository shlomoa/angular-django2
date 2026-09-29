/**
 * OpenUI control vocabulary shared by every schematic that compiles form
 * controls (`form-field`, `field-component`, `reactive-form`).
 *
 * OpenUI control types are coarse (`TextInputs` covers text, email,
 * password, and textarea), so the concrete native kind is carried by the
 * `uses.type` input attribute, the same way the catalog's native `input`
 * element does. Every other control setting is a Uses attribute as well.
 * Attribute values are typed: text settings are quoted string literals,
 * `uses.required` and `uses.email` are booleans, and the limits `uses.minLength`,
 * `uses.maxLength`, `uses.min`, and `uses.max` are numbers.
 *
 * @internal
 */
import { SchematicsException } from '@angular-devkit/schematics';
import type { OpenUiElement } from '@shlomoa/openui-spec';

import { assertAstAttributes, readAstString } from '../utility/ast-compiler';
import type { FormFieldControlType } from './schema';

/** OpenUI catalog type used for each native control kind. */
export const CONTROL_AST_TYPES = {
  text: 'TextInputs',
  email: 'TextInputs',
  password: 'TextInputs',
  textarea: 'TextInputs',
  number: 'RangeControl',
} as const satisfies Record<FormFieldControlType, string>;

/** OpenUI catalog types that compile to a native Material control. */
export const CONTROL_AST_NODE_TYPES = ['TextInputs', 'RangeControl'] as const;

/** Default `uses.type` for each control node type when the attribute is omitted. */
const DEFAULT_CONTROL_TYPES: Record<(typeof CONTROL_AST_NODE_TYPES)[number], string> = {
  TextInputs: 'text',
  RangeControl: 'number',
};

/** Uses attribute keys understood on control nodes. */
export const CONTROL_ATTRIBUTES = {
  type: 'uses.type',
  name: 'uses.name',
  label: 'uses.label',
  value: 'uses.value',
  hint: 'uses.hint',
  placeholder: 'uses.placeholder',
  autocomplete: 'uses.autocomplete',
  required: 'uses.required',
  email: 'uses.email',
  minLength: 'uses.minLength',
  maxLength: 'uses.maxLength',
  min: 'uses.min',
  max: 'uses.max',
  pattern: 'uses.pattern',
  appearance: 'uses.appearance',
  subscriptSizing: 'uses.subscriptSizing',
} as const;

const CONTROL_ATTRIBUTE_KEYS = Object.values(CONTROL_ATTRIBUTES);

/**
 * Validate a control node's type and attribute keys and return its native
 * control kind (`uses.type`, defaulting per node type).
 *
 * The kind is returned unchecked against the supported enum so each caller
 * keeps reporting unsupported kinds with its own existing diagnostic; only a
 * kind that contradicts the node type (for example `uses.type` = `"number"` on
 * `TextInputs`) is rejected here.
 *
 * @throws SchematicsException for unsupported node types, attributes, or a contradictory kind.
 */
export function controlTypeFromAst(node: OpenUiElement, subject: string): string {
  if (!(CONTROL_AST_NODE_TYPES as readonly string[]).includes(node.type)) {
    throw new SchematicsException(
      `OpenUI node "${subject}" has type "${node.type}", which is not a supported form control. ` +
        `Supported control types: ${CONTROL_AST_NODE_TYPES.join(', ')}.`,
    );
  }
  assertAstAttributes(node, CONTROL_ATTRIBUTE_KEYS, subject);

  const nodeType = node.type as (typeof CONTROL_AST_NODE_TYPES)[number];
  const controlType =
    readAstString(node, CONTROL_ATTRIBUTES.type, subject) ?? DEFAULT_CONTROL_TYPES[nodeType];
  const expectedNodeType = CONTROL_AST_TYPES[controlType as FormFieldControlType];
  if (expectedNodeType !== undefined && expectedNodeType !== nodeType) {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${CONTROL_ATTRIBUTES.type}=${JSON.stringify(controlType)} requires a ` +
        `"${expectedNodeType}" node, not "${nodeType}".`,
    );
  }

  return controlType;
}

/** OpenUI catalog type for a legacy control kind; unknown kinds fall back to `TextInputs`. */
export function controlAstType(controlType: string): string {
  return CONTROL_AST_TYPES[controlType as FormFieldControlType] ?? CONTROL_AST_TYPES.text;
}

/** Payload / component base name of a control node: `uses.name`, defaulting to its id. */
export function controlName(node: OpenUiElement): string {
  return readAstString(node, CONTROL_ATTRIBUTES.name, node.id) ?? node.id;
}
