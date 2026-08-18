/**
 * Strict parser for the reactive-form JSON definition contract.
 *
 * The contract is published in `schema.json` under
 * `definitions/reactiveFormDefinition`. Every rule enforced here is enforced
 * before the schematic mutates the tree, so an invalid definition never
 * produces partial output.
 * @internal
 */
import { SchematicsException } from '@angular-devkit/schematics';
import {
  REACTIVE_FORM_CONTROL_KINDS,
  REACTIVE_FORM_VALIDATOR_KINDS,
  type ReactiveFormControlKind,
  type ReactiveFormDefinition,
  type ReactiveFormFieldDefinition,
  type ReactiveFormIntegrationDefinition,
  type ReactiveFormValidatorDefinition,
  type ReactiveFormValidatorKind,
} from './schema';

const DEFINITION_KEYS = new Set([
  '$schema',
  'title',
  'endpoint',
  'submitLabel',
  'fields',
  'integration',
]);
const FIELD_KEYS = new Set([
  'name',
  'label',
  'control',
  'initialValue',
  'required',
  'validators',
  'hint',
  'placeholder',
  'autocomplete',
]);
const INTEGRATION_KEYS = new Set(['artifact', 'symbol', 'method']);
const VALIDATOR_KEYS = new Set(['type', 'value']);

/** Control kinds whose value model is a string. */
const TEXT_CONTROL_KINDS = new Set<ReactiveFormControlKind>([
  'text',
  'email',
  'password',
  'textarea',
]);

/** Validator kinds that take no `value`. */
const FLAG_VALIDATOR_KINDS = new Set<ReactiveFormValidatorKind>(['required', 'email']);

/** Validator kinds that only apply to string-valued controls. */
const TEXT_VALIDATOR_KINDS = new Set<ReactiveFormValidatorKind>([
  'email',
  'minLength',
  'maxLength',
  'pattern',
]);

/** Validator kinds that only apply to `number` controls. */
const NUMBER_VALIDATOR_KINDS = new Set<ReactiveFormValidatorKind>(['min', 'max']);

/**
 * Keys that would turn the isolated create-only contract into a CRM resource
 * contract. They are rejected with an explicit pointer to the CRM-oriented
 * schematics instead of being silently ignored.
 */
const CRM_KEYS = new Set([
  'adapter',
  'crud',
  'delete',
  'destroy',
  'list',
  'operations',
  'partialUpdate',
  'resource',
  'retrieve',
  'update',
]);

const FIELD_NAME_PATTERN = /^[a-z][a-zA-Z0-9_]*$/;
const SYMBOL_PATTERN = /^[A-Z][A-Za-z0-9_]*$/;
const METHOD_PATTERN = /^[a-z][A-Za-z0-9_]*$/;

/**
 * Parse and validate a single isolated form definition document.
 *
 * @throws SchematicsException for any contract violation.
 */
export function parseReactiveFormDefinition(
  content: string,
  definitionPath: string,
): ReactiveFormDefinition {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw definitionError(definitionPath, 'the file is not valid JSON.');
  }

  const definition = requireDefinitionObject(parsed, definitionPath);
  assertKnownKeys(definition, DEFINITION_KEYS, definitionPath, 'definition');

  return {
    title: requireNonEmptyString(definition['title'], 'title', definitionPath),
    endpoint: requireEndpoint(definition['endpoint'], definitionPath),
    ...(definition['submitLabel'] === undefined
      ? {}
      : {
          submitLabel: requireNonEmptyString(
            definition['submitLabel'],
            'submitLabel',
            definitionPath,
          ),
        }),
    fields: requireFields(definition['fields'], definitionPath),
    ...(definition['integration'] === undefined
      ? {}
      : { integration: requireIntegration(definition['integration'], definitionPath) }),
  };
}

function requireDefinitionObject(parsed: unknown, definitionPath: string): Record<string, unknown> {
  if (Array.isArray(parsed)) {
    throw definitionError(
      definitionPath,
      'it must contain exactly one form definition object, not a list of definitions.',
    );
  }
  if (!isRecord(parsed)) {
    throw definitionError(definitionPath, 'it must contain a single form definition object.');
  }

  return parsed;
}

