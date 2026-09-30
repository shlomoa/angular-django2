/**
 * OpenUI application vocabulary (migration plan, steps 4.2 and 4.3), shared by
 * `application`, `material-app`, and `workspace-setup`.
 *
 * | OpenUI                                   | Schematic option                        |
 * | :--------------------------------------- | :-------------------------------------- |
 * | `Application` id                         | `name` (dasherized)                     |
 * | `Routing` child of `Application`         | `routing` (`true` when present)         |
 * | `Presentation` `uses.theme`              | `theme` (`material-app`)                |
 * | `Presentation` `uses.typography`         | `typography` (JSON `true` / `false`)    |
 * | `Presentation` `uses.animations`         | `animations` (JSON `true` / `false`)    |
 * | `html` `uses.lang`, `uses.dir`, `uses.title` | `<html lang dir>`, `<title>`            |
 * | `link` `uses.rel` `"icon"`, `uses.href`  | icon file copied to the app favicon     |
 *
 * @internal
 */
import { strings } from '@angular-devkit/core';
import { SchematicsException } from '@angular-devkit/schematics';
import type { OpenUiDocument, OpenUiElement } from '@shlomoa/openui-spec';

import {
  assertAstAttributes,
  astNodeSubject,
  createAstNodeResolver,
  readAstBoolean,
  readAstString,
  resolveAstNode,
} from '../utility/ast-compiler';

/** OpenUI catalog type of the application root element. */
export const APPLICATION_AST_TYPE = 'Application';

/** Child types an `Application` node may contain. */
export const APPLICATION_CHILD_AST_TYPES = [
  'Routing',
  'Navigation',
  'ToolBar',
  'Presentation',
  'html',
  'link',
] as const;

/** Attribute keys understood on `Presentation` nodes (extensions: the catalog declares none). */
export const PRESENTATION_ATTRIBUTES = {
  theme: 'uses.theme',
  typography: 'uses.typography',
  animations: 'uses.animations',
} as const;

/** Attribute keys understood on `html` nodes. */
export const INDEX_HTML_ATTRIBUTES = {
  lang: 'uses.lang',
  dir: 'uses.dir',
  title: 'uses.title',
} as const;

/** Attribute keys understood on icon `link` nodes. */
export const FAVICON_ATTRIBUTES = {
  rel: 'uses.rel',
  href: 'uses.href',
  type: 'uses.type',
  sizes: 'uses.sizes',
  media: 'uses.media',
} as const;

/** Application options an OpenUI `Application` node describes. */
export interface ApplicationAstOptions {
  node: OpenUiElement;
  name: string;
  routing: boolean;
  toolBar: ToolBarAstOptions | undefined;
}

/** An application toolbar action compiled from a `ToolAction` node. */
export interface ToolActionAstOptions {
  id: string;
  label: string;
  icon: string | undefined;
  disabled: boolean;
  activate: boolean;
}

/** An ordered application toolbar row compiled from a `ToolBarRow` node. */
export interface ToolBarRowAstOptions {
  actions: readonly ToolActionAstOptions[];
}

/** An application toolbar compiled from a `ToolBar` node. */
export interface ToolBarAstOptions {
  ariaLabel: string | undefined;
  rows: readonly ToolBarRowAstOptions[];
}

/** Presentation tokens an OpenUI `Presentation` node describes. */
export interface PresentationAstOptions {
  theme: string | undefined;
  typography: boolean | undefined;
  animations: boolean | undefined;
}

/** Host document settings an OpenUI `html` node describes. */
export interface IndexHtmlAstOptions {
  lang: string | undefined;
  dir: string | undefined;
  title: string | undefined;
}

/**
 * Resolve and decode the `Application` node (by `nodeId`, else the first one).
 *
 * @throws SchematicsException when the node is missing, has unsupported
 * attributes, or has unsupported direct children.
 */
