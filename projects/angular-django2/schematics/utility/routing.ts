/**
 * OpenUI application routing vocabulary, shared by `application`,
 * `material-app`, and `page`.
 *
 * Ownership follows the OpenUI application contract ("Ownership and placement"
 * in the Application scope): a `Route` is the sole owner of a route path, its
 * target, title, redirect, and access requirement, and a `NavItem` is the sole
 * owner of the user-facing navigation label and icon. Pages are content-only.
 * Every schematic that needs a path, an access mode, a label, or an icon reads
 * it here, from the `Route` and `NavItem`, so the sources cannot disagree.
 *
 * @internal
 */
import { SchematicsException } from '@angular-devkit/schematics';
import type { OpenUiDocument, OpenUiElement } from '@shlomoa/openui-spec';

import {
  assertAstAttributes,
  astNodeSubject,
  createAstNodeResolver,
  readAstBoolean,
  readAstString,
} from './ast-compiler';

/** OpenUI catalog type of the application routing model. */
export const ROUTING_AST_TYPE = 'Routing';

/** OpenUI catalog type of one route definition. */
export const ROUTE_AST_TYPE = 'Route';

/** OpenUI catalog type of one navigation destination. */
export const NAV_ITEM_AST_TYPE = 'NavItem';

/** Catalog-style attribute keys understood on `Routing` nodes. */
export const ROUTING_ATTRIBUTES = { defaultRoute: '[defaultRoute]' } as const;

/** Catalog-style attribute keys understood on `Route` nodes. */
export const ROUTE_ATTRIBUTES = {
  path: '[path]',
  target: '[target]',
  title: '[title]',
  redirectTo: '[redirectTo]',
  access: '[access]',
} as const;

/** Catalog-style attribute keys understood on `NavItem` nodes. */
export const NAV_ITEM_ATTRIBUTES = {
  label: '[label]',
  route: '[route]',
  icon: '[icon]',
  disabled: '[disabled]',
} as const;

/** Lowercase URL segments separated by hyphens or slashes. */
export const ROUTE_PATH_PATTERN = /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/;

/** Lowercase Angular Material icon ligature name. */
export const NAVIGATION_ICON_PATTERN = /^[a-z0-9_]+$/;

/** A `Route` together with the `Route` that owns it, if any. */
export interface RouteEntry {
  readonly node: OpenUiElement;
  readonly parent: RouteEntry | undefined;
  /** Id of the page or content element this route resolves, when it is not a redirect. */
  readonly target: string | undefined;
}

/** A `NavItem` decoded and checked. */
export interface NavItemEntry {
  readonly label: string;
  /** Id of the `Route` this item presents. */
  readonly routeId: string;
  readonly icon: string | undefined;
  readonly disabled: boolean;
}

/**
 * Read an element reference: a quoted element-id string, for example
 * `"\"profileRoute\""`. Absent and `null` values read as `undefined`.
 *
 * @throws SchematicsException when the value is not a quoted, non-empty id.
 */
export function readElementReference(
  node: OpenUiElement,
  key: string,
  subject: string,
): string | undefined {
  const value = readAstString(node, key);
  if (value === undefined) {
    return undefined;
  }
  try {
    const reference: unknown = JSON.parse(value);
    if (typeof reference === 'string' && reference.length > 0) {
      return reference;
    }
  } catch {
    // The diagnostic below explains the required quoted element-id form.
  }
  throw new SchematicsException(
    `OpenUI node "${subject}": ${key} must be a quoted element-id string, not "${value}".`,
  );
}

/**
 * Collect every `Route` below one `Routing` node, checking the OpenUI
 * application contract's same-document references. The OpenUI validator checks
 * catalog membership only; the references are enforced here before any
 * generated output is written.
 *
 * @throws SchematicsException for unsupported attributes or children, a route
 * with both or neither of `[target]` and `[redirectTo]`, or an unknown reference.
 */
