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
  readAstReference,
  readAstString,
} from './ast-compiler';

/** OpenUI catalog type of the application routing model. */
export const ROUTING_AST_TYPE = 'Routing';

/** OpenUI catalog type of one route definition. */
export const ROUTE_AST_TYPE = 'Route';

/** OpenUI catalog type of one navigation destination. */
export const NAV_ITEM_AST_TYPE = 'NavItem';

/** Catalog-style attribute keys understood on `Routing` nodes. */
export const ROUTING_ATTRIBUTES = { defaultRoute: 'uses.defaultRoute' } as const;

/** Catalog-style attribute keys understood on `Route` nodes. */
export const ROUTE_ATTRIBUTES = {
  path: 'uses.path',
  target: 'uses.target',
  title: 'uses.title',
  redirectTo: 'uses.redirectTo',
  access: 'uses.access',
} as const;

/** Catalog-style attribute keys understood on `NavItem` nodes. */
export const NAV_ITEM_ATTRIBUTES = {
  label: 'uses.label',
  route: 'uses.route',
  icon: 'uses.icon',
  disabled: 'uses.disabled',
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
 * Collect every `Route` below one `Routing` node and check the contract rules
 * the OpenUI validator does not: only `Route` children, only supported
 * attributes, references written as quoted ids, and exactly one of `uses.target`
 * and `uses.redirectTo`. The validator itself (spec 0.6.0 and later) already
 * resolves the references and checks the type each one may name, so an unknown
 * target or route never reaches this point.
 *
 * @throws SchematicsException for unsupported attributes or children, or a route
 * with both or neither of `uses.target` and `uses.redirectTo`.
 */
export function collectRoutes(
  routing: OpenUiElement,
  documentPath: string,
): Map<string, RouteEntry> {
  const subject = astNodeSubject(documentPath, routing);
  assertAstAttributes(routing, Object.values(ROUTING_ATTRIBUTES), subject);
  const routes = new Map<string, RouteEntry>();

  const collect = (node: OpenUiElement, parent: RouteEntry | undefined): void => {
    const routeSubject = astNodeSubject(documentPath, node);
    if (node.type !== ROUTE_AST_TYPE) {
      throw new SchematicsException(
        `OpenUI node "${routeSubject}" has type "${node.type}", but ${ROUTING_AST_TYPE} may contain only ${ROUTE_AST_TYPE} children.`,
      );
    }
    assertAstAttributes(node, Object.values(ROUTE_ATTRIBUTES), routeSubject);
    const target = readAstReference(node, ROUTE_ATTRIBUTES.target, routeSubject);
    const redirect = readAstReference(node, ROUTE_ATTRIBUTES.redirectTo, routeSubject);
    if ((target === undefined) === (redirect === undefined)) {
      throw new SchematicsException(
        `OpenUI node "${routeSubject}" requires exactly one of ${ROUTE_ATTRIBUTES.target} or ${ROUTE_ATTRIBUTES.redirectTo}.`,
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
  // Accepted but unused: only the quoted-id form is checked. The validator has
  // already resolved it to a Route.
  readAstReference(routing, ROUTING_ATTRIBUTES.defaultRoute, subject);
  return routes;
}

/**
 * The full URL path of a route: its own `uses.path` matched relative to the
 * `uses.path` of every `Route` that owns it, joined with slashes. A parent
 * without a `uses.path` adds no segment; the route itself needs one.
 *
 * @throws SchematicsException when the route has no `uses.path` or any `uses.path` in
 * the chain is not lowercase URL segments separated by hyphens or slashes.
 */
export function routeFullPath(entry: RouteEntry, documentPath: string): string {
  const segments: string[] = [];
  for (let current: RouteEntry | undefined = entry; current; current = current.parent) {
    const subject = astNodeSubject(documentPath, current.node);
    const path = readAstString(current.node, ROUTE_ATTRIBUTES.path, subject);
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
 * @throws SchematicsException for unsupported attributes, a missing `uses.label`
 * or `uses.route`, or an icon that is not a lowercase Material icon identifier.
 */
export function navItemFromAst(node: OpenUiElement, documentPath: string): NavItemEntry {
  const subject = astNodeSubject(documentPath, node);
  assertAstAttributes(node, Object.values(NAV_ITEM_ATTRIBUTES), subject);
  const label = readAstString(node, NAV_ITEM_ATTRIBUTES.label, subject);
  const routeId = readAstReference(node, NAV_ITEM_ATTRIBUTES.route, subject);
  if (!label || !routeId) {
    throw new SchematicsException(
      `OpenUI node "${subject}" requires non-empty ${NAV_ITEM_ATTRIBUTES.label} and ${NAV_ITEM_ATTRIBUTES.route}.`,
    );
  }
  const icon = readAstString(node, NAV_ITEM_ATTRIBUTES.icon, subject);
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
    for (const entry of collectRoutes(routing, documentPath).values()) {
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
