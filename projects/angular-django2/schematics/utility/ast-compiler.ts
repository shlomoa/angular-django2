/**
 * Shared OpenUI AST compiler core for document-driven schematics.
 *
 * Every schematic that compiles UI from OpenUI follows the same two-step
 * pattern (see `docs/migrate_schematics_to_openui_plan.md`, section 3.2):
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
import type { OpenUiDocument, OpenUiElement } from '@shlomoa/openui-spec';

import { validateOpenUiDocument } from './openui';
import type { WorkspaceConfig, WorkspaceProject } from './workspace';

/**
 * OpenUI specification version stamped on synthetic documents.
 * Keep aligned with the `@shlomoa/openui-spec` dependency in package.json.
 */
export const SYNTHETIC_OPENUI_VERSION = '0.2.0';

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
 * Missing-node diagnostics reuse the canonical `openui-spec` wording
 * (`object not found: <id>`).
 *
 * @throws SchematicsException when the node is missing or has the wrong type.
 */
export function resolveAstNode(
  document: OpenUiDocument,
  nodeId?: string,
  expectedType?: string,
): OpenUiElement {
  const resolver = createAstNodeResolver(document);

  if (nodeId !== undefined) {
    const node = resolver.findById(nodeId);
    if (!node) {
      throw new SchematicsException(
        `OpenUI node "${nodeId}" was not found in the document (object not found: ${nodeId}). ` +
          'Pass an existing element id with --nodeId.',
      );
    }
    if (expectedType !== undefined && node.type !== expectedType) {
      throw new SchematicsException(
        `OpenUI node "${nodeId}" has type "${node.type}" but this schematic expects "${expectedType}". ` +
          `Pass the id of a "${expectedType}" element with --nodeId.`,
      );
    }
    return node;
  }

  if (expectedType !== undefined) {
    const node = resolver.findByType(expectedType);
    if (!node) {
      throw new SchematicsException(
        `OpenUI document contains no "${expectedType}" element. ` +
          `Add one or pass the id of a "${expectedType}" element with --nodeId.`,
      );
    }
    return node;
  }

  return document;
}

/** Attribute values accepted from legacy CLI options before normalization. */
export type SyntheticAttributeValue = string | number | boolean | null | undefined;

/** Input for a synthetic OpenUI element built from legacy CLI options. */
export interface SyntheticAstNodeInput {
  /** Element id; normalized to the canonical lower-camel form (`user-profile` → `userProfile`). */
  readonly id: string;
  /** Canonical, case-sensitive OpenUI catalog type (for example `Form`). */
  readonly type: string;
  /** Attributes; `undefined` entries are dropped, numbers and booleans are stringified. */
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

  const entries = Object.entries(attrs)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => [key, value === null ? null : String(value)] as const);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
