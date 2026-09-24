import { Tree } from '@angular-devkit/schematics';
import type { OpenUiDocument } from '@shlomoa/openui-spec';
import { describe, expect, it } from 'vitest';

import {
  createAstNodeResolver,
  createSyntheticAstDocument,
  createSyntheticAstNode,
  resolveAstNode,
  toAstNodeId,
} from '../../../../projects/angular-django2/schematics/utility/ast-compiler';
import { readOpenUiDocument } from '../../../../projects/angular-django2/schematics/utility/openui';

const DOCUMENT_PATH = 'documents/app.openui.json';

const APP_DOCUMENT = {
  version: '0.2.0',
  id: 'root',
  type: 'html',
  children: [
    {
      id: 'dashboard',
      type: 'DashboardPage',
      attrs: { title: 'Overview' },
      children: [
        {
          id: 'profileCard',
          type: 'SurfaceContainers',
          children: [
            {
              id: 'profileForm',
              type: 'Form',
              attrs: { '(submit)': 'save()' },
              children: [{ id: 'nameInput', type: 'TextInputs', attrs: { label: 'Name' } }],
            },
          ],
        },
      ],
    },
    { id: 'contactForm', type: 'Form' },
  ],
};

function readDocument(): OpenUiDocument {
  const tree = Tree.empty();
  tree.create(`/${DOCUMENT_PATH}`, JSON.stringify(APP_DOCUMENT));
  return readOpenUiDocument(tree, DOCUMENT_PATH);
}

describe('OpenUI AST compiler core', () => {
  describe('AstNodeResolver', () => {
    it('TC-AST-01: walks the document depth-first in pre-order, starting at the root', () => {
      const ids = [...createAstNodeResolver(readDocument()).walk()].map((node) => node.id);

      expect(ids).toEqual([
        'root',
        'dashboard',
        'profileCard',
        'profileForm',
        'nameInput',
        'contactForm',
      ]);
    });

    it('TC-AST-02: finds elements by id and by exact, case-sensitive type', () => {
      const resolver = createAstNodeResolver(readDocument());

      expect(resolver.findById('nameInput')).toEqual({
        id: 'nameInput',
        type: 'TextInputs',
        attrs: { label: 'Name' },
      });
      expect(resolver.findById('root')?.type).toBe('html');
      expect(resolver.findById('missing')).toBeUndefined();
      expect(resolver.findByType('Form')?.id).toBe('profileForm');
      expect(resolver.findByType('form')).toBeUndefined();
    });
  });

  describe('resolveAstNode', () => {
    it('TC-AST-03: resolves by nodeId, by first matching type, or falls back to the root', () => {
      const document = readDocument();

      expect(resolveAstNode(document, 'contactForm', 'Form').id).toBe('contactForm');
      expect(resolveAstNode(document, 'profileCard').type).toBe('SurfaceContainers');
      expect(resolveAstNode(document, undefined, 'Form').id).toBe('profileForm');
      expect(resolveAstNode(document)).toBe(document);
    });

    it('TC-AST-04: rejects missing nodes with the canonical openui-spec wording', () => {
      expect(() => resolveAstNode(readDocument(), 'missingForm')).toThrow(
        'OpenUI node "missingForm" was not found in the document (object not found: missingForm). ' +
          'Pass an existing element id with --nodeId.',
      );
    });

    it('TC-AST-05: rejects a nodeId whose type does not match the schematic', () => {
      expect(() => resolveAstNode(readDocument(), 'nameInput', 'Form')).toThrow(
        'OpenUI node "nameInput" has type "TextInputs" but this schematic expects "Form". ' +
          'Pass the id of a "Form" element with --nodeId.',
      );
    });

    it('TC-AST-06: rejects documents with no element of the expected type', () => {
      expect(() => resolveAstNode(readDocument(), undefined, 'Table')).toThrow(
        'OpenUI document contains no "Table" element. ' +
          'Add one or pass the id of a "Table" element with --nodeId.',
      );
    });
  });

  describe('synthetic AST adapters', () => {
    it('TC-AST-07: translates legacy CLI options into a normalized OpenUI element', () => {
      const input = createSyntheticAstNode({
        id: 'email-address',
        type: 'TextInputs',
        attrs: {
          label: 'Email',
          required: true,
          maxLength: 120,
          hint: null,
          appearance: undefined,
        },
      });

      expect(input).toEqual({
        id: 'emailAddress',
        type: 'TextInputs',
        attrs: { label: 'Email', required: 'true', maxLength: '120', hint: null },
      });
    });

    it('TC-AST-08: builds nested synthetic nodes that resolve like document nodes', () => {
      const form = createSyntheticAstNode({
        id: 'SignupForm',
        type: 'Form',
        children: [createSyntheticAstNode({ id: 'user_name', type: 'TextInputs' })],
      });
      const document = createSyntheticAstDocument([form]);

      expect(document).toEqual({
        version: '0.2.0',
        id: 'root',
        type: 'html',
        children: [
          { id: 'signupForm', type: 'Form', children: [{ id: 'userName', type: 'TextInputs' }] },
        ],
      });
      expect(resolveAstNode(document, 'userName', 'TextInputs')).toEqual({
        id: 'userName',
        type: 'TextInputs',
      });
      expect(resolveAstNode(document, undefined, 'Form')).toBe(form);
    });

    it('TC-AST-09: omits empty attrs and children from synthetic nodes', () => {
      expect(
        createSyntheticAstNode({ id: 'card', type: 'SurfaceContainers', attrs: {}, children: [] }),
      ).toEqual({ id: 'card', type: 'SurfaceContainers' });
    });

    it('TC-AST-10: rejects synthetic nodes outside the canonical catalog', () => {
      expect(() => createSyntheticAstNode({ id: 'report', type: 'report' })).toThrow(
        'Synthetic OpenUI node "report" is invalid:\nunknown OpenUI object type: report',
      );
    });

    it('TC-AST-11: rejects synthetic ids the OpenUI schema does not accept', () => {
      expect(() => createSyntheticAstNode({ id: '1st-form', type: 'Form' })).toThrow(
        'Synthetic OpenUI node "1stForm" is invalid:',
      );
    });

    it('TC-AST-12: normalizes CLI names to OpenUI element ids', () => {
      expect(toAstNodeId('user-profile')).toBe('userProfile');
      expect(toAstNodeId('UserProfile')).toBe('userProfile');
      expect(toAstNodeId('user_profile')).toBe('userProfile');
      expect(toAstNodeId('profile')).toBe('profile');
    });
  });
});
