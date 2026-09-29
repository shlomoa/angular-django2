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
import type { OpenUiAttributeValue, OpenUiDocument, OpenUiElement } from '@shlomoa/openui-spec';

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { readOpenUiDocument, validateOpenUiDocument } from './openui';
import type { WorkspaceConfig, WorkspaceProject } from './workspace';

function resolveOpenUiVersion(): string {
  try {
    const entryPath = require.resolve('@shlomoa/openui-spec');
    const pkgPath = resolve(dirname(entryPath), '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return pkg.version;
  } catch {
    return '0.8.0';
  }
}

/**
 * OpenUI specification version stamped on synthetic documents.
 * Dynamically resolved from the installed `@shlomoa/openui-spec` package.
 */
export const SYNTHETIC_OPENUI_VERSION = resolveOpenUiVersion();

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
 * Decode a quoted literal: `"\"Details\""` is the text `Details`. `undefined`
 * for anything else, including an unquoted string, which OpenUI defines as a
 * binding or target-language expression.
 */
export function decodeAstLiteral(value: unknown): string | undefined {
  if (
    typeof value !== 'string' ||
    value.length < 2 ||
    !value.startsWith('"') ||
    !value.endsWith('"')
  ) {
    return undefined;
  }
  try {
    const decoded: unknown = JSON.parse(value);
    return typeof decoded === 'string' ? decoded : undefined;
  } catch {
    return undefined;
  }
}

/** Whether the attribute is present, including as a `null` marker. */
export function hasAstAttribute(node: OpenUiElement, key: string): boolean {
  return Object.hasOwn(node.attrs ?? {}, key);
}

/**
 * Read a string attribute as a quoted literal and return its text. Absent and
 * `null` values read as `undefined`.
 *
 * angular-django2 compiles literals: the generated code is static, so an
 * unquoted string (a binding or target-language expression) is rejected rather
 * than being read as text, which would silently change its meaning.
 *
 * @throws SchematicsException for an unquoted string or a value of another type.
 */
export function readAstString(
  node: OpenUiElement,
  key: string,
  subject = node.id,
): string | undefined {
  const value = node.attrs?.[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  const literal = decodeAstLiteral(value);
  if (literal === undefined) {
    throw new SchematicsException(
      `OpenUI node "${subject}": attribute "${key}" must be a quoted string literal, ` +
        `for example ${JSON.stringify('"text"')}, not ${JSON.stringify(value)}. ` +
        'An unquoted string is a binding expression, which is not compiled.',
    );
  }
  return literal;
}

/**
 * Read a Behaves or Produces value: a target-language expression, an unquoted
 * string. Absent and `null` values read as `undefined`.
 *
 * @throws SchematicsException for a quoted literal or a value of another type.
 */
export function readAstExpression(
  node: OpenUiElement,
  key: string,
  subject = node.id,
): string | undefined {
  const value = node.attrs?.[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string' || decodeAstLiteral(value) !== undefined) {
    throw new SchematicsException(
      `OpenUI node "${subject}": attribute "${key}" must be an unquoted expression, not ${JSON.stringify(value)}.`,
    );
  }
  return value;
}

/**
 * Read a boolean attribute: the JSON value `true` or `false`.
 *
 * @throws SchematicsException for any other value, including the strings `"true"` and `"false"`.
 */
export function readAstBoolean(
  node: OpenUiElement,
  key: string,
  subject = node.id,
): boolean | undefined {
  const value = node.attrs?.[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    throw new SchematicsException(
      `OpenUI node "${subject}": attribute "${key}" must be true or false, not ${JSON.stringify(value)}.`,
    );
  }
  return value;
}

/**
 * Read a finite number attribute: a JSON number.
 *
 * @throws SchematicsException for any other value, including a number written as a string.
 */
export function readAstNumber(
  node: OpenUiElement,
  key: string,
  subject = node.id,
): number | undefined {
  const value = node.attrs?.[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new SchematicsException(
      `OpenUI node "${subject}": attribute "${key}" must be a finite number, not ${JSON.stringify(value)}.`,
    );
  }
  return value;
}

/**
 * Read an element reference: a quoted element id, for example `"\"profileRoute\""`.
 * Absent and `null` values read as `undefined`.
 *
 * @throws SchematicsException when the value is not a quoted, non-empty id.
 */
export function readAstReference(
  node: OpenUiElement,
  key: string,
  subject = node.id,
): string | undefined {
  const value = node.attrs?.[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  const id = decodeAstLiteral(value);
  if (id === undefined || id.length === 0) {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${key} must be a quoted element-id string, not ${JSON.stringify(value)}.`,
    );
  }
  return id;
}

/** A target-language expression (an unquoted string) for a synthetic attribute. */
export interface AstExpression {
  readonly expression: string;
}

/** Mark a string as an expression, so a synthetic attribute keeps it unquoted. */
export function astExpression(expression: string): AstExpression {
  return { expression };
}

/**
 * Attribute values accepted from legacy CLI options before normalization. A
 * string is a literal and is quoted; use `astExpression` for an expression.
 */
export type SyntheticAttributeValue = string | number | boolean | null | undefined | AstExpression;

/** Input for a synthetic OpenUI element built from legacy CLI options. */
export interface SyntheticAstNodeInput {
  /** Element id; normalized to the canonical lower-camel form (`user-profile` → `userProfile`). */
  readonly id: string;
  /** Canonical, case-sensitive OpenUI catalog type (for example `Form`). */
  readonly type: string;
  /** Attributes; `undefined` entries are dropped and strings are encoded as quoted literals. */
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
): Record<string, OpenUiAttributeValue> | undefined {
  if (!attrs) {
    return undefined;
  }

  const entries = Object.entries(attrs)
    .filter(([, value]) => value !== undefined)
    .map(
      ([key, value]) =>
        [key, encodeSyntheticValue(value as Exclude<typeof value, undefined>)] as const,
    );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function encodeSyntheticValue(
  value: Exclude<SyntheticAttributeValue, undefined>,
): OpenUiAttributeValue {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return typeof value === 'string' ? JSON.stringify(value) : value.expression;
}
