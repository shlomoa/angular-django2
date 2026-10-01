/**
 * Shared OpenUI AST compiler core for document-driven schematics.
 *
 * Every schematic that compiles UI from OpenUI follows the same two-step
 * pattern (see section 3.2 of the migration plan, removed from `main` in #131;
 * last version: https://github.com/shlomoa/angular-django2/blob/7e7047a/docs/migrate_schematics_to_openui_plan.md):
 *
 * 1. A schema resolver / CLI adapter produces one validated `OpenUiElement`,
 *    either by resolving a node inside a `--document` (`resolveAstNode`) or by
 *    translating legacy CLI flags into a synthetic node (`createSyntheticAstNode`).
 * 2. A pure AST compiler consumes that node with an `AstCompilationContext`
 *    and reports an `AstCompilationResult`.
 *
 * @internal
 */
import { strings } from '@angular-devkit/core';
import { SchematicsException } from '@angular-devkit/schematics';
import type { SchematicContext, Tree } from '@angular-devkit/schematics';
import { Attribute, defaultCatalog } from '@shlomoa/openui-spec';
import type { OpenUiDocument, OpenUiElement } from '@shlomoa/openui-spec';

import { readOpenUiDocument, validateOpenUiDocument } from './openui';
import type { WorkspaceConfig, WorkspaceProject } from './workspace';

/**
 * OpenUI specification version stamped on synthetic documents: the version of
 * the installed `@shlomoa/openui-spec` package, which equals the spec version it
 * implements.
 */
export const SYNTHETIC_OPENUI_VERSION = defaultCatalog().version;

/** Root type used for synthetic documents; matches the canonical catalog root. */
export const SYNTHETIC_OPENUI_ROOT_TYPE = 'html';

/** Workspace state and destination shared by every pure AST compiler. */
export interface AstCompilationContext {
  /** Schematic tree the compiler writes to. */
  readonly tree: Tree;
  /** Schematic context; its logger carries compiler diagnostics. */
  readonly context: SchematicContext;
  /** Parsed angular.json. */
  readonly workspace: WorkspaceConfig;
  /** Target Angular project name. */
  readonly projectName: string;
  /** Target Angular project configuration. */
  readonly project: WorkspaceProject;
  /** Workspace-relative directory that receives generated files. */
  readonly destinationPath: string;
}

/** Metadata a pure AST compiler reports so callers can embed or register its output. */
export interface AstCompilationResult {
  /** OpenUI element id the result was compiled from. */
  readonly nodeId: string;
  /** Workspace-relative paths of generated or modified files. */
  readonly files: readonly string[];
  /** Exported TypeScript symbol (for example the component class name). */
  readonly symbolName: string;
  /** Element selector, when the output is a component. */
  readonly selector?: string;
  /** Workspace-relative module path (without extension) to import `symbolName` from. */
  readonly importPath?: string;
}

/** Traversal and lookup functions over one validated OpenUI document. */
export interface AstNodeResolver {
  /** Depth-first, pre-order traversal starting at (and including) the root. */
  walk(): Generator<OpenUiElement>;
  /** Find an element by `id`; `root` resolves the document root. */
  findById(nodeId: string): OpenUiElement | undefined;
  /** First element in pre-order whose `type` exactly matches `type`. */
  findByType(type: string): OpenUiElement | undefined;
}

/** Create a resolver over a document already validated by `readOpenUiDocument`. */
export function createAstNodeResolver(document: OpenUiDocument): AstNodeResolver {
  function* walk(): Generator<OpenUiElement> {
    const pending: OpenUiElement[] = [document];
    while (pending.length > 0) {
      const node = pending.shift() as OpenUiElement;
      yield node;
      pending.unshift(...(node.children ?? []));
    }
  }

  const find = (predicate: (node: OpenUiElement) => boolean): OpenUiElement | undefined => {
    for (const node of walk()) {
      if (predicate(node)) {
        return node;
      }
    }
    return undefined;
  };

  return {
    walk,
    findById: (nodeId) => find((node) => node.id === nodeId),
    findByType: (type) => find((node) => node.type === type),
  };
}

/**
 * Resolve the element a schematic compiles.
 *
 * - `nodeId` given: that element; when `expectedType` is also given, its type must match.
 * - only `expectedType` given: the first element of that type in pre-order.
 * - neither given: the document root.
 *
 * `expectedType` may list several accepted types (for example the control
 * types a leaf compiler supports).
 *
 * Missing-node diagnostics reuse the canonical `openui-spec` wording
 * (`object not found: <id>`).
 *
 * @throws SchematicsException when the node is missing or has the wrong type.
 */