export function applicationFromAst(
  document: OpenUiDocument,
  documentPath: string,
  nodeId: string | undefined,
): ApplicationAstOptions {
  const node = resolveAstNode(document, nodeId, APPLICATION_AST_TYPE);
  const subject = astNodeSubject(documentPath, node);
  assertAstAttributes(node, [], subject);

  const unsupported = (node.children ?? []).find(
    (child) => !(APPLICATION_CHILD_AST_TYPES as readonly string[]).includes(child.type),
  );
  if (unsupported) {
    throw new SchematicsException(
      `OpenUI node "${astNodeSubject(documentPath, unsupported)}" has type "${unsupported.type}", ` +
        `which is not a supported ${APPLICATION_AST_TYPE} child. ` +
        `Supported child types: ${APPLICATION_CHILD_AST_TYPES.join(', ')}.`,
    );
  }

  return {
    node,
    name: strings.dasherize(node.id),
    routing: directChild(node, 'Routing', documentPath) !== undefined,
    toolBar: toolBarFromAst(node, documentPath),
  };
}

/** A sidenav entry compiled from a `NavItem` and its referenced `Route`. */
export interface NavigationAstLink {
  route: string;
  label: string;
  icon: string | undefined;
  disabled: boolean;
}

const ROUTING_ATTRIBUTES = { defaultRoute: 'uses.defaultRoute' } as const;
const ROUTE_ATTRIBUTES = {
  path: 'uses.path',
  target: 'uses.target',
  title: 'uses.title',
  redirectTo: 'uses.redirectTo',
  access: 'uses.access',
} as const;
const NAVIGATION_ATTRIBUTES = { ariaLabel: 'uses.ariaLabel' } as const;
const NAV_ITEM_ATTRIBUTES = {
  label: 'uses.label',
  route: 'uses.route',
  icon: 'uses.icon',
  disabled: 'uses.disabled',
} as const;
const NAV_GROUP_ATTRIBUTES = { label: 'uses.label', expanded: 'uses.expanded' } as const;
const TOOL_BAR_ATTRIBUTES = { ariaLabel: 'uses.ariaLabel' } as const;
const TOOL_ACTION_ATTRIBUTES = {
  label: 'uses.label',
  icon: 'uses.icon',
  disabled: 'uses.disabled',
  activate: 'produces.activate',
} as const;
const ROUTE_PATH_PATTERN = /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/;
const NAVIGATION_ICON_PATTERN = /^[a-z0-9_]+$/;

/**
 * Compile the application `ToolBar` command surface. Its optional `produces.activate`
 * event is represented by a null-valued marker, so document data never becomes
 * an unchecked Angular expression.
 */
export function toolBarFromAst(
  application: OpenUiElement,
  documentPath: string,
): ToolBarAstOptions | undefined {
  const toolBar = directChild(application, 'ToolBar', documentPath);
  if (!toolBar) {
    return undefined;
  }

  const subject = astNodeSubject(documentPath, toolBar);
  assertAstAttributes(toolBar, Object.values(TOOL_BAR_ATTRIBUTES), subject);
  return {
    ariaLabel: readAstString(toolBar, TOOL_BAR_ATTRIBUTES.ariaLabel, subject),
    rows: (toolBar.children ?? []).map((row) => toolBarRowFromAst(row, documentPath)),
  };
}

function toolBarRowFromAst(row: OpenUiElement, documentPath: string): ToolBarRowAstOptions {
  const subject = astNodeSubject(documentPath, row);
  if (row.type !== 'ToolBarRow') {
    throw new SchematicsException(
      `OpenUI node "${subject}" has type "${row.type}", but ToolBar may contain only ToolBarRow children.`,
    );
  }
  assertAstAttributes(row, [], subject);

  return {
    actions: (row.children ?? []).map((action) => toolActionFromAst(action, documentPath)),
  };
}

