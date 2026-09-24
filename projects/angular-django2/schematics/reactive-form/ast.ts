/**
 * Mapping between the legacy `reactiveFormDefinition` contract and the OpenUI
 * `Form` AST subtree (migration plan, step 2.1).
 *
 * | reactiveFormDefinition | OpenUI Form subtree                                         |
 * | :--------------------- | :---------------------------------------------------------- |
 * | `title`                | `Form[title]`                                               |
 * | `endpoint`             | `Form[action]`                                              |
 * | `integration`          | `Form(submit)` = `<artifact>#<Symbol>.<method>`              |
 * | `submitLabel`          | child `ActionControls[label]` (at most one)                 |
 * | `fields[]`             | child `TextInputs` / `RangeControl` nodes, in order         |
 * | `field.name`           | control `[name]` (defaults to the node id)                  |
 * | `field.control`        | control `[type]` (see `form-field/ast.ts`)                  |
 * | `field.initialValue`   | control `[value]` (`null` allowed)                          |
 * | `field.required`       | control `[required]` = `"true"` / `"false"`                 |
 * | `validators[]`         | control `[email]`, `[minLength]`, `[maxLength]`, `[min]`, `[max]`, `[pattern]` |
 * | `hint` / `placeholder` / `autocomplete` | control `[hint]` / `[placeholder]` / `[autocomplete]` |
 *
 * Decoding builds a plain definition object and runs it through
 * `validateReactiveFormDefinition`, so both inputs share one set of contract
 * rules. Diagnostics index fields by their position among the Form's control
 * children.
 *
 * @internal
 */
import { SchematicsException } from '@angular-devkit/schematics';
import type { OpenUiElement } from '@shlomoa/openui-spec';

import {
  CONTROL_ATTRIBUTES,
  controlAstType,
  controlName,
  controlTypeFromAst,
} from '../form-field/ast';
import {
  assertAstAttributes,
  createSyntheticAstNode,
  readAstBoolean,
  readAstNumber,
  readAstString,
  type SyntheticAttributeValue,
} from '../utility/ast-compiler';
import { validateReactiveFormDefinition } from './definition';
import type {
  ReactiveFormDefinition,
  ReactiveFormFieldDefinition,
  ReactiveFormIntegrationDefinition,
  ReactiveFormValidatorKind,
} from './schema';

/** OpenUI catalog type compiled by the reactive-form schematic. */
export const FORM_AST_TYPE = 'Form';

/** OpenUI catalog type carrying the submit button label. */
export const SUBMIT_ACTION_AST_TYPE = 'ActionControls';

/** Catalog-style attribute keys understood on `Form` nodes. */
export const FORM_ATTRIBUTES = {
  title: '[title]',
  action: '[action]',
  submit: '(submit)',
} as const;

/** Catalog-style attribute keys understood on the submit `ActionControls` node. */
export const SUBMIT_ACTION_ATTRIBUTES = { label: '[label]' } as const;

/** Validator kinds carried by a same-named bracketed control attribute (`required` is separate). */
const VALIDATOR_ATTRIBUTE_KINDS = ['minLength', 'maxLength', 'min', 'max'] as const;

