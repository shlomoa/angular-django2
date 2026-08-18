import type { Rule } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import { generateFormField } from './generate';
import type { FormFieldSchema } from './schema';

const ALLOWED_OPTIONS = new Set([
  'name',
  'path',
  'project',
  'controlType',
  'appearance',
  'subscriptSizing',
]);

/** Generate a standalone OnPush typed CVA-backed Angular Material form field. */
export function formField(options: FormFieldSchema): Rule {
  assertSupportedOptions(options);
  return generateFormField(options);
}

function assertSupportedOptions(options: FormFieldSchema): void {
  const unknown = Object.keys(options).filter((option) => !ALLOWED_OPTIONS.has(option));
  if (unknown.length > 0) {
    throw new SchematicsException(`Unsupported form-field option(s): ${unknown.join(', ')}.`);
  }
}