function toolActionFromAst(action: OpenUiElement, documentPath: string): ToolActionAstOptions {
  const subject = astNodeSubject(documentPath, action);
  if (action.type !== 'ToolAction') {
    throw new SchematicsException(
      `OpenUI node "${subject}" has type "${action.type}", but ToolBarRow may contain only ToolAction children.`,
    );
  }
  assertAstAttributes(action, Object.values(TOOL_ACTION_ATTRIBUTES), subject);
  if ((action.children ?? []).length > 0) {
    throw new SchematicsException(
      `OpenUI node "${subject}" is a ToolAction and may not contain children.`,
    );
  }

  const label = readAstString(action, TOOL_ACTION_ATTRIBUTES.label, subject);
  if (!label) {
    throw new SchematicsException(
      `OpenUI node "${subject}" requires a non-empty ${TOOL_ACTION_ATTRIBUTES.label}.`,
    );
  }
  const activate = TOOL_ACTION_ATTRIBUTES.activate in (action.attrs ?? {});
  if (activate && action.attrs?.[TOOL_ACTION_ATTRIBUTES.activate] !== null) {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${TOOL_ACTION_ATTRIBUTES.activate} must be null when present.`,
    );
  }

  return {
    id: action.id,
    label,
    icon: readAstString(action, TOOL_ACTION_ATTRIBUTES.icon, subject),
    disabled: readAstBoolean(action, TOOL_ACTION_ATTRIBUTES.disabled, subject) ?? false,
    activate,
  };
}

/**
 * Compile `Navigation` entries through their `Route` references. The OpenUI
 * validator checks catalog membership; this enforces the OpenUI application
 * contract's same-document references before generated output is written.
 */
export function navigationLinksFromAst(
  application: OpenUiElement,
  document: OpenUiDocument,
  documentPath: string,
): NavigationAstLink[] {
  const routing = directChild(application, 'Routing', documentPath);
  const navigation = directChild(application, 'Navigation', documentPath);
  if (!navigation) {
    return [];
  }

  const navigationSubject = astNodeSubject(documentPath, navigation);
  assertAstAttributes(navigation, Object.values(NAVIGATION_ATTRIBUTES), navigationSubject);
  if (!routing) {
    throw new SchematicsException(
      `OpenUI node "${navigationSubject}" requires an Application Routing child.`,
    );
  }

  const routes = routesFromAst(routing, document, documentPath);
  const links: NavigationAstLink[] = [];
  collectNavigationLinks(navigation, routes, documentPath, links);
  return links;
}

function routesFromAst(
  routing: OpenUiElement,
  document: OpenUiDocument,
  documentPath: string,
): Map<string, OpenUiElement> {
  const subject = astNodeSubject(documentPath, routing);
  assertAstAttributes(routing, Object.values(ROUTING_ATTRIBUTES), subject);
  const routes = new Map<string, OpenUiElement>();

  const collect = (node: OpenUiElement): void => {
    const routeSubject = astNodeSubject(documentPath, node);
    if (node.type !== 'Route') {
      throw new SchematicsException(
        `OpenUI node "${routeSubject}" has type "${node.type}", but Routing may contain only Route children.`,
      );
    }
    assertAstAttributes(node, Object.values(ROUTE_ATTRIBUTES), routeSubject);
    const target = readElementReference(node, ROUTE_ATTRIBUTES.target, routeSubject);
    const redirect = readElementReference(node, ROUTE_ATTRIBUTES.redirectTo, routeSubject);
    if ((target === undefined) === (redirect === undefined)) {
      throw new SchematicsException(
        `OpenUI node "${routeSubject}" requires exactly one of ${ROUTE_ATTRIBUTES.target} or ${ROUTE_ATTRIBUTES.redirectTo}.`,
      );
    }
    if (target !== undefined && !createAstNodeResolver(document).findById(target)) {
      throw new SchematicsException(
        `OpenUI node "${routeSubject}" references unknown target "${target}" with ${ROUTE_ATTRIBUTES.target}.`,
      );
    }
    routes.set(node.id, node);
    for (const child of node.children ?? []) {
      collect(child);
    }
  };

  for (const child of routing.children ?? []) {
    collect(child);
  }
  const defaultRoute = readElementReference(routing, ROUTING_ATTRIBUTES.defaultRoute, subject);
  if (defaultRoute !== undefined && !routes.has(defaultRoute)) {
    throw new SchematicsException(
      `OpenUI node "${subject}" references unknown Route "${defaultRoute}" with ${ROUTING_ATTRIBUTES.defaultRoute}.`,
    );
  }
  return routes;
}

function collectNavigationLinks(
  node: OpenUiElement,
  routes: ReadonlyMap<string, OpenUiElement>,
  documentPath: string,
  links: NavigationAstLink[],
): void {
  for (const child of node.children ?? []) {
    const subject = astNodeSubject(documentPath, child);
    if (child.type === 'NavGroup') {
      assertAstAttributes(child, Object.values(NAV_GROUP_ATTRIBUTES), subject);
      const label = readAstString(child, NAV_GROUP_ATTRIBUTES.label, subject);
      if (!label) {
        throw new SchematicsException(
          `OpenUI node "${subject}" requires a non-empty ${NAV_GROUP_ATTRIBUTES.label}.`,
        );
      }
      collectNavigationLinks(child, routes, documentPath, links);
      continue;
    }
    if (child.type !== 'NavItem') {
      throw new SchematicsException(
        `OpenUI node "${subject}" has type "${child.type}", but Navigation may contain only NavItem or NavGroup children.`,
      );
    }
    assertAstAttributes(child, Object.values(NAV_ITEM_ATTRIBUTES), subject);
    const label = readAstString(child, NAV_ITEM_ATTRIBUTES.label, subject);
    const routeId = readElementReference(child, NAV_ITEM_ATTRIBUTES.route, subject);
    if (!label || !routeId) {
      throw new SchematicsException(
        `OpenUI node "${subject}" requires non-empty ${NAV_ITEM_ATTRIBUTES.label} and ${NAV_ITEM_ATTRIBUTES.route}.`,
      );
    }
    const route = routes.get(routeId);
    if (!route) {
      throw new SchematicsException(
        `OpenUI node "${subject}" references unknown Route "${routeId}" with ${NAV_ITEM_ATTRIBUTES.route}.`,
      );
    }
    const path = readAstString(route, ROUTE_ATTRIBUTES.path, astNodeSubject(documentPath, route));
    if (!path) {
      throw new SchematicsException(
        `OpenUI node "${astNodeSubject(documentPath, route)}" requires a non-empty ${ROUTE_ATTRIBUTES.path}.`,
      );
    }
    if (!ROUTE_PATH_PATTERN.test(path)) {
      throw new SchematicsException(
        `OpenUI node "${astNodeSubject(documentPath, route)}": ${ROUTE_ATTRIBUTES.path}="${path}" must contain ` +
          'lowercase URL segments separated by hyphens or slashes.',
      );
    }
    const icon = readAstString(child, NAV_ITEM_ATTRIBUTES.icon, subject);
    if (icon !== undefined && !NAVIGATION_ICON_PATTERN.test(icon)) {
      throw new SchematicsException(
        `OpenUI node "${subject}": ${NAV_ITEM_ATTRIBUTES.icon}="${icon}" must be a lowercase Angular Material icon identifier.`,
      );
    }
    links.push({
      route: path,
      label,
      icon,
      disabled: readAstBoolean(child, NAV_ITEM_ATTRIBUTES.disabled, subject) ?? false,
    });
  }
}

function readElementReference(
  node: OpenUiElement,
  key: string,
  subject: string,
): string | undefined {
  const reference = readAstString(node, key, subject);
  if (reference === undefined) {
    return undefined;
  }
  if (reference.length === 0) {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${key} must be a quoted element-id string, not an empty string.`,
    );
  }
  return reference;
}

