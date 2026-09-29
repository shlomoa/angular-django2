/**
 * OpenUI composition engine (migration plan, step 3.3).
 *
 * A parent compiled from an OpenUI container compiles each child node into its
 * own component and embeds it with the `embed-component` logic, so no manual
 * `embed-component` invocation is needed. The engine is independent of the
 * child node types: callers supply one compiled child per node.
 *
 * Placement:
 * - A child picks a named projection slot with the catalog-style `uses.slot`
 *   attribute (`header`, `content`, or `actions`); without it the child goes
 *   into `content`, which is the parent's `children` section.
 * - Children keep document order inside each slot. `embed-component` inserts
 *   right after a section's begin marker, so the engine embeds the children
 *   last-to-first.
 * - The child element binds the node's bracketed attributes that name one of
 *   the child's inputs, as string literals; other inputs keep their defaults.
 *
 * @internal
 */
import type { Rule } from '@angular-devkit/schematics';
import { chain, SchematicsException } from '@angular-devkit/schematics';
import type { OpenUiElement } from '@shlomoa/openui-spec';

import { decodeAstLiteral, readAstString } from '../utility/ast-compiler';
import { EMBED_SLOTS, embedComponentFile, slotSection, type EmbedBindingValue } from './index';
import type { EmbedSlot } from './schema';

/** Uses attribute that places a child node into a named slot. */
export const AST_SLOT_ATTRIBUTE = 'uses.slot';

/** One child node compiled into its own component. */
export interface AstChildCompilation {
  /** The child node as written in the document (its attributes feed the input bindings). */
  readonly node: OpenUiElement;
  /** Rule generating the child component. */
  readonly rule: Rule;
  /** Workspace-relative path of the generated child component TypeScript file. */
  readonly componentPath: string;
  /** Parent template section that hosts the child (see `slotSection`). */
  readonly section: string;
}

/**
 * Read the `uses.slot` of a child node; `content` when absent.
 *
 * @throws SchematicsException for an unsupported slot name.
 */
export function readAstSlot(node: OpenUiElement, subject: string): EmbedSlot {
  const slot = readAstString(node, AST_SLOT_ATTRIBUTE, subject) ?? 'content';
  if (!EMBED_SLOTS.includes(slot as EmbedSlot)) {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${AST_SLOT_ATTRIBUTE}=${JSON.stringify(slot)} is not a supported slot. ` +
        `Supported slots: ${EMBED_SLOTS.join(', ')}.`,
    );
  }

  return slot as EmbedSlot;
}

/** Parent template section for a child node's `uses.slot`. */
export function astSlotSection(node: OpenUiElement, subject: string): string {
  return slotSection(readAstSlot(node, subject));
}

/**
 * A copy of `node` without the composition attributes (`uses.slot`), so the child
 * compiler validates only its own vocabulary.
 */
export function withoutCompositionAttributes(node: OpenUiElement): OpenUiElement {
  if (!node.attrs || !(AST_SLOT_ATTRIBUTE in node.attrs)) {
    return node;
  }

  const attrs = Object.fromEntries(
    Object.entries(node.attrs).filter(([key]) => key !== AST_SLOT_ATTRIBUTE),
  );
  const copy: OpenUiElement = { ...node };
  if (Object.keys(attrs).length > 0) {
    copy.attrs = attrs;
  } else {
    delete copy.attrs;
  }

  return copy;
}

/**
 * Input values carried by a child node: every Uses attribute except
 * `uses.slot`, keyed by its name. `null` values are skipped.
 *
 * An Angular generator emits `[name]` for a Uses attribute (OpenUI, "attributes"),
 * and the value becomes the bound expression. The generated components take
 * static values, so a value must be a literal: a quoted string, a number, or a
 * boolean. An unquoted string is a binding expression and a list has no input
 * to bind, and neither is compiled.
 *
 * @throws SchematicsException for an expression or a list value.
 */
export function astInputBindings(
  node: OpenUiElement,
  subject = node.id,
): Record<string, EmbedBindingValue> {
  const bindings: Record<string, EmbedBindingValue> = {};
  for (const [key, value] of Object.entries(node.attrs ?? {})) {
    const match = /^uses\.(\w+)$/.exec(key);
    if (!match || key === AST_SLOT_ATTRIBUTE || value === null) {
      continue;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      bindings[match[1]] = value;
      continue;
    }
    const literal = decodeAstLiteral(value);
    if (literal === undefined) {
      throw new SchematicsException(
        `OpenUI node "${subject}": attribute "${key}" must be a quoted string, a number, or a boolean ` +
          `to bind as an input, not ${JSON.stringify(value)}. Binding expressions and lists are not compiled.`,
      );
    }
    bindings[match[1]] = literal;
  }

  return bindings;
}

/**
 * Generate every child, then embed each one into the parent component at
 * `parentComponentPath` in document order within its section.
 */
export function composeAstChildren(
  parentComponentPath: string,
  children: readonly AstChildCompilation[],
): Rule {
  const embeddings = [...children].reverse().map((child) =>
    embedComponentFile(child.componentPath, parentComponentPath, {
      section: child.section,
      strict: true,
      bindings: astInputBindings(child.node),
    }),
  );

  return chain([...children.map((child) => child.rule), ...embeddings]);
}