/** `(submit)` binding: `<artifact>#<Symbol>.<method>`. */
const SUBMIT_BINDING_PATTERN = /^([^#]+)#([^#.]+)\.([^#.]+)$/;

/**
 * Translate a validated legacy definition into a synthetic OpenUI `Form` node
 * (legacy CLI adapter). Control ids are positional (`<formId>Field<index>`)
 * because legacy field names may differ only by `_` versus camel case, which
 * would collapse to the same OpenUI id; the payload key travels in `[name]`.
 */
export function reactiveFormDefinitionToAst(
  definition: ReactiveFormDefinition,
  formName: string,
): OpenUiElement {
  const children = definition.fields.map((field, index) =>
    createSyntheticAstNode({
      id: `${formName}-field-${index}`,
      type: controlAstType(field.control),
      attrs: fieldAttributes(field),
    }),
  );
  if (definition.submitLabel !== undefined) {
    children.push(
      createSyntheticAstNode({
        id: `${formName}-submit-action`,
        type: SUBMIT_ACTION_AST_TYPE,
        attrs: { [SUBMIT_ACTION_ATTRIBUTES.label]: definition.submitLabel },
      }),
    );
  }

  return createSyntheticAstNode({
    id: formName,
    type: FORM_AST_TYPE,
    attrs: {
      [FORM_ATTRIBUTES.title]: definition.title,
      [FORM_ATTRIBUTES.action]: definition.endpoint,
      [FORM_ATTRIBUTES.submit]: definition.integration
        ? submitBinding(definition.integration)
        : undefined,
    },
    children,
  });
}

/**
 * Decode an OpenUI `Form` node into the validated form definition the
 * generator renders.
 *
 * @param subject Diagnostic subject (see `astNodeSubject`).
 * @throws SchematicsException for unsupported structure or any contract violation.
 */
export function reactiveFormDefinitionFromAst(
  form: OpenUiElement,
  subject: string,
): ReactiveFormDefinition {
  if (form.type !== FORM_AST_TYPE) {
    throw new SchematicsException(
      `OpenUI node "${subject}" has type "${form.type}"; reactive-form compiles "${FORM_AST_TYPE}" nodes.`,
    );
  }
  assertAstAttributes(form, Object.values(FORM_ATTRIBUTES), subject);

  const children = form.children ?? [];
  const submitActions = children.filter((child) => child.type === SUBMIT_ACTION_AST_TYPE);
  if (submitActions.length > 1) {
    throw new SchematicsException(
      `OpenUI node "${subject}" declares ${submitActions.length} "${SUBMIT_ACTION_AST_TYPE}" children; ` +
        'a reactive form has exactly one submit action.',
    );
  }
  const submitLabel = submitActions[0] ? readSubmitLabel(submitActions[0], subject) : undefined;
  const submit = readAstString(form, FORM_ATTRIBUTES.submit);

  const raw = {
    title: readAstString(form, FORM_ATTRIBUTES.title),
    endpoint: readAstString(form, FORM_ATTRIBUTES.action),
    ...(submitLabel === undefined ? {} : { submitLabel }),
    fields: children
      .filter((child) => child.type !== SUBMIT_ACTION_AST_TYPE)
      .map((control) => fieldFromAst(control, `${subject}/${control.id}`)),
    ...(submit === undefined ? {} : { integration: integrationFromAst(submit, subject) }),
  };

  return validateReactiveFormDefinition(raw, subject);
}

function fieldAttributes(
  field: ReactiveFormFieldDefinition,
): Record<string, SyntheticAttributeValue> {
  const validators = new Map(field.validators?.map((entry) => [entry.type, entry.value]));
  const required = field.required === true || validators.has('required') ? true : field.required;

  return {
    [CONTROL_ATTRIBUTES.type]: field.control,
    [CONTROL_ATTRIBUTES.name]: field.name,
    [CONTROL_ATTRIBUTES.label]: field.label,
    [CONTROL_ATTRIBUTES.value]: field.initialValue,
    [CONTROL_ATTRIBUTES.required]: required,
    [CONTROL_ATTRIBUTES.email]: validators.has('email') ? true : undefined,
    ...Object.fromEntries(
      VALIDATOR_ATTRIBUTE_KINDS.map((kind) => [CONTROL_ATTRIBUTES[kind], validators.get(kind)]),
    ),
    [CONTROL_ATTRIBUTES.pattern]: validators.get('pattern'),
    [CONTROL_ATTRIBUTES.hint]: field.hint,
    [CONTROL_ATTRIBUTES.placeholder]: field.placeholder,
    [CONTROL_ATTRIBUTES.autocomplete]: field.autocomplete,
  };
}

/** Build the raw (not yet contract-validated) field object for one control node. */
function fieldFromAst(control: OpenUiElement, subject: string): Record<string, unknown> {
  const controlType = controlTypeFromAst(control, subject);
  const validators: { type: ReactiveFormValidatorKind; value?: number | string }[] = [];
  if (readAstBoolean(control, CONTROL_ATTRIBUTES.email, subject) === true) {
    validators.push({ type: 'email' });
  }
  for (const kind of VALIDATOR_ATTRIBUTE_KINDS) {
    const value = readAstNumber(control, CONTROL_ATTRIBUTES[kind], subject);
    if (value !== undefined) {
      validators.push({ type: kind, value });
    }
  }
  const pattern = readAstString(control, CONTROL_ATTRIBUTES.pattern);
  if (pattern !== undefined) {
    validators.push({ type: 'pattern', value: pattern });
  }

  const field: Record<string, unknown> = {
    name: controlName(control),
    label: readAstString(control, CONTROL_ATTRIBUTES.label),
    control: controlType,
  };
  if (control.attrs && CONTROL_ATTRIBUTES.value in control.attrs) {
    field['initialValue'] =
      controlType === 'number'
        ? (readAstNumber(control, CONTROL_ATTRIBUTES.value, subject) ?? null)
        : (control.attrs[CONTROL_ATTRIBUTES.value] ?? null);
  }
  const required = readAstBoolean(control, CONTROL_ATTRIBUTES.required, subject);
  if (required !== undefined) {
    field['required'] = required;
  }
  if (validators.length > 0) {
    field['validators'] = validators;
  }
  for (const key of ['hint', 'placeholder', 'autocomplete'] as const) {
    const value = readAstString(control, CONTROL_ATTRIBUTES[key]);
    if (value !== undefined) {
      field[key] = value;
    }
  }

  return field;
}

function readSubmitLabel(action: OpenUiElement, formSubject: string): string | undefined {
  const subject = `${formSubject}/${action.id}`;
  assertAstAttributes(action, Object.values(SUBMIT_ACTION_ATTRIBUTES), subject);
  if (action.children && action.children.length > 0) {
    throw new SchematicsException(
      `OpenUI node "${subject}": the submit "${SUBMIT_ACTION_AST_TYPE}" node must not have children.`,
    );
  }

  return readAstString(action, SUBMIT_ACTION_ATTRIBUTES.label);
}

function submitBinding(integration: ReactiveFormIntegrationDefinition): string {
  return `${integration.artifact}#${integration.symbol}.${integration.method}`;
}

function integrationFromAst(value: string, subject: string): ReactiveFormIntegrationDefinition {
  const match = SUBMIT_BINDING_PATTERN.exec(value);
  if (!match) {
    throw new SchematicsException(
      `OpenUI node "${subject}": attribute "${FORM_ATTRIBUTES.submit}" must be ` +
        `"<artifact>#<Symbol>.<method>", not "${value}".`,
    );
  }

  return { artifact: match[1], symbol: match[2], method: match[3] };
}
