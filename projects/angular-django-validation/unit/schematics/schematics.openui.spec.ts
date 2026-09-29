import { Tree } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import { SYNTHETIC_OPENUI_VERSION } from 'angular-django2/schematics/utility/ast-compiler';
import { readOpenUiDocument } from 'angular-django2/schematics/utility/openui';
import { createOpenUiDocument } from './schematics.helpers';

const VALID_DOCUMENT = createOpenUiDocument(
  { id: 'report', type: 'Report' },
  { id: 'form', type: 'Form' },
  { id: 'chart', type: 'Chart' },
  { id: 'list', type: 'List' },
);

describe('OpenUI document utility', () => {
  it('TC-OPENUI-01: parses and validates a catalog-backed OpenUI document from the schematic tree', () => {
    const tree = Tree.empty();
    tree.create('/documents/dashboard.json', JSON.stringify(VALID_DOCUMENT));

    expect(readOpenUiDocument(tree, 'documents/dashboard.json')).toEqual(VALID_DOCUMENT);
  });

  it('TC-OPENUI-02: reports canonical validation diagnostics before a caller can mutate the tree', () => {
    const tree = Tree.empty();
    tree.create(
      '/documents/invalid.json',
      JSON.stringify({
        ...VALID_DOCUMENT,
        children: [
          { id: 'duplicate', type: 'List' },
          { id: 'duplicate', type: 'Chart' },
        ],
      }),
    );

    expect(() => readOpenUiDocument(tree, 'documents/invalid.json')).toThrow(
      'OpenUI document "documents/invalid.json" is invalid:\n' +
        '/children/1/id: document/duplicate-id: duplicate object id: duplicate',
    );
  });

  it('TC-OPENUI-03: reports malformed and missing documents with their workspace path', () => {
    const tree = Tree.empty();
    tree.create('/documents/malformed.json', '{');

    expect(() => readOpenUiDocument(tree, 'documents/malformed.json')).toThrow(
      'OpenUI document "documents/malformed.json" could not be parsed:',
    );
    expect(() => readOpenUiDocument(tree, 'documents/missing.json')).toThrow(
      'OpenUI document "documents/missing.json" was not found in the workspace.',
    );
  });

  it('TC-OPENUI-04: rejects object types outside the exact, case-sensitive canonical catalog', () => {
    const tree = Tree.empty();
    tree.create(
      '/documents/unknown-type.json',
      JSON.stringify({
        ...VALID_DOCUMENT,
        children: [{ id: 'report', type: 'report' }],
      }),
    );

    expect(() => readOpenUiDocument(tree, 'documents/unknown-type.json')).toThrow(
      'OpenUI document "documents/unknown-type.json" is invalid:\n' +
        '/children/0/type: catalog/unknown-type: unknown OpenUI object type: report',
    );
  });

  describe('typed-attribute language (OpenUI 0.6.0 and later)', () => {
    /** A one-element document; `extra` adds sibling elements. */
    function documentWith(
      attrs: Record<string, unknown>,
      type = 'NavItem',
      extra: object[] = [],
      version: string = SYNTHETIC_OPENUI_VERSION,
    ): string {
      return JSON.stringify({
        version,
        id: 'root',
        type: 'html',
        children: [{ id: 'subject', type, attrs }, ...extra],
      });
    }

    function readFrom(content: string): void {
      const tree = Tree.empty();
      tree.create('/documents/typed.json', content);
      readOpenUiDocument(tree, 'documents/typed.json');
    }

    it.each([
      [
        'TC-OPENUI-05: a document written for another spec version',
        documentWith({}, 'SurfaceContainers', [], '0.4.0'),
        '/version: document/unsupported-version:',
      ],
      [
        'TC-OPENUI-06: the pre-0.6.0 bracket attribute keys',
        documentWith({ '[title]': 'Orders' }, 'SurfaceContainers'),
        '/children/0/attrs/[title]: grammar/invalid-key: invalid attribute key [title]',
      ],
      [
        'TC-OPENUI-07: a boolean written as a quoted string',
        documentWith({ 'uses.disabled': '"true"' }),
        '/children/0/attrs/uses.disabled: contract/wrong-value-type:',
      ],
      [
        'TC-OPENUI-08: a number where a string is declared',
        documentWith({ 'uses.label': 5 }),
        '/children/0/attrs/uses.label: contract/wrong-value-type:',
      ],
      [
        'TC-OPENUI-09: a reference to an element that does not exist',
        documentWith({ 'uses.route': '"missingRoute"' }),
        '/children/0/attrs/uses.route: contract/unresolved-reference: uses.route names no element: missingRoute',
      ],
      [
        'TC-OPENUI-10: a reference to an element of the wrong type',
        documentWith({ 'uses.route': '"other"' }, 'NavItem', [{ id: 'other', type: 'Form' }]),
        '/children/0/attrs/uses.route: contract/wrong-reference-type:',
      ],
      [
        'TC-OPENUI-11: an enum value outside its list',
        documentWith({ 'uses.dir': '"sideways"' }, 'html'),
        '/children/0/attrs/uses.dir: contract/wrong-value-type:',
      ],
    ])('%s', (_name, content, diagnostic) => {
      expect(() => readFrom(content)).toThrow(diagnostic);
    });

    it('TC-OPENUI-12: accepts binding expressions for typed attributes and literals of the declared types', () => {
      // The validator never flags an unquoted string: it is a binding or target-language expression.
      expect(() =>
        readFrom(
          documentWith(
            { 'uses.label': 'orderLabel', 'uses.disabled': '!ready', 'uses.route': '"other"' },
            'NavItem',
            [{ id: 'other', type: 'Route' }],
          ),
        ),
      ).not.toThrow();
      expect(() =>
        readFrom(documentWith({ 'uses.label': '"Orders"', 'uses.disabled': false })),
      ).not.toThrow();
    });
  });
});