export function resolveAstNode(
  document: OpenUiDocument,
  nodeId?: string,
  expectedType?: string | readonly string[],
): OpenUiElement {
  const resolver = createAstNodeResolver(document);
  const expectedTypes = typeof expectedType === 'string' ? [expectedType] : expectedType;
  const expectedLabel = expectedTypes?.map((type) => `"${type}"`).join(' or ');

  if (nodeId !== undefined) {
    const node = resolver.findById(nodeId);
    if (!node) {
      throw new SchematicsException(
        `OpenUI node "${nodeId}" was not found in the document (object not found: ${nodeId}). ` +
          'Pass an existing element id with --nodeId.',
      );
    }
    if (expectedTypes !== undefined && !expectedTypes.includes(node.type)) {
      throw new SchematicsException(
        `OpenUI node "${nodeId}" has type "${node.type}" but this schematic expects ${expectedLabel}. ` +
          `Pass the id of a ${expectedLabel} element with --nodeId.`,
      );
    }
    return node;
  }

  if (expectedTypes !== undefined) {
    const node = [...resolver.walk()].find((candidate) => expectedTypes.includes(candidate.type));
    if (!node) {
      throw new SchematicsException(
        `OpenUI document contains no ${expectedLabel} element. ` +
          `Add one or pass the id of a ${expectedLabel} element with --nodeId.`,
      );
    }
    return node;
  }

  return document;
}

/**
 * Read `documentPath` from the tree, validate it, and resolve the compiled node.
 * This is the `--document` / `--nodeId` half of every schema resolver.
 *
 * @throws SchematicsException when the document is invalid or the node cannot be resolved.
 */
export function readAstNode(
  tree: Tree,
  documentPath: string,
  nodeId?: string,
  expectedType?: string | readonly string[],
): OpenUiElement {
  return resolveAstNode(readOpenUiDocument(tree, documentPath), nodeId, expectedType);
}

/** Diagnostic subject naming one element of one document: `<documentPath>#<nodeId>`. */
export function astNodeSubject(documentPath: string, node: OpenUiElement): string {
  return `${documentPath}#${node.id}`;
}

/**
 * Reject attributes a compiler does not understand, so no document content is
 * silently dropped.
 *
 * @throws SchematicsException naming the unsupported keys.
 */
export function assertAstAttributes(
  node: OpenUiElement,
  allowed: readonly string[],
  subject: string,
): void {
  const unknown = Object.keys(node.attrs ?? {}).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw new SchematicsException(
      `OpenUI node "${subject}" has unsupported attribute(s): ${unknown.join(', ')}. ` +
        `Supported attributes for "${node.type}": ${allowed.join(', ')}.`,
    );
  }
}

/**
 * The attribute `key` of `node`, decoded by the `openui-spec` value rules;
 * absent and `null` values read as `undefined`.
 */
