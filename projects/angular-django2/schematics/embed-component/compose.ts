/**
 * OpenUI composition engine (migration plan, step 3.3).
 *
 * A parent compiled from an OpenUI container compiles each child node into its
 * own component and embeds it with the `embed-component` logic, so no manual
 * `embed-component` invocation is needed. The engine is independent of the
 * child node types: callers supply one compiled child per node.
 *
 * Placement:
 * - A child picks a named projection slot with the catalog-style `[slot]`
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

import { readAstString } from '../utility/ast-compiler';
import { EMBED_SLOTS, embedComponentFile, slotSection } from './index';
import type { EmbedSlot } from './schema';

/** Catalog-style attribute that places a child node into a named slot. */
export const AST_SLOT_ATTRIBUTE = '[slot]';

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
 * Read the `[slot]` of a child node; `content` when absent.
 *
 * @throws SchematicsException for an unsupported slot name.
 */
export function readAstSlot(node: OpenUiElement, subject: string): EmbedSlot {
  const slot = readAstString(node, AST_SLOT_ATTRIBUTE) ?? 'content';
  if (!EMBED_SLOTS.includes(slot as EmbedSlot)) {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${AST_SLOT_ATTRIBUTE}="${slot}" is not a supported slot. ` +
        `Supported slots: ${EMBED_SLOTS.join(', ')}.`,
    );
  }

  return slot as EmbedSlot;
}

/** Parent template section for a child node's `[slot]`. */
export function astSlotSection(node: OpenUiElement, subject: string): string {
  return slotSection(readAstSlot(node, subject));
}

/**
 * A copy of `node` without the composition attributes (`[slot]`), so the child
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
 * Input values carried by a child node: every bracketed attribute except
 * `[slot]`, keyed by the name inside the brackets. `null` values are skipped.
 */
export function astInputBindings(node: OpenUiElement): Record<string, string> {
  const bindings: Record<string, string> = {};
  for (const [key, value] of Object.entries(node.attrs ?? {})) {
    const match = /^\[(\w+)\]$/.exec(key);
    if (match && key !== AST_SLOT_ATTRIBUTE && value !== null) {
      bindings[match[1]] = value;
    }
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