function requireFields(value: unknown, definitionPath: string): ReactiveFormFieldDefinition[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw definitionError(definitionPath, '"fields" must be a non-empty array of field objects.');
  }

  const names = new Set<string>();
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw definitionError(definitionPath, `"fields[${index}]" must be an object.`);
    }
    assertKnownKeys(entry, FIELD_KEYS, definitionPath, `fields[${index}]`);

    const name = requireNonEmptyString(entry['name'], `fields[${index}].name`, definitionPath);
    if (!FIELD_NAME_PATTERN.test(name)) {
      throw definitionError(
        definitionPath,
        `"fields[${index}].name" must match ${FIELD_NAME_PATTERN.source}.`,
      );
    }
    if (names.has(name)) {
      throw definitionError(
        definitionPath,
        `"${name}" is declared more than once; field names must be unique.`,
      );
    }
    names.add(name);

    const field: ReactiveFormFieldDefinition = {
      name,
      label: requireNonEmptyString(entry['label'], `fields[${index}].label`, definitionPath),
      control: requireControlKind(entry['control'], index, definitionPath),
    };

    if (entry['initialValue'] !== undefined) {
      field.initialValue = requireInitialValue(
        entry['initialValue'],
        field.control,
        index,
        definitionPath,
      );
    }
    if (entry['required'] !== undefined) {
      if (typeof entry['required'] !== 'boolean') {
        throw definitionError(definitionPath, `"fields[${index}].required" must be a boolean.`);
      }
      field.required = entry['required'];
    }
    if (entry['validators'] !== undefined) {
      field.validators = requireValidators(entry['validators'], field, index, definitionPath);
    }
    for (const key of ['hint', 'placeholder', 'autocomplete'] as const) {
      if (entry[key] !== undefined) {
        field[key] = requireNonEmptyString(entry[key], `fields[${index}].${key}`, definitionPath);
      }
    }

    return field;
  });
}

/** Enforce that the declared initial value matches the control's value model. */
function requireInitialValue(
  value: unknown,
  control: ReactiveFormControlKind,
  index: number,
  definitionPath: string,
): string | number | null {
  if (value === null) {
    return null;
  }

  if (control === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw definitionError(
        definitionPath,
        `"fields[${index}].initialValue" must be a finite number or null for a "number" control.`,
      );
    }

    return value;
  }

  if (typeof value !== 'string') {
    throw definitionError(
      definitionPath,
      `"fields[${index}].initialValue" must be a string or null for a "${control}" control.`,
    );
  }

  return value;
}

/**
 * Enforce the single supported validator object shape, its value model, its
 * compatibility with the control kind, and the absence of duplicates.
 */
function requireValidators(
  value: unknown,
  field: ReactiveFormFieldDefinition,
  index: number,
  definitionPath: string,
): ReactiveFormValidatorDefinition[] {
  if (!Array.isArray(value)) {
    throw definitionError(
      definitionPath,
      `"fields[${index}].validators" must be an array of validator objects.`,
    );
  }

  const declared = new Set<ReactiveFormValidatorKind>();
  return value.map((entry, validatorIndex) => {
    const scope = `fields[${index}].validators[${validatorIndex}]`;
    if (!isRecord(entry)) {
      throw definitionError(definitionPath, `"${scope}" must be an object.`);
    }
    assertKnownKeys(entry, VALIDATOR_KEYS, definitionPath, scope);

    const type = entry['type'];
    if (
      typeof type !== 'string' ||
      !REACTIVE_FORM_VALIDATOR_KINDS.includes(type as ReactiveFormValidatorKind)
    ) {
      throw definitionError(
        definitionPath,
        `"${scope}.type" must be one of: ${REACTIVE_FORM_VALIDATOR_KINDS.join(', ')}.`,
      );
    }

    const kind = type as ReactiveFormValidatorKind;
    if (declared.has(kind)) {
      throw definitionError(
        definitionPath,
        `"fields[${index}].validators" declares "${kind}" more than once.`,
      );
    }
    declared.add(kind);

    // `"required": false` adds no validator, so it cannot collide with an explicit entry.
    if (kind === 'required' && field.required === true) {
      throw definitionError(
        definitionPath,
        `"fields[${index}]" declares "required" through both the "required" key and a ` +
          'validator entry; use only one.',
      );
    }
    if (kind === 'email' && field.control === 'email') {
      throw definitionError(
        definitionPath,
        `"fields[${index}]" already applies Validators.email through "control": "email"; ` +
          'remove the duplicate "email" validator.',
      );
    }
    if (field.control === 'number' && TEXT_VALIDATOR_KINDS.has(kind)) {
      throw definitionError(
        definitionPath,
        `"${scope}.type" ("${kind}") does not apply to a "number" control.`,
      );
    }
    if (TEXT_CONTROL_KINDS.has(field.control) && NUMBER_VALIDATOR_KINDS.has(kind)) {
      throw definitionError(
        definitionPath,
        `"${scope}.type" ("${kind}") only applies to a "number" control.`,
      );
    }

    return { type: kind, ...requireValidatorValue(entry['value'], kind, scope, definitionPath) };
  });
}