function readAttribute(node: OpenUiElement, key: string): Attribute | undefined {
  const value = node.attrs?.[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  const [category, ...name] = key.split('.');
  return new Attribute(key, category, name.join('.'), value, '');
}

/**
 * Read a string attribute written as a quoted literal and return its decoded
 * text; absent and `null` values read as `undefined`.
 *
 * An unquoted string is an expression (spec 4.6), never plain text, so it is
 * rejected rather than read as text. Attributes that mean to accept an
 * expression use `readAstExpression`.
 *
 * @param subject Diagnostic subject (see `astNodeSubject`); defaults to the node id.
 * @throws SchematicsException for an unquoted string or a non-string value.
 */
export function readAstString(
  node: OpenUiElement,
  key: string,
  subject: string = node.id,
): string | undefined {
  const attribute = readAttribute(node, key);
  if (attribute === undefined) {
    return undefined;
  }
  if (typeof attribute.value !== 'string') {
    throw new SchematicsException(
      `OpenUI node "${subject}": attribute "${key}" must be a quoted string literal, ` +
        `not ${JSON.stringify(attribute.value)}.`,
    );
  }
  if (attribute.isExpression) {
    throw new SchematicsException(
      `OpenUI node "${subject}": attribute "${key}" has the unquoted value ${attribute.value}, ` +
        'which is an expression, not text. Quote the literal inside the string: ' +
        `${JSON.stringify(JSON.stringify(attribute.value))}.`,
    );
  }
  return attribute.literal as string;
}

/** A scalar attribute value as written: a quoted literal (decoded) or an unquoted expression. */
export type AstValue = { readonly literal: string } | { readonly expression: string };

/**
 * Read an attribute as it is written, without requiring either form: a quoted
 * literal returns its decoded text, an unquoted string returns the expression;
 * absent and `null` values read as `undefined`.
 *
 * @param subject Diagnostic subject (see `astNodeSubject`); defaults to the node id.
 * @throws SchematicsException for a list (the only non-string value left).
 */
export function readAstValue(
  node: OpenUiElement,
  key: string,
  subject: string = node.id,
): AstValue | undefined {
  const attribute = readAttribute(node, key);
  if (attribute === undefined) {
    return undefined;
  }
  if (typeof attribute.value !== 'string') {
    throw new SchematicsException(
      `OpenUI node "${subject}": attribute "${key}" must be a string, ` +
        `not ${JSON.stringify(attribute.value)}.`,
    );
  }
  return attribute.isExpression
    ? { expression: attribute.value }
    : { literal: attribute.literal as string };
}

/**
 * Read an attribute whose value is an expression (an unquoted string) and
 * return it as written; absent and `null` values read as `undefined`.
 *
 * Only Behaves and Produces values and `uses.data` take an expression: their
 * `<artifact>#<Symbol>.<method>` and `<apiPath>#<ApiService>` forms name code,
 * not text.
 *
 * @param subject Diagnostic subject (see `astNodeSubject`); defaults to the node id.
 * @throws SchematicsException for a quoted literal or a non-string value.
 */
export function readAstExpression(
  node: OpenUiElement,
  key: string,
  subject: string = node.id,
): string | undefined {
  const attribute = readAttribute(node, key);
  if (attribute === undefined) {
    return undefined;
  }
  if (typeof attribute.value !== 'string' || !attribute.isExpression) {
    throw new SchematicsException(
      `OpenUI node "${subject}": attribute "${key}" must be an unquoted expression string, ` +
        `not ${JSON.stringify(attribute.value)}.`,
    );
  }
  return attribute.value;
}

/** JSON number grammar (RFC 8259): the only text `readAstNumber` accepts. */
const JSON_NUMBER_PATTERN = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/;

/**
 * The unquoted string of a typed attribute (`boolean`, `integer`, `number`), or
 * `undefined` for an absent or `null` value.
 *
 * A typed value is written as an unquoted string (spec 4.6): a quoted literal
 * is text, and a list is not a scalar. Both are rejected here, with the wanted
 * form in `expected`.
 *
 * @throws SchematicsException for a list, a non-string value or a quoted literal.
 */
function readTypedText(
  node: OpenUiElement,
  key: string,
  subject: string,
  expected: string,
): string | undefined {
  const attribute = readAttribute(node, key);
  if (attribute === undefined) {
    return undefined;
  }
  if (typeof attribute.value !== 'string') {
    throw new SchematicsException(
      `OpenUI node "${subject}": attribute "${key}" must be ${expected}, ` +
        `not ${JSON.stringify(attribute.value)}.`,
    );
  }
  if (!attribute.isExpression) {
    throw new SchematicsException(
      `OpenUI node "${subject}": attribute "${key}" has the quoted literal ${attribute.value}, ` +
        `which is text, not ${expected}. Write it unquoted.`,
    );
  }
  return attribute.value;
}

/**
 * Read a boolean attribute written as the unquoted string `"true"` or `"false"`
 * (spec 4.6); absent and `null` values read as `undefined`.
 *
 * The schematics need the value at generation time, so any other expression
 * (for example `!x` or `(bool)x`) cannot be evaluated and is rejected, as is a
 * quoted literal (`"\"true\""` is the text `true`, not a Boolean) and a list.
 *
 * @throws SchematicsException for any other value.
 */
export function readAstBoolean(
  node: OpenUiElement,
  key: string,
  subject: string,
): boolean | undefined {
  const text = readTypedText(node, key, subject, 'the unquoted string "true" or "false"');
  if (text === undefined) {
    return undefined;
  }
  if (text !== 'true' && text !== 'false') {
    throw new SchematicsException(
      `OpenUI node "${subject}": attribute "${key}" must be the unquoted string "true" or "false", ` +
        `not the expression ${JSON.stringify(text)}, which cannot be evaluated at generation time.`,
    );
  }
  return text === 'true';
}

/**
 * Read a finite number attribute written as an unquoted string that is a JSON
 * number (spec 4.6, for example `"25"` or `"0.5"`); absent and `null` values
 * read as `undefined`.
 *
 * Any other expression (for example `(int)x`) cannot be evaluated at
 * generation time and is rejected, as is a quoted literal and a list.
 *
 * @throws SchematicsException for any other value.
 */
export function readAstNumber(
  node: OpenUiElement,
  key: string,
  subject: string,
): number | undefined {
  const text = readTypedText(node, key, subject, 'an unquoted string that is a JSON number');
  if (text === undefined) {
    return undefined;
  }
  const value = JSON_NUMBER_PATTERN.test(text) ? Number(text) : Number.NaN;
  if (!Number.isFinite(value)) {
    throw new SchematicsException(
      `OpenUI node "${subject}": attribute "${key}" must be an unquoted string that is a finite JSON number, ` +
        `not the expression ${JSON.stringify(text)}, which cannot be evaluated at generation time.`,
    );
  }
  return value;
}

/** A synthetic attribute value written unquoted: a binding or target-language expression. */
export interface SyntheticExpression {
  readonly expression: string;
}

/** Mark `text` as an expression (written unquoted) instead of a string literal. */
export function syntheticExpression(text: string): SyntheticExpression {
  return { expression: text };
}

/**
 * A Boolean or number CLI option as the unquoted string of its text (`"true"`,
 * `"25"`), which is how a typed value is written (spec 4.6); `undefined` stays
 * `undefined`, so an unset option contributes no attribute.
 */
export function syntheticTypedValue(
  value: boolean | number | undefined,
): SyntheticExpression | undefined {
  return value === undefined ? undefined : syntheticExpression(String(value));
}

/**
 * Attribute values accepted from legacy CLI options before normalization. A
 * plain string is a literal; wrap an expression with `syntheticExpression`. A
 * Boolean or number is not a value (spec 4.5): write it as the string of its
 * text, with `syntheticExpression(String(value))` or `syntheticTypedValue`.
 */
export type SyntheticAttributeValue = string | null | undefined | SyntheticExpression;

/** Input for a synthetic OpenUI element built from legacy CLI options. */
export interface SyntheticAstNodeInput {
  /** Element id; normalized to the canonical lower-camel form (`user-profile` → `userProfile`). */
  readonly id: string;
  /** Canonical, case-sensitive OpenUI catalog type (for example `Form`). */
  readonly type: string;
  /** Attributes; `undefined` entries are dropped, strings are written as quoted literals, expressions unquoted, `null` as `null`. */
  readonly attrs?: Readonly<Record<string, SyntheticAttributeValue>>;
  /** Child elements, already built with `createSyntheticAstNode`. */
  readonly children?: readonly OpenUiElement[];
}

/**
 * Translate legacy CLI options into an in-memory OpenUI element so legacy and
 * `--document` invocations run through the same pure AST compiler.
 *
 * The node is validated with the canonical `openui-spec` validator inside a
 * synthetic document, so it conforms to the same schema and catalog as a
 * document-supplied node.
 *
 * @throws SchematicsException when the resulting node does not conform.
 */
export function createSyntheticAstNode(input: SyntheticAstNodeInput): OpenUiElement {
  const node: OpenUiElement = { id: toAstNodeId(input.id), type: input.type };

  const attrs = normalizeSyntheticAttributes(input.attrs);
  if (attrs) {
    node.attrs = attrs;
  }
  if (input.children && input.children.length > 0) {
    node.children = [...input.children];
  }

  createSyntheticAstDocument([node], `Synthetic OpenUI node "${node.id}"`);
  return node;
}

/**
 * Wrap synthetic elements in a validated document so document-level compilers
 * can consume legacy invocations.
 *
 * @throws SchematicsException when the document does not conform.
 */
export function createSyntheticAstDocument(
  children: readonly OpenUiElement[],
  subject = 'Synthetic OpenUI document',
): OpenUiDocument {
  return validateOpenUiDocument(
    {
      version: SYNTHETIC_OPENUI_VERSION,
      id: 'root',
      type: SYNTHETIC_OPENUI_ROOT_TYPE,
      children: [...children],
    },
    subject,
  );
}

/** Normalize a CLI name (kebab, snake, Pascal, or camel case) to an OpenUI element id. */
export function toAstNodeId(name: string): string {
  return strings.camelize(name);
}

function normalizeSyntheticAttributes(
  attrs: Readonly<Record<string, SyntheticAttributeValue>> | undefined,
): Record<string, string | null> | undefined {
  if (!attrs) {
    return undefined;
  }

  const entries = Object.entries(attrs).flatMap(([key, value]) =>
    value === undefined ? [] : [[key, normalizeSyntheticValue(value)] as const],
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function normalizeSyntheticValue(
  value: Exclude<SyntheticAttributeValue, undefined>,
): string | null {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  return value === null ? null : value.expression;
}