/**
 * Decode the `Presentation` child of an `Application` node; all tokens are
 * `undefined` when there is none. The theme is returned unchecked so
 * `material-setup` keeps reporting unsupported themes.
 *
 * @throws SchematicsException for unsupported attributes or malformed booleans.
 */
export function presentationFromAst(
  application: OpenUiElement,
  documentPath: string,
): PresentationAstOptions {
  const node = directChild(application, 'Presentation', documentPath);
  if (!node) {
    return { theme: undefined, typography: undefined, animations: undefined };
  }

  const subject = astNodeSubject(documentPath, node);
  assertAstAttributes(node, Object.values(PRESENTATION_ATTRIBUTES), subject);
  return {
    theme: readAstString(node, PRESENTATION_ATTRIBUTES.theme, subject),
    typography: readAstBoolean(node, PRESENTATION_ATTRIBUTES.typography, subject),
    animations: readAstBoolean(node, PRESENTATION_ATTRIBUTES.animations, subject),
  };
}

/**
 * Decode the first non-root `html` node of the document, if any.
 *
 * @throws SchematicsException for unsupported attributes or a `uses.dir` other than `ltr`, `rtl`, `auto`.
 */
export function indexHtmlFromAst(
  document: OpenUiDocument,
  documentPath: string,
): IndexHtmlAstOptions | undefined {
  const node = [...createAstNodeResolver(document).walk()].find(
    (candidate) => candidate.type === 'html' && candidate !== document,
  );
  if (!node) {
    return undefined;
  }

  const subject = astNodeSubject(documentPath, node);
  assertAstAttributes(node, Object.values(INDEX_HTML_ATTRIBUTES), subject);
  const dir = readAstString(node, INDEX_HTML_ATTRIBUTES.dir, subject);
  if (dir !== undefined && !['ltr', 'rtl', 'auto'].includes(dir)) {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${INDEX_HTML_ATTRIBUTES.dir} must be ltr, rtl, or auto, not "${dir}".`,
    );
  }

  return {
    lang: readAstString(node, INDEX_HTML_ATTRIBUTES.lang, subject),
    dir,
    title: readAstString(node, INDEX_HTML_ATTRIBUTES.title, subject),
  };
}

/**
 * The `uses.href` of the first `link` node with `uses.rel` `"icon"` of the document, if any.
 *
 * @throws SchematicsException for unsupported attributes or a missing `uses.href`.
 */
export function faviconHrefFromAst(
  document: OpenUiDocument,
  documentPath: string,
): string | undefined {
  const node = [...createAstNodeResolver(document).walk()].find(
    (candidate) =>
      candidate.type === 'link' &&
      readAstString(candidate, FAVICON_ATTRIBUTES.rel, astNodeSubject(documentPath, candidate)) ===
        'icon',
  );
  if (!node) {
    return undefined;
  }

  const subject = astNodeSubject(documentPath, node);
  assertAstAttributes(node, Object.values(FAVICON_ATTRIBUTES), subject);
  const href = readAstString(node, FAVICON_ATTRIBUTES.href, subject);
  if (!href) {
    throw new SchematicsException(
      `OpenUI node "${subject}" needs ${FAVICON_ATTRIBUTES.href} with the workspace-relative icon file.`,
    );
  }

  return href;
}

function directChild(
  node: OpenUiElement,
  type: string,
  documentPath: string,
): OpenUiElement | undefined {
  const matches = (node.children ?? []).filter((child) => child.type === type);
  if (matches.length > 1) {
    throw new SchematicsException(
      `OpenUI node "${astNodeSubject(documentPath, node)}" has ${matches.length} ${type} children; ` +
        'at most one is supported.',
    );
  }

  return matches[0];
}
