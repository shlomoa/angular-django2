import type { Rule } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import { generateFormField } from '../form-field/generate';
import type { FieldComponentSchema, FieldControlKind } from './schema';

const CONTROL_KINDS: readonly FieldControlKind[] = ['text', 'email', 'password', 'textarea'];
const ALLOWED_OPTIONS = new Set(['name', 'path', 'project', 'kind']);

/**
 * Generate the narrow, string-valued convenience form-field component.
 *
 * The Material CVA implementation is owned by the canonical form-field generator.
 */
export function fieldComponent(options: FieldComponentSchema): Rule {
  assertSupportedOptions(options);
  const kind = options.kind ?? 'text';
  if (!CONTROL_KINDS.includes(kind)) {
    throw new SchematicsException(
      `Unsupported field control kind "${kind}". Supported kinds: ${CONTROL_KINDS.join(', ')}.`,
    );
  }

  return generateFormField({
    name: canonicalName(options.name),
    path: options.path,
    project: options.project,
    controlType: kind,
    appearance: 'fill',
    subscriptSizing: 'fixed',
  });
}

function canonicalName(name: string): string {
  return name.endsWith('-field') ? name.slice(0, -'-field'.length) : name;
}

function assertSupportedOptions(options: FieldComponentSchema): void {
  const unknown = Object.keys(options).filter((option) => !ALLOWED_OPTIONS.has(option));
  if (unknown.length > 0) {
    throw new SchematicsException(`Unsupported field-component option(s): ${unknown.join(', ')}.`);
  }
}
