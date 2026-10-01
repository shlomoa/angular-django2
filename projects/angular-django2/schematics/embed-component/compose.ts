/**
 * OpenUI composition engine (migration plan, step 3.3).
 *
 * A parent compiled from an OpenUI container compiles each child node into its
 * own component and embeds it with the `embed-component` logic, so no manual
 * `embed-component` invocation is needed. The engine is independent of the
 * child node types: callers supply one compiled child per node.
 *
 * Placement:
 * - A child picks a named projection slot with the `uses.slot`
 *   attribute (`header`, `content`, or `actions`); without it the child goes
 *   into `content`, which is the parent's `children` section.
 * - Children keep document order inside each slot. `embed-component` inserts
 *   right after a section's begin marker, so the engine embeds the children
 *   last-to-first.
 * - The child element binds the node's `uses.` attributes that name one of
 *   the child's inputs: a quoted literal as a string literal, an unquoted
 *   string as the Angular expression itself (`"true"` binds `true`); other
 *   inputs keep their defaults.
 *
 * @internal
 */
import type { Rule } from '@angular-devkit/schematics';
import { chain, SchematicsException } from '@angular-devkit/schematics';
import type { OpenUiElement } from '@shlomoa/openui-spec';

import { readAstString, readAstValue } from '../utility/ast-compiler';
import { EMBED_SLOTS, embedComponentFile, slotSection } from './index';
import type { EmbedBinding } from './index';
import type { EmbedSlot } from './schema';

/** Attribute that places a child node into a named slot (an extension: the catalog declares no slot). */
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
      `OpenUI node "${subject}": ${AST_SLOT_ATTRIBUTE}="${slot}" is not a supported slot. ` +
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
 * Input values carried by a child node: every `uses.` attribute except
 * `uses.slot`, keyed by the name after the prefix. `null` values are skipped.
 * A quoted literal contributes its decoded text (bound as a string literal); an
 * unquoted string is an Angular template expression and is bound as written, so
 * a typed value (`"true"`, `"25"`) binds as `true` or `25`. Attributes the child
 * has no input for are carried along and ignored by the renderer.
 *
 * @throws SchematicsException for a list or an empty expression.
 */
export function astInputBindings(node: OpenUiElement): Record<string, EmbedBinding> {
  const bindings: Record<string, EmbedBinding> = {};
  for (const [key, value] of Object.entries(node.attrs ?? {})) {
    const match = /^uses\.(\w+)$/.exec(key);
    if (!match || key === AST_SLOT_ATTRIBUTE || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      throw new SchematicsException(
        `OpenUI node "${node.id}": attribute "${key}" is a list, which cannot be bound to a component input.`,
      );
    }
    const written = readAstValue(node, key);
    if (written === undefined) {
      continue;
    }
    if ('literal' in written) {
      bindings[match[1]] = written.literal;
    } else if (written.expression.trim() === '') {
      throw new SchematicsException(
        `OpenUI node "${node.id}": attribute "${key}" is an empty expression; ` +
          'write a quoted literal or an Angular expression.',
      );
    } else {
      bindings[match[1]] = written;
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
