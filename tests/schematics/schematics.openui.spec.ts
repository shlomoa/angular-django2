import { Tree } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import { readOpenUiDocument } from '../../projects/angular-django2/schematics/utility/openui';

const VALID_DOCUMENT = {
  version: '0.1.0',
  id: 'root',
  type: 'html',
  children: [
    { id: 'report', type: 'Report' },
    { id: 'form', type: 'Form' },
    { id: 'chart', type: 'Chart' },
    { id: 'list', type: 'List' },
  ],
};

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
      'OpenUI document "documents/invalid.json" is invalid:\nduplicate object id: duplicate',
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
});
