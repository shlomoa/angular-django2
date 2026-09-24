import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import { astNodeSubject, readAstNode } from '../utility/ast-compiler';
import { CONTROL_AST_NODE_TYPES } from './ast';
import { compileFormFieldFromAst, generateFormField } from './generate';
import type { FormFieldSchema } from './schema';

const ALLOWED_OPTIONS = new Set([
  'name',
  'path',
  'project',
  'controlType',
  'appearance',
  'subscriptSizing',
  'document',
  'nodeId',
]);

/** Options the OpenUI control node describes; they cannot be combined with `--document`. */
const NODE_DESCRIBED_OPTIONS = ['controlType', 'appearance', 'subscriptSizing'] as const;

/** Generate a standalone OnPush typed CVA-backed Angular Material form field. */
export function formField(options: FormFieldSchema): Rule {
  assertSupportedOptions(options);
  if (options.document === undefined) {
    if (options.nodeId !== undefined) {
      throw new SchematicsException('--nodeId requires --document.');
    }
    return generateFormField(options as FormFieldSchema & { name: string });
  }

  assertNoNodeDescribedOptions(options);
  const documentPath = options.document;
  return (tree: Tree, context: SchematicContext) => {
    const node = readAstNode(tree, documentPath, options.nodeId, CONTROL_AST_NODE_TYPES);
    return compileFormFieldFromAst(
      node,
      { name: options.name, path: options.path, project: options.project },
      astNodeSubject(documentPath, node),
    )(tree, context);
  };
}

function assertSupportedOptions(options: FormFieldSchema): void {
  const unknown = Object.keys(options).filter((option) => !ALLOWED_OPTIONS.has(option));
  if (unknown.length > 0) {
    throw new SchematicsException(`Unsupported form-field option(s): ${unknown.join(', ')}.`);
  }
}

function assertNoNodeDescribedOptions(options: FormFieldSchema): void {
  const conflicting = NODE_DESCRIBED_OPTIONS.filter((option) => options[option] !== undefined);
  if (conflicting.length > 0) {
    throw new SchematicsException(
      `--document cannot be combined with ${conflicting.map((option) => `--${option}`).join(', ')}; ` +
        'set the matching attributes on the OpenUI control node instead.',
    );
  }
}