/** Enforce the value model of a single validator entry. */
function requireValidatorValue(
  value: unknown,
  kind: ReactiveFormValidatorKind,
  scope: string,
  definitionPath: string,
): { value?: number | string } {
  if (FLAG_VALIDATOR_KINDS.has(kind)) {
    if (value !== undefined) {
      throw definitionError(definitionPath, `"${scope}" must not declare a "value" for "${kind}".`);
    }

    return {};
  }

  if (value === undefined) {
    throw definitionError(definitionPath, `"${scope}" must declare a "value" for "${kind}".`);
  }

  if (kind === 'pattern') {
    const pattern = requireNonEmptyString(value, `${scope}.value`, definitionPath);
    try {
      new RegExp(pattern);
    } catch {
      throw definitionError(definitionPath, `"${scope}.value" must be a valid regular expression.`);
    }

    return { value: pattern };
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw definitionError(definitionPath, `"${scope}.value" must be a finite number.`);
  }

  if ((kind === 'minLength' || kind === 'maxLength') && (!Number.isInteger(value) || value < 0)) {
    throw definitionError(
      definitionPath,
      `"${scope}.value" must be a non-negative integer for "${kind}".`,
    );
  }

  return { value };
}

function requireControlKind(
  value: unknown,
  index: number,
  definitionPath: string,
): ReactiveFormControlKind {
  if (
    typeof value !== 'string' ||
    !REACTIVE_FORM_CONTROL_KINDS.includes(value as ReactiveFormControlKind)
  ) {
    throw definitionError(
      definitionPath,
      `"fields[${index}].control" must be one of: ${REACTIVE_FORM_CONTROL_KINDS.join(', ')}.`,
    );
  }

  return value as ReactiveFormControlKind;
}

function requireIntegration(
  value: unknown,
  definitionPath: string,
): ReactiveFormIntegrationDefinition {
  if (!isRecord(value)) {
    throw definitionError(definitionPath, '"integration" must be an object.');
  }
  assertKnownKeys(value, INTEGRATION_KEYS, definitionPath, 'integration');

  const artifact = requireNonEmptyString(value['artifact'], 'integration.artifact', definitionPath);
  if (artifact.split(/[\\/]+/).includes('..')) {
    throw definitionError(
      definitionPath,
      '"integration.artifact" must stay inside the application source tree.',
    );
  }

  const symbol = requireNonEmptyString(value['symbol'], 'integration.symbol', definitionPath);
  if (!SYMBOL_PATTERN.test(symbol)) {
    throw definitionError(
      definitionPath,
      `"integration.symbol" must match ${SYMBOL_PATTERN.source}.`,
    );
  }

  const method = requireNonEmptyString(value['method'], 'integration.method', definitionPath);
  if (!METHOD_PATTERN.test(method)) {
    throw definitionError(
      definitionPath,
      `"integration.method" must match ${METHOD_PATTERN.source}.`,
    );
  }

  return { artifact, symbol, method };
}

function requireEndpoint(value: unknown, definitionPath: string): string {
  const endpoint = requireNonEmptyString(value, 'endpoint', definitionPath);
  if (!endpoint.startsWith('/')) {
    throw definitionError(
      definitionPath,
      '"endpoint" must be an absolute Django path starting with "/".',
    );
  }

  return endpoint;
}

function requireNonEmptyString(value: unknown, key: string, definitionPath: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw definitionError(definitionPath, `"${key}" must be a non-empty string.`);
  }

  return value;
}

function assertKnownKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  definitionPath: string,
  scope: string,
): void {
  const keys = Object.keys(value);
  const crmKeys = keys.filter((key) => CRM_KEYS.has(key));
  if (crmKeys.length > 0) {
    throw definitionError(
      definitionPath,
      `"${scope}" declares CRM resource key(s): ${crmKeys.join(', ')}. reactive-form definitions ` +
        'are create-only; use data-service or openapi-setup for resource operations.',
    );
  }

  const unknown = keys.filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw definitionError(
      definitionPath,
      `"${scope}" has unsupported key(s): ${unknown.join(', ')}. Supported keys: ${[...allowed]
        .filter((key) => key !== '$schema')
        .join(', ')}.`,
    );
  }
}

function definitionError(definitionPath: string, detail: string): SchematicsException {
  return new SchematicsException(`reactive-form definition "${definitionPath}": ${detail}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
