import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import { compileFormFieldFromAst, generateFormField } from '../form-field/generate';
import { CONTROL_AST_TYPES } from '../form-field/ast';
import { astNodeSubject, readAstNode } from '../utility/ast-compiler';
import type { FieldComponentSchema, FieldControlKind } from './schema';

const CONTROL_KINDS: readonly FieldControlKind[] = ['text', 'email', 'password', 'textarea'];
const ALLOWED_OPTIONS = new Set(['name', 'path', 'project', 'kind', 'document', 'nodeId']);

/**
 * Generate the narrow, string-valued convenience form-field component.
 *
 * The Material CVA implementation is owned by the canonical form-field generator.
 * With `--document`, the string-valued `TextInputs` node is compiled by the
 * same form-field AST leaf compiler.
 */
export function fieldComponent(options: FieldComponentSchema): Rule {
  assertSupportedOptions(options);
  if (options.document !== undefined) {
    return compileFromDocument(options, options.document);
  }
  if (options.nodeId !== undefined) {
    throw new SchematicsException('--nodeId requires --document.');
  }

  const kind = options.kind ?? 'text';
  if (!CONTROL_KINDS.includes(kind)) {
    throw new SchematicsException(
      `Unsupported field control kind "${kind}". Supported kinds: ${CONTROL_KINDS.join(', ')}.`,
    );
  }

  return generateFormField({
    name: canonicalName(options.name ?? ''),
    path: options.path,
    project: options.project,
    controlType: kind,
    appearance: 'fill',
    subscriptSizing: 'fixed',
  });
}

function compileFromDocument(options: FieldComponentSchema, documentPath: string): Rule {
  if (options.kind !== undefined) {
    throw new SchematicsException(
      '--document cannot be combined with --kind; set [type] on the OpenUI TextInputs node instead.',
    );
  }

  return (tree: Tree, context: SchematicContext) => {
    const node = readAstNode(tree, documentPath, options.nodeId, CONTROL_AST_TYPES.text);
    return compileFormFieldFromAst(
      node,
      {
        ...(options.name === undefined ? {} : { name: canonicalName(options.name) }),
        path: options.path,
        project: options.project,
      },
      astNodeSubject(documentPath, node),
    )(tree, context);
  };
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
