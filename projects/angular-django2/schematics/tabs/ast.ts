/**
 * OpenUI tabs vocabulary (`containers/tabs`), shared by the `tabs` compiler and
 * its templates.
 *
 * A `Tabs` node compiles into a standalone OnPush component. Its attributes are
 * those of the `Tabs` contract (openui-spec 0.12.0, `spec/scopes/Containers/tabs.scope.md`):
 *
 * | OpenUI attribute              | Value                                      | Generated                                              |
 * | :---------------------------- | :----------------------------------------- | :----------------------------------------------------- |
 * | `uses.selectedIndex`          | integer (unquoted `"1"`), default `"0"`    | the initial value of the `selectedIndex` model signal  |
 * | `uses.orientation`            | `"\"horizontal\""` or `"\"vertical\""`     | Material tab group, or an ARIA vertical tablist        |
 * | `produces.selectedTabChange`  | `null` marker                              | the `selectedTabChange` output signal                  |
 *
 * The children are `tab` nodes (1..n). The catalog declares no attribute for a
 * `tab`, and the scope leaves "the label and disabled state of one tab" to that
 * tab, so `uses.label` (required) and `uses.disabled` are `angular-django2`
 * extensions. The children of a `tab` are its content, compiled into their own
 * components with the shared composition engine and embedded in the tab body.
 *
 * A page stack (tabs without a visible tab strip) has no attribute in the
 * contract and is not compiled: every `Tabs` renders its tab strip.
 *
 * @internal
 */
import { strings } from '@angular-devkit/core';
import { SchematicsException } from '@angular-devkit/schematics';
import type { OpenUiElement } from '@shlomoa/openui-spec';

import { COMPOSABLE_CHILD_AST_TYPES } from '../component/ast';
import { AST_SLOT_ATTRIBUTE } from '../embed-component/compose';
import {
  assertAstAttributes,
  astNodeSubject,
  readAstBoolean,
  readAstNumber,
  readAstString,
} from '../utility/ast-compiler';

/** OpenUI catalog type compiled by the `tabs` schematic. */
export const TABS_AST_TYPE = 'Tabs';

/** OpenUI catalog type of one tab of a `Tabs` container. */
export const TAB_AST_TYPE = 'tab';

/** Attribute keys understood on `Tabs` nodes (the catalog declares all three). */
export const TABS_ATTRIBUTES = {
  selectedIndex: 'uses.selectedIndex',
  orientation: 'uses.orientation',
  selectedTabChange: 'produces.selectedTabChange',
} as const;

/** Attribute keys understood on `tab` nodes; the catalog declares none (extensions). */
export const TAB_ATTRIBUTES = {
  label: 'uses.label',
  disabled: 'uses.disabled',
} as const;

/** Tab strip directions of `uses.orientation`. */
export const TABS_ORIENTATIONS = ['horizontal', 'vertical'] as const;

export type TabsOrientation = (typeof TABS_ORIENTATIONS)[number];

/** Node types a tab can host: the composable container children, and nested `Tabs`. */
export const TAB_CONTENT_AST_TYPES = [...COMPOSABLE_CHILD_AST_TYPES, TABS_AST_TYPE] as const;

/** One tab of a compiled `Tabs` node. */
export interface TabAstOptions {
  /** OpenUI element id of the `tab`. */
  readonly id: string;
  /** Template section that hosts the embedded content of this tab. */
  readonly section: string;
  /** Visible tab label. */
  readonly label: string;
  /** Whether the tab cannot be selected. */
  readonly disabled: boolean;
  /** Content nodes, in document order. */
  readonly content: readonly OpenUiElement[];
}

/** The `Tabs` options a node describes. */
export interface TabsAstOptions {
  /** Initially selected tab, counted from zero. */
  readonly selectedIndex: number;
  /** Direction of the tab strip. */
  readonly orientation: TabsOrientation;
  /** Whether the component emits `selectedTabChange`. */
  readonly selectedTabChange: boolean;
  /** The tabs, in document order. */
  readonly tabs: readonly TabAstOptions[];
}

/** Template section name that hosts the content of the tab with the given element id. */
export function tabSection(tabId: string): string {
  return `tab-${strings.dasherize(tabId)}`;
}

/**
 * Decode a `Tabs` node into the options of its component. Everything the node
 * says is checked here, before anything is generated.
 *
 * @throws SchematicsException for unsupported attributes, children, or values.
 */
