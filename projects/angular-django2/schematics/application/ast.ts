/**
 * OpenUI application vocabulary (migration plan, steps 4.2 and 4.3), shared by
 * `application`, `material-app`, and `workspace-setup`.
 *
 * | OpenUI                                   | Schematic option                        |
 * | :--------------------------------------- | :-------------------------------------- |
 * | `Application` id                         | `name` (dasherized)                     |
 * | `Routing` child of `Application`         | `routing` (`true` when present)         |
 * | `Presentation[theme]`                    | `theme` (`material-app`)                |
 * | `Presentation[typography]`               | `typography` (`"true"` / `"false"`)     |
 * | `Presentation[animations]`               | `animations` (`"true"` / `"false"`)     |
 * | `html[lang]`, `[dir]`, `[title]`         | `<html lang dir>`, `<title>`            |
 * | `link[rel=icon][href]`                   | icon file copied to the app favicon     |
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

/** Catalog-style attribute keys understood on `Presentation` nodes. */
export const PRESENTATION_ATTRIBUTES = {
  theme: '[theme]',
  typography: '[typography]',
  animations: '[animations]',
} as const;

/** Catalog-style attribute keys understood on `html` nodes. */
export const INDEX_HTML_ATTRIBUTES = { lang: '[lang]', dir: '[dir]', title: '[title]' } as const;

/** Catalog-style attribute keys understood on icon `link` nodes. */
export const FAVICON_ATTRIBUTES = {
  rel: '[rel]',
  href: '[href]',
  type: '[type]',
  sizes: '[sizes]',
  media: '[media]',
} as const;

/** Application options an OpenUI `Application` node describes. */
export interface ApplicationAstOptions {
  node: OpenUiElement;
  name: string;
  routing: boolean;
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
  };
}

/** A sidenav entry compiled from a `NavItem` and its referenced `Route`. */
export interface NavigationAstLink {
  route: string;
  label: string;
  icon: string | undefined;
  disabled: boolean;
}

const ROUTING_ATTRIBUTES = { defaultRoute: '[defaultRoute]' } as const;
const ROUTE_ATTRIBUTES = {
  path: '[path]',
  target: '[target]',
  title: '[title]',
  redirectTo: '[redirectTo]',
  access: '[access]',
} as const;
const NAVIGATION_ATTRIBUTES = { ariaLabel: '[ariaLabel]' } as const;
const NAV_ITEM_ATTRIBUTES = {
  label: '[label]',
  route: '[route]',
  icon: '[icon]',
  disabled: '[disabled]',
} as const;
const NAV_GROUP_ATTRIBUTES = { label: '[label]', expanded: '[expanded]' } as const;
const ROUTE_PATH_PATTERN = /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/;
const NAVIGATION_ICON_PATTERN = /^[a-z0-9_]+$/;

/**
 * Compile `Navigation` entries through their `Route` references. The OpenUI
 * validator checks catalog membership; this enforces the 0.3.0 application
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
      const label = readAstString(child, NAV_GROUP_ATTRIBUTES.label);
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
    const label = readAstString(child, NAV_ITEM_ATTRIBUTES.label);
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
    const path = readAstString(route, ROUTE_ATTRIBUTES.path);
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
    const icon = readAstString(child, NAV_ITEM_ATTRIBUTES.icon);
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
    theme: readAstString(node, PRESENTATION_ATTRIBUTES.theme),
    typography: readAstBoolean(node, PRESENTATION_ATTRIBUTES.typography, subject),
    animations: readAstBoolean(node, PRESENTATION_ATTRIBUTES.animations, subject),
  };
}

/**
 * Decode the first non-root `html` node of the document, if any.
 *
 * @throws SchematicsException for unsupported attributes or a `[dir]` other than `ltr`, `rtl`, `auto`.
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
  const dir = readAstString(node, INDEX_HTML_ATTRIBUTES.dir);
  if (dir !== undefined && !['ltr', 'rtl', 'auto'].includes(dir)) {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${INDEX_HTML_ATTRIBUTES.dir} must be ltr, rtl, or auto, not "${dir}".`,
    );
  }

  return {
    lang: readAstString(node, INDEX_HTML_ATTRIBUTES.lang),
    dir,
    title: readAstString(node, INDEX_HTML_ATTRIBUTES.title),
  };
}

/**
 * The `[href]` of the first `link[rel=icon]` node of the document, if any.
 *
 * @throws SchematicsException for unsupported attributes or a missing `[href]`.
 */
export function faviconHrefFromAst(
  document: OpenUiDocument,
  documentPath: string,
): string | undefined {
  const node = [...createAstNodeResolver(document).walk()].find(
    (candidate) =>
      candidate.type === 'link' && readAstString(candidate, FAVICON_ATTRIBUTES.rel) === 'icon',
  );
  if (!node) {
    return undefined;
  }

  const subject = astNodeSubject(documentPath, node);
  assertAstAttributes(node, Object.values(FAVICON_ATTRIBUTES), subject);
  const href = readAstString(node, FAVICON_ATTRIBUTES.href);
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
