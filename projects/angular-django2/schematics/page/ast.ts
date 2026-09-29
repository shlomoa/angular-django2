/**
 * OpenUI page vocabulary, used by `page`.
 *
 * A page is content-only. Following the OpenUI application contract
 * ("Ownership and placement" in the Application scope), a page node carries no
 * routing, navigation, or access attributes: the path and access requirement
 * belong to the `Route` whose `[target]` is the page, and the navigation label
 * and icon to the `NavItem` that presents that route. The page reads them from
 * there, so `page` and `material-app` cannot disagree.
 *
 * | Source                                        | page option         | Default              |
 * | :-------------------------------------------- | :------------------ | :------------------- |
 * | id                                            | `name` (dasherized) | —                    |
 * | page `[title]`                                | card heading        | classified page name |
 * | full `[path]` of the `Route` targeting it     | `routePath`         | required             |
 * | that `Route`'s `[access]`                     | `access`            | `public`             |
 * | `[label]` of the `NavItem` presenting it      | `navigationLabel`   | classified page name |
 * | that `NavItem`'s `[icon]`                     | `navigationIcon`    | none                 |
 *
 * The auth guard stays the `--authGuard` option: OpenUI expresses access as
 * policy and leaves guards to the implementation.
 *
 * `DashboardPage` children are composed into the page body (plan step 3.3);
 * `EmptyPage` has no content, so it takes no children.
 *
 * @internal
 */
import { strings } from '@angular-devkit/core';
import { SchematicsException } from '@angular-devkit/schematics';
import type { OpenUiDocument, OpenUiElement } from '@shlomoa/openui-spec';

import { assertAstAttributes, astNodeSubject, readAstString } from '../utility/ast-compiler';
import {
  findNavItemForRoute,
  findRouteForTarget,
  ROUTE_ATTRIBUTES,
  routeFullPath,
} from '../utility/routing';
import type { PageAccessMode } from './schema';

/** OpenUI page type whose children are composed into the page body. */
export const DASHBOARD_PAGE_AST_TYPE = 'DashboardPage';

/** OpenUI page type without content. */
export const EMPTY_PAGE_AST_TYPE = 'EmptyPage';

/** OpenUI catalog types compiled by the page schematic. */
export const PAGE_AST_TYPES = [DASHBOARD_PAGE_AST_TYPE, EMPTY_PAGE_AST_TYPE] as const;

/** Catalog-style attribute keys understood on page nodes. */
export const PAGE_ATTRIBUTES = { title: '[title]' } as const;

/**
 * Attributes earlier versions read from the page node. They now belong to the
 * `Route` and `NavItem`, and `page` rejects them with a pointer to their owner.
 */
const MOVED_PAGE_ATTRIBUTES = ['[route]', '[access]', '[icon]', '[authGuard]'] as const;

/** Page options an OpenUI page node, its `Route`, and its `NavItem` describe. */
export interface PageAstOptions {
  name: string;
  /** Heading of the page card. */
  title: string;
  routePath: string;
  navigationLabel: string;
  navigationIcon: string | undefined;
  access: PageAccessMode;
}

/**
 * Decode a page node into page options, applying the page schematic defaults.
 * `nameOverride` (the `--name` option) replaces the id-derived name.
 * Values are returned unchecked so the page schematic keeps reporting invalid
 * route paths, icons, and access modes with its existing diagnostics.
 *
 * @throws SchematicsException for unsupported types or attributes, attributes
 * that moved to `Route` or `NavItem`, children on an `EmptyPage`, or a page that
 * no single `Route` targets.
 */
export function pageOptionsFromAst(
  document: OpenUiDocument,
  documentPath: string,
  node: OpenUiElement,
  nameOverride?: string,
): PageAstOptions {
  const subject = astNodeSubject(documentPath, node);
  if (!(PAGE_AST_TYPES as readonly string[]).includes(node.type)) {
    throw new SchematicsException(
      `OpenUI node "${subject}" has type "${node.type}", which is not a supported page. ` +
        `Supported page types: ${PAGE_AST_TYPES.join(', ')}.`,
    );
  }
  const moved = MOVED_PAGE_ATTRIBUTES.filter((key) => key in (node.attrs ?? {}));
  if (moved.length > 0) {
    throw new SchematicsException(
      `OpenUI node "${subject}" sets ${moved.join(', ')}, but a page is content-only. ` +
        `Set the path and access on the Route whose ${ROUTE_ATTRIBUTES.target} is this page ` +
        `(${ROUTE_ATTRIBUTES.path}, ${ROUTE_ATTRIBUTES.access}), the label and icon on the NavItem ` +
        'that presents that route ([label], [icon]), and pass --authGuard for a guard.',
    );
  }
  assertAstAttributes(node, Object.values(PAGE_ATTRIBUTES), subject);
  if (node.type === EMPTY_PAGE_AST_TYPE && (node.children?.length ?? 0) > 0) {
    throw new SchematicsException(
      `OpenUI node "${subject}" is an ${EMPTY_PAGE_AST_TYPE}, which has no content; ` +
        `use a ${DASHBOARD_PAGE_AST_TYPE} to compose children.`,
    );
  }

  const route = findRouteForTarget(document, documentPath, node.id);
  if (!route) {
    throw new SchematicsException(
      `OpenUI node "${subject}" is not the ${ROUTE_ATTRIBUTES.target} of any Route. ` +
        `A page is registered under the route that targets it: add a Route with ${ROUTE_ATTRIBUTES.target} ` +
        `"${node.id}" (a quoted element id) to a Routing model.`,
    );
  }

  const name = nameOverride ?? strings.dasherize(node.id);
  const navigation = findNavItemForRoute(document, documentPath, route.node.id);
  return {
    name,
    title: readAstString(node, PAGE_ATTRIBUTES.title) ?? strings.classify(name),
    routePath: routeFullPath(route, documentPath),
    navigationLabel: navigation?.label ?? strings.classify(name),
    navigationIcon: navigation?.icon,
    access: (readAstString(route.node, ROUTE_ATTRIBUTES.access) ?? 'public') as PageAccessMode,
  };
}