export function tabsOptionsFromAst(node: OpenUiElement, documentPath: string): TabsAstOptions {
  const subject = astNodeSubject(documentPath, node);
  if (node.type !== TABS_AST_TYPE) {
    throw new SchematicsException(
      `OpenUI node "${subject}" has type "${node.type}", which is not ${TABS_AST_TYPE}.`,
    );
  }
  assertAstAttributes(node, Object.values(TABS_ATTRIBUTES), subject);

  const tabNodes = node.children ?? [];
  if (tabNodes.length === 0) {
    throw new SchematicsException(
      `OpenUI node "${subject}" is ${TABS_AST_TYPE} and needs at least one ${TAB_AST_TYPE} child.`,
    );
  }
  const tabs = tabNodes.map((tab) => tabFromAst(tab, documentPath, node));

  const orientation = readOrientation(node, subject);
  const selectedIndex = readSelectedIndex(node, subject, tabs);
  const marker = node.attrs?.[TABS_ATTRIBUTES.selectedTabChange];
  if (TABS_ATTRIBUTES.selectedTabChange in (node.attrs ?? {}) && marker !== null) {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${TABS_ATTRIBUTES.selectedTabChange} must be null when present.`,
    );
  }

  return {
    selectedIndex,
    orientation,
    selectedTabChange: marker === null,
    tabs,
  };
}

function readOrientation(node: OpenUiElement, subject: string): TabsOrientation {
  const orientation = readAstString(node, TABS_ATTRIBUTES.orientation, subject) ?? 'horizontal';
  if (!(TABS_ORIENTATIONS as readonly string[]).includes(orientation)) {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${TABS_ATTRIBUTES.orientation}="${orientation}" is not supported. ` +
        `Supported orientations: ${TABS_ORIENTATIONS.join(', ')}.`,
    );
  }

  return orientation as TabsOrientation;
}

function readSelectedIndex(
  node: OpenUiElement,
  subject: string,
  tabs: readonly TabAstOptions[],
): number {
  const selectedIndex = readAstNumber(node, TABS_ATTRIBUTES.selectedIndex, subject) ?? 0;
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= tabs.length) {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${TABS_ATTRIBUTES.selectedIndex}="${selectedIndex}" must be an integer ` +
        `from 0 to ${tabs.length - 1}, the position of one of its ${tabs.length} tab(s).`,
    );
  }
  if (tabs[selectedIndex].disabled) {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${TABS_ATTRIBUTES.selectedIndex}="${selectedIndex}" selects the disabled ` +
        `tab "${tabs[selectedIndex].id}".`,
    );
  }

  return selectedIndex;
}

function tabFromAst(tab: OpenUiElement, documentPath: string, tabs: OpenUiElement): TabAstOptions {
  const subject = astNodeSubject(documentPath, tab);
  if (tab.type !== TAB_AST_TYPE) {
    throw new SchematicsException(
      `OpenUI node "${subject}" has type "${tab.type}", but ${TABS_AST_TYPE} "${tabs.id}" may contain ` +
        `only ${TAB_AST_TYPE} children.`,
    );
  }
  assertAstAttributes(tab, Object.values(TAB_ATTRIBUTES), subject);

  const label = readAstString(tab, TAB_ATTRIBUTES.label, subject);
  if (label === undefined || label.trim() === '') {
    throw new SchematicsException(
      `OpenUI node "${subject}" requires a non-empty ${TAB_ATTRIBUTES.label} (a quoted string literal).`,
    );
  }

  const content = tab.children ?? [];
  for (const child of content) {
    assertTabContent(child, documentPath, subject);
  }

  return {
    id: tab.id,
    section: tabSection(tab.id),
    label,
    disabled: readAstBoolean(tab, TAB_ATTRIBUTES.disabled, subject) ?? false,
    content,
  };
}

function assertTabContent(child: OpenUiElement, documentPath: string, tabSubject: string): void {
  const subject = astNodeSubject(documentPath, child);
  if (!(TAB_CONTENT_AST_TYPES as readonly string[]).includes(child.type)) {
    throw new SchematicsException(
      `OpenUI node "${subject}" has type "${child.type}", which cannot be the content of tab "${tabSubject}". ` +
        `Supported content types: ${TAB_CONTENT_AST_TYPES.join(', ')}.`,
    );
  }
  if (child.attrs !== undefined && AST_SLOT_ATTRIBUTE in child.attrs) {
    throw new SchematicsException(
      `OpenUI node "${subject}" is the content of tab "${tabSubject}" and cannot choose a ` +
        `${AST_SLOT_ATTRIBUTE}; tab content always goes into the tab body.`,
    );
  }
}
