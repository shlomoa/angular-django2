/**
 * OpenUI page vocabulary (migration plan, step 4.1), shared by `page` and by
 * `material-app`, which builds its navigation links from the same page nodes.
 *
 * A page node carries its own routing and navigation metadata as catalog-style
 * input attributes:
 *
 * | OpenUI page attribute | page option         | Default                   |
 * | :-------------------- | :------------------ | :------------------------ |
 * | id                    | `name` (dasherized) | —                         |
 * | `[title]`             | `navigationLabel`   | classified page name      |
 * | `[route]`             | `routePath`         | page name                 |
 * | `[icon]`              | `navigationIcon`    | none                      |
 * | `[access]`            | `access`            | `public`                  |
 * | `[authGuard]`         | `authGuard`         | `authGuard`               |
 *
 * `DashboardPage` children are composed into the page body (plan step 3.3);
 * `EmptyPage` has no content, so it takes no children and, having no
 * navigation, contributes no navigation link.
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
  readAstString,
} from '../utility/ast-compiler';
import type { PageAccessMode } from './schema';

/** OpenUI page type whose children are composed into the page body. */
export const DASHBOARD_PAGE_AST_TYPE = 'DashboardPage';

/** OpenUI page type without content or navigation. */
export const EMPTY_PAGE_AST_TYPE = 'EmptyPage';

/** OpenUI catalog types compiled by the page schematic. */
export const PAGE_AST_TYPES = [DASHBOARD_PAGE_AST_TYPE, EMPTY_PAGE_AST_TYPE] as const;

/** Lowercase URL segments separated by hyphens or slashes. */
export const ROUTE_PATH_PATTERN = /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/;

/** Lowercase Angular Material icon ligature name. */
export const NAVIGATION_ICON_PATTERN = /^[a-z0-9_]+$/;

/** Catalog-style attribute keys understood on page nodes. */
export const PAGE_ATTRIBUTES = {
  title: '[title]',
  route: '[route]',
  icon: '[icon]',
  access: '[access]',
  authGuard: '[authGuard]',
} as const;

/** Page options an OpenUI page node describes. */
export interface PageAstOptions {
  name: string;
  routePath: string;
  navigationLabel: string;
  navigationIcon: string | undefined;
  access: PageAccessMode;
  authGuard: string | undefined;
}

/** A navigation link derived from a page node. */
export interface PageNavigationLink {
  route: string;
  label: string;
  icon: string | undefined;
}

/**
 * Decode a page node into page options, applying the page schematic defaults.
 * `nameOverride` (the `--name` option) replaces the id-derived name.
 * Values are returned unchecked so the page schematic keeps reporting invalid
 * route paths, icons, and guards with its existing diagnostics.
 *
 * @throws SchematicsException for unsupported types or attributes, or children on an `EmptyPage`.
 */
export function pageOptionsFromAst(
  node: OpenUiElement,
  subject: string,
  nameOverride?: string,
): PageAstOptions {
  if (!(PAGE_AST_TYPES as readonly string[]).includes(node.type)) {
    throw new SchematicsException(
      `OpenUI node "${subject}" has type "${node.type}", which is not a supported page. ` +
        `Supported page types: ${PAGE_AST_TYPES.join(', ')}.`,
    );
  }
  assertAstAttributes(node, Object.values(PAGE_ATTRIBUTES), subject);
  if (node.type === EMPTY_PAGE_AST_TYPE && (node.children?.length ?? 0) > 0) {
    throw new SchematicsException(
      `OpenUI node "${subject}" is an ${EMPTY_PAGE_AST_TYPE}, which has no content; ` +
        `use a ${DASHBOARD_PAGE_AST_TYPE} to compose children.`,
    );
  }

  const name = nameOverride ?? strings.dasherize(node.id);
  return {
    name,
    routePath: readAstString(node, PAGE_ATTRIBUTES.route) ?? name,
    navigationLabel: readAstString(node, PAGE_ATTRIBUTES.title) ?? strings.classify(name),
    navigationIcon: readAstString(node, PAGE_ATTRIBUTES.icon),
    access: (readAstString(node, PAGE_ATTRIBUTES.access) ?? 'public') as PageAccessMode,
    authGuard: readAstString(node, PAGE_ATTRIBUTES.authGuard),
  };
}

/**
 * Navigation links for every `DashboardPage` in the document, in document
 * order. `EmptyPage` nodes have no navigation and are skipped.
 */
export function pageNavigationLinks(
  document: OpenUiDocument,
  documentPath: string,
): PageNavigationLink[] {
  return [...createAstNodeResolver(document).walk()]
    .filter((node) => node.type === DASHBOARD_PAGE_AST_TYPE)
    .map((node) => {
      const subject = astNodeSubject(documentPath, node);
      const options = pageOptionsFromAst(node, subject);
      if (!ROUTE_PATH_PATTERN.test(options.routePath)) {
        throw new SchematicsException(
          `OpenUI node "${subject}": ${PAGE_ATTRIBUTES.route}="${options.routePath}" must contain ` +
            'lowercase URL segments separated by hyphens or slashes.',
        );
      }
      if (
        options.navigationIcon !== undefined &&
        !NAVIGATION_ICON_PATTERN.test(options.navigationIcon)
      ) {
        throw new SchematicsException(
          `OpenUI node "${subject}": ${PAGE_ATTRIBUTES.icon}="${options.navigationIcon}" must be a ` +
            'lowercase Angular Material icon identifier.',
        );
      }
      return {
        route: options.routePath,
        label: options.navigationLabel,
        icon: options.navigationIcon,
      };
    });
}
