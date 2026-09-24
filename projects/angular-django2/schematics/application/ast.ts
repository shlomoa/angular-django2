/**
 * OpenUI application vocabulary (migration plan, steps 4.2 and 4.3), shared by
 * `application`, `material-app`, and `workspace-setup`.
 *
 * | OpenUI                                   | Schematic option                        |
 * | :--------------------------------------- | :-------------------------------------- |
 * | `Application` id                         | `name` (dasherized)                     |
 * | `Application[title]`                     | toolbar title (`material-app`)          |
 * | `Routing` child of `Application`         | `routing` (`true` when present)         |
 * | `Presentation[theme]`                    | `theme` (`material-app`)                |
 * | `Presentation[typography]`               | `typography` (`"true"` / `"false"`)     |
 * | `Presentation[animations]`               | `animations` (`"true"` / `"false"`)     |
 * | `IndexHtml[lang]`, `[dir]`, `[title]`    | `<html lang dir>`, `<title>`            |
 * | `Favicon[href]`                          | icon file copied to the app favicon     |
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

/** Catalog-style attribute keys understood on `Application` nodes. */
export const APPLICATION_ATTRIBUTES = { title: '[title]' } as const;

/** Child types an `Application` node may contain. */
export const APPLICATION_CHILD_AST_TYPES = [
  'Routing',
  'Navigation',
  'ToolBars',
  'Presentation',
  'IndexHtml',
  'Favicon',
] as const;

/** Catalog-style attribute keys understood on `Presentation` nodes. */
export const PRESENTATION_ATTRIBUTES = {
  theme: '[theme]',
  typography: '[typography]',
  animations: '[animations]',
} as const;

/** Catalog-style attribute keys understood on `IndexHtml` nodes. */
export const INDEX_HTML_ATTRIBUTES = { lang: '[lang]', dir: '[dir]', title: '[title]' } as const;

/** Catalog-style attribute keys understood on `Favicon` nodes. */
export const FAVICON_ATTRIBUTES = { href: '[href]' } as const;

/** Application options an OpenUI `Application` node describes. */
export interface ApplicationAstOptions {
  node: OpenUiElement;
  name: string;
  title: string | undefined;
  routing: boolean;
}

/** Presentation tokens an OpenUI `Presentation` node describes. */
export interface PresentationAstOptions {
  theme: string | undefined;
  typography: boolean | undefined;
  animations: boolean | undefined;
}

/** Host document settings an OpenUI `IndexHtml` node describes. */
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
  assertAstAttributes(node, Object.values(APPLICATION_ATTRIBUTES), subject);

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
    title: readAstString(node, APPLICATION_ATTRIBUTES.title),
    routing: directChild(node, 'Routing', documentPath) !== undefined,
  };
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
 * Decode the first `IndexHtml` node of the document, if any.
 *
 * @throws SchematicsException for unsupported attributes or a `[dir]` other than `ltr`, `rtl`, `auto`.
 */
export function indexHtmlFromAst(
  document: OpenUiDocument,
  documentPath: string,
): IndexHtmlAstOptions | undefined {
  const node = createAstNodeResolver(document).findByType('IndexHtml');
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
 * The `[href]` of the first `Favicon` node of the document, if any.
 *
 * @throws SchematicsException for unsupported attributes or a missing `[href]`.
 */
export function faviconHrefFromAst(
  document: OpenUiDocument,
  documentPath: string,
): string | undefined {
  const node = createAstNodeResolver(document).findByType('Favicon');
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