export function collectRoutes(
  routing: OpenUiElement,
  document: OpenUiDocument,
  documentPath: string,
): Map<string, RouteEntry> {
  const subject = astNodeSubject(documentPath, routing);
  assertAstAttributes(routing, Object.values(ROUTING_ATTRIBUTES), subject);
  const resolver = createAstNodeResolver(document);
  const routes = new Map<string, RouteEntry>();

  const collect = (node: OpenUiElement, parent: RouteEntry | undefined): void => {
    const routeSubject = astNodeSubject(documentPath, node);
    if (node.type !== ROUTE_AST_TYPE) {
      throw new SchematicsException(
        `OpenUI node "${routeSubject}" has type "${node.type}", but ${ROUTING_AST_TYPE} may contain only ${ROUTE_AST_TYPE} children.`,
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
    if (target !== undefined && !resolver.findById(target)) {
      throw new SchematicsException(
        `OpenUI node "${routeSubject}" references unknown target "${target}" with ${ROUTE_ATTRIBUTES.target}.`,
      );
    }
    const entry: RouteEntry = { node, parent, target };
    routes.set(node.id, entry);
    for (const child of node.children ?? []) {
      collect(child, entry);
    }
  };

  for (const child of routing.children ?? []) {
    collect(child, undefined);
  }
  const defaultRoute = readElementReference(routing, ROUTING_ATTRIBUTES.defaultRoute, subject);
  if (defaultRoute !== undefined && !routes.has(defaultRoute)) {
    throw new SchematicsException(
      `OpenUI node "${subject}" references unknown Route "${defaultRoute}" with ${ROUTING_ATTRIBUTES.defaultRoute}.`,
    );
  }
  return routes;
}

/**
 * The full URL path of a route: its own `[path]` matched relative to the
 * `[path]` of every `Route` that owns it, joined with slashes. A parent
 * without a `[path]` adds no segment; the route itself needs one.
 *
 * @throws SchematicsException when the route has no `[path]` or any `[path]` in
 * the chain is not lowercase URL segments separated by hyphens or slashes.
 */
export function routeFullPath(entry: RouteEntry, documentPath: string): string {
  const segments: string[] = [];
  for (let current: RouteEntry | undefined = entry; current; current = current.parent) {
    const subject = astNodeSubject(documentPath, current.node);
    const path = readAstString(current.node, ROUTE_ATTRIBUTES.path);
    if (!path) {
      if (current === entry) {
        throw new SchematicsException(
          `OpenUI node "${subject}" requires a non-empty ${ROUTE_ATTRIBUTES.path}.`,
        );
      }
      continue;
    }
    if (!ROUTE_PATH_PATTERN.test(path)) {
      throw new SchematicsException(
        `OpenUI node "${subject}": ${ROUTE_ATTRIBUTES.path}="${path}" must contain ` +
          'lowercase URL segments separated by hyphens or slashes.',
      );
    }
    segments.unshift(path);
  }
  return segments.join('/');
}

/**
 * Decode and check one `NavItem`.
 *
 * @throws SchematicsException for unsupported attributes, a missing `[label]`
 * or `[route]`, or an icon that is not a lowercase Material icon identifier.
 */
export function navItemFromAst(node: OpenUiElement, documentPath: string): NavItemEntry {
  const subject = astNodeSubject(documentPath, node);
  assertAstAttributes(node, Object.values(NAV_ITEM_ATTRIBUTES), subject);
  const label = readAstString(node, NAV_ITEM_ATTRIBUTES.label);
  const routeId = readElementReference(node, NAV_ITEM_ATTRIBUTES.route, subject);
  if (!label || !routeId) {
    throw new SchematicsException(
      `OpenUI node "${subject}" requires non-empty ${NAV_ITEM_ATTRIBUTES.label} and ${NAV_ITEM_ATTRIBUTES.route}.`,
    );
  }
  const icon = readAstString(node, NAV_ITEM_ATTRIBUTES.icon);
  if (icon !== undefined && !NAVIGATION_ICON_PATTERN.test(icon)) {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${NAV_ITEM_ATTRIBUTES.icon}="${icon}" must be a lowercase Angular Material icon identifier.`,
    );
  }
  return {
    label,
    routeId,
    icon,
    disabled: readAstBoolean(node, NAV_ITEM_ATTRIBUTES.disabled, subject) ?? false,
  };
}

/**
 * The `Route` that resolves `targetId`, searching every `Routing` model in the
 * document. `undefined` when no route targets the element.
 *
 * @throws SchematicsException when more than one route targets the element, or
 * when a routing model is invalid.
 */
export function findRouteForTarget(
  document: OpenUiDocument,
  documentPath: string,
  targetId: string,
): RouteEntry | undefined {
  const matches: RouteEntry[] = [];
  for (const routing of createAstNodeResolver(document).walk()) {
    if (routing.type !== ROUTING_AST_TYPE) {
      continue;
    }
    for (const entry of collectRoutes(routing, document, documentPath).values()) {
      if (entry.target === targetId) {
        matches.push(entry);
      }
    }
  }
  if (matches.length > 1) {
    throw new SchematicsException(
      `OpenUI node "${documentPath}#${targetId}" is the ${ROUTE_ATTRIBUTES.target} of ${matches.length} Route ` +
        `elements (${matches.map((entry) => entry.node.id).join(', ')}); it can be registered under one route path.`,
    );
  }
  return matches[0];
}

/**
 * The first `NavItem`, in document order, that presents `routeId`.
 * `undefined` when no navigation item does.
 *
 * @throws SchematicsException when a navigation item is invalid.
 */
export function findNavItemForRoute(
  document: OpenUiDocument,
  documentPath: string,
  routeId: string,
): NavItemEntry | undefined {
  for (const node of createAstNodeResolver(document).walk()) {
    if (node.type !== NAV_ITEM_AST_TYPE) {
      continue;
    }
    const item = navItemFromAst(node, documentPath);
    if (item.routeId === routeId) {
      return item;
    }
  }
  return undefined;
}
