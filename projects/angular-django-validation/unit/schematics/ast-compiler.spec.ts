import { Tree } from '@angular-devkit/schematics';
import { defaultCatalog } from '@shlomoa/openui-spec';
import type { OpenUiDocument } from '@shlomoa/openui-spec';
import { describe, expect, it } from 'vitest';

import {
  assertAstAttributes,
  createAstNodeResolver,
  readAstBoolean,
  readAstExpression,
  readAstNode,
  readAstNumber,
  readAstString,
  syntheticExpression,
  syntheticTypedValue,
  createSyntheticAstDocument,
  createSyntheticAstNode,
  resolveAstNode,
  toAstNodeId,
  SYNTHETIC_OPENUI_VERSION,
} from 'angular-django2/schematics/utility/ast-compiler';
import { readOpenUiDocument } from 'angular-django2/schematics/utility/openui';

const DOCUMENT_PATH = 'documents/app.openui.json';

const APP_DOCUMENT = {
  version: SYNTHETIC_OPENUI_VERSION,
  id: 'root',
  type: 'html',
  children: [
    {
      id: 'dashboard',
      type: 'DashboardPage',
      attrs: { 'uses.title': '"Overview"' },
      children: [
        {
          id: 'profileCard',
          type: 'SurfaceContainers',
          children: [
            {
              id: 'profileForm',
              type: 'Form',
              attrs: { 'behaves.submit': 'save()' },
              children: [
                { id: 'nameInput', type: 'TextInputs', attrs: { 'uses.label': '"Name"' } },
              ],
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
        attrs: { 'uses.label': '"Name"' },
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
          'uses.label': 'Email',
          'uses.required': syntheticExpression('true'),
          'uses.maxLength': syntheticExpression('120'),
          'uses.hint': null,
          'uses.appearance': undefined,
          'behaves.submit': syntheticExpression('save()'),
        },
      });

      expect(input).toEqual({
        id: 'emailAddress',
        type: 'TextInputs',
        attrs: {
          'uses.label': '"Email"',
          'uses.required': 'true',
          'uses.maxLength': '120',
          'uses.hint': null,
          'behaves.submit': 'save()',
        },
      });
    });

    it('TC-AST-19: writes Boolean and number options as strings, never as JSON values', () => {
      expect(syntheticTypedValue(true)).toEqual(syntheticExpression('true'));
      expect(syntheticTypedValue(false)).toEqual(syntheticExpression('false'));
      expect(syntheticTypedValue(25)).toEqual(syntheticExpression('25'));
      expect(syntheticTypedValue(0.5)).toEqual(syntheticExpression('0.5'));
      expect(syntheticTypedValue(undefined)).toBeUndefined();

      const node = createSyntheticAstNode({
        id: 'age',
        type: 'TextInputs',
        attrs: {
          'uses.required': syntheticTypedValue(true),
          'uses.readOnly': syntheticTypedValue(false),
          'uses.maxLength': syntheticTypedValue(25),
          'uses.min': syntheticTypedValue(0.5),
          'uses.disabled': syntheticTypedValue(undefined),
        },
      });

      expect(node.attrs).toEqual({
        'uses.required': 'true',
        'uses.readOnly': 'false',
        'uses.maxLength': '25',
        'uses.min': '0.5',
      });
      for (const value of Object.values(node.attrs ?? {})) {
        expect(typeof value).toBe('string');
      }
      expect(readAstBoolean(node, 'uses.required', 'doc#age')).toBe(true);
      expect(readAstBoolean(node, 'uses.readOnly', 'doc#age')).toBe(false);
      expect(readAstNumber(node, 'uses.maxLength', 'doc#age')).toBe(25);
      expect(readAstNumber(node, 'uses.min', 'doc#age')).toBe(0.5);
    });

    it('TC-AST-08: builds nested synthetic nodes that resolve like document nodes', () => {
      const form = createSyntheticAstNode({
        id: 'SignupForm',
        type: 'Form',
        children: [createSyntheticAstNode({ id: 'user_name', type: 'TextInputs' })],
      });
      const document = createSyntheticAstDocument([form]);

      expect(document).toEqual({
        version: SYNTHETIC_OPENUI_VERSION,
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
        'Synthetic OpenUI node "report" is invalid:\n/children/0/type: catalog/unknown-type',
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

  describe('document and attribute helpers', () => {
    it('TC-AST-13: resolves any of several accepted types and reads nodes from the tree', () => {
      const tree = Tree.empty();
      tree.create(`/${DOCUMENT_PATH}`, JSON.stringify(APP_DOCUMENT));

      expect(readAstNode(tree, DOCUMENT_PATH, undefined, ['TextInputs', 'Form']).id).toBe(
        'profileForm',
      );
      expect(() => readAstNode(tree, DOCUMENT_PATH, 'dashboard', ['TextInputs', 'Form'])).toThrow(
        'OpenUI node "dashboard" has type "DashboardPage" but this schematic expects "TextInputs" or "Form".',
      );
      expect(() => readAstNode(tree, DOCUMENT_PATH, undefined, ['Table', 'Chart'])).toThrow(
        'OpenUI document contains no "Table" or "Chart" element.',
      );
    });

    it('TC-AST-14: reads the unquoted strings "true", "false" and a JSON number, and rejects other values', () => {
      const node = {
        id: 'age',
        type: 'RangeControl',
        attrs: {
          'uses.min': '0',
          'uses.max': 'many',
          'uses.step': '-1.5e2',
          'uses.required': 'true',
          'uses.disabled': 'false',
          'uses.hint': null,
        },
      };

      expect(readAstNumber(node, 'uses.min', 'doc#age')).toBe(0);
      expect(readAstNumber(node, 'uses.step', 'doc#age')).toBe(-150);
      expect(readAstNumber(node, 'uses.start', 'doc#age')).toBeUndefined();
      expect(readAstNumber(node, 'uses.hint', 'doc#age')).toBeUndefined();
      expect(() => readAstNumber(node, 'uses.max', 'doc#age')).toThrow(
        'OpenUI node "doc#age": attribute "uses.max" must be an unquoted string that is a finite JSON number, ' +
          'not the expression "many", which cannot be evaluated at generation time.',
      );
      expect(readAstBoolean(node, 'uses.required', 'doc#age')).toBe(true);
      expect(readAstBoolean(node, 'uses.disabled', 'doc#age')).toBe(false);
      expect(readAstBoolean(node, 'uses.hint', 'doc#age')).toBeUndefined();
      expect(readAstBoolean(node, 'uses.missing', 'doc#age')).toBeUndefined();
      expect(() =>
        readAstBoolean({ ...node, attrs: { 'uses.required': 'yes' } }, 'uses.required', 'doc#age'),
      ).toThrow(
        'OpenUI node "doc#age": attribute "uses.required" must be the unquoted string "true" or "false", ' +
          'not the expression "yes", which cannot be evaluated at generation time.',
      );
      expect(() => assertAstAttributes(node, ['uses.min', 'uses.max'], 'doc#age')).toThrow(
        'OpenUI node "doc#age" has unsupported attribute(s): uses.step, uses.required, uses.disabled, uses.hint. ' +
          'Supported attributes for "RangeControl": uses.min, uses.max.',
      );
    });

    it('TC-AST-15: reads a quoted literal and rejects an unquoted string as an expression', () => {
      const node = {
        id: 'name',
        type: 'TextInputs',
        attrs: {
          'uses.label': '"Users \\"all\\""',
          'uses.value': '""',
          'uses.hint': null,
          'uses.placeholder': 'Name',
          'uses.items': ['"a"', '"b"'],
        },
      };

      expect(readAstString(node, 'uses.label', 'doc#name')).toBe('Users "all"');
      expect(readAstString(node, 'uses.value', 'doc#name')).toBe('');
      expect(readAstString(node, 'uses.hint', 'doc#name')).toBeUndefined();
      expect(readAstString(node, 'uses.missing', 'doc#name')).toBeUndefined();
      expect(() => readAstString(node, 'uses.placeholder', 'doc#name')).toThrow(
        'OpenUI node "doc#name": attribute "uses.placeholder" has the unquoted value Name, ' +
          'which is an expression, not text. Quote the literal inside the string: "\\"Name\\"".',
      );
      expect(() => readAstString(node, 'uses.items', 'doc#name')).toThrow(
        'attribute "uses.items" must be a quoted string literal, not ["\\"a\\"","\\"b\\""].',
      );
    });

    it('TC-AST-16: reads an unquoted expression and rejects a quoted literal', () => {
      const node = {
        id: 'save',
        type: 'Form',
        attrs: { 'behaves.submit': 'features/contact#ContactService.create', 'uses.title': '"T"' },
      };

      expect(readAstExpression(node, 'behaves.submit', 'doc#save')).toBe(
        'features/contact#ContactService.create',
      );
      expect(readAstExpression(node, 'behaves.validate', 'doc#save')).toBeUndefined();
      expect(() => readAstExpression(node, 'uses.title', 'doc#save')).toThrow(
        'OpenUI node "doc#save": attribute "uses.title" must be an unquoted expression string, not "\\"T\\"".',
      );
    });

    it('TC-AST-17: rejects a quoted literal, another expression and a list where a Boolean or number is required', () => {
      const attrs = {
        'uses.quotedBoolean': '"true"',
        'uses.negation': '!x',
        'uses.cast': '(bool)x',
        'uses.quotedNumber': '"5"',
        'uses.conversion': '(int)x',
        'uses.list': ['true'],
      };
      const node = { id: 'field', type: 'TextInputs', attrs };

      expect(() => readAstBoolean(node, 'uses.quotedBoolean', 'doc#field')).toThrow(
        'attribute "uses.quotedBoolean" has the quoted literal "true", which is text, ' +
          'not the unquoted string "true" or "false".',
      );
      for (const key of ['uses.negation', 'uses.cast', 'uses.conversion', 'uses.quotedNumber']) {
        expect(() => readAstBoolean(node, key, 'doc#field')).toThrow(`attribute "${key}"`);
      }
      expect(() => readAstBoolean(node, 'uses.list', 'doc#field')).toThrow(
        'attribute "uses.list" must be the unquoted string "true" or "false", not ["true"].',
      );

      expect(() => readAstNumber(node, 'uses.conversion', 'doc#field')).toThrow(
        'attribute "uses.conversion" must be an unquoted string that is a finite JSON number, ' +
          'not the expression "(int)x"',
      );
      expect(() => readAstNumber(node, 'uses.quotedNumber', 'doc#field')).toThrow(
        'attribute "uses.quotedNumber" has the quoted literal "5", which is text, ' +
          'not an unquoted string that is a JSON number.',
      );
      expect(() => readAstNumber(node, 'uses.list', 'doc#field')).toThrow(
        'attribute "uses.list" must be an unquoted string that is a JSON number, not ["true"].',
      );
      expect(() => readAstNumber(node, 'uses.negation', 'doc#field')).toThrow(
        'attribute "uses.negation"',
      );
    });

    it.each(['5.', '.5', '05', '+5', '1e', '0x10', ' 5', '5 ', 'NaN', 'Infinity', '1e999', ''])(
      'TC-AST-20: rejects the text %j as a JSON number',
      (text) => {
        const node = { id: 'field', type: 'RangeControl', attrs: { 'uses.min': text } };

        expect(() => readAstNumber(node, 'uses.min', 'doc#field')).toThrow(
          'attribute "uses.min" must be an unquoted string that is a finite JSON number',
        );
      },
    );

    it.each([
      ['0', 0],
      ['-0.5', -0.5],
      ['25', 25],
      ['1E3', 1000],
      ['2.5e-1', 0.25],
    ])('TC-AST-21: reads the text %j as the JSON number %d', (text, expected) => {
      const node = { id: 'field', type: 'RangeControl', attrs: { 'uses.min': text } };

      expect(readAstNumber(node, 'uses.min', 'doc#field')).toBe(expected);
    });

    it('TC-AST-22: rejects a JSON number or Boolean at the grammar stage, alone or in a list', () => {
      for (const value of [true, false, 25, 0.5, [25], [true, '"a"']]) {
        const tree = Tree.empty();
        tree.create(
          `/${DOCUMENT_PATH}`,
          JSON.stringify({
            ...APP_DOCUMENT,
            children: [{ id: 'field', type: 'TextInputs', attrs: { 'uses.required': value } }],
          }),
        );

        expect(() => readOpenUiDocument(tree, DOCUMENT_PATH)).toThrow(
          '/children/0/attrs/uses.required: grammar/invalid-attribute-value',
        );
      }
    });

    it('TC-AST-18: stamps synthetic documents with the installed openui-spec version', () => {
      expect(SYNTHETIC_OPENUI_VERSION).toBe(defaultCatalog().version);
    });
  });
});
