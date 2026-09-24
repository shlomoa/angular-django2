import { Tree } from '@angular-devkit/schematics';
import type { UnitTestTree } from '@angular-devkit/schematics/testing';
import { describe, expect, it } from 'vitest';
import type { FormFieldSchema } from '../../../../projects/angular-django2/schematics/form-field/schema';

import { formField } from '../../../../projects/angular-django2/schematics/form-field/index';
import { createSchematicContext } from './schematics.helpers';

function createApplicationTree(projects = { demo: { root: '', sourceRoot: 'src' } }): UnitTestTree {
  const tree = Tree.empty() as UnitTestTree;
  tree.create('/angular.json', JSON.stringify({ version: 1, projects }));
  tree.create(
    '/package.json',
    JSON.stringify({
      dependencies: {
        '@angular/cdk': '^22.0.0',
        '@angular/forms': '^22.0.0',
        '@angular/material': '^22.0.0',
      },
    }),
  );
  return tree;
}

function readContent(tree: Tree, path: string): string {
  return tree.read(path)!.toString();
}

describe('form-field schematic', () => {
  it('TC-FORM-FIELD-01: creates a standalone OnPush typed CVA Material form field', () => {
    const tree = createApplicationTree();
    const generated = formField({ name: 'email' })(tree) as UnitTestTree;
    const componentPath = '/src/app/shared/form-helpers/email-field/email-field.ts';
    const component = readContent(generated, componentPath);
    const template = readContent(
      generated,
      '/src/app/shared/form-helpers/email-field/email-field.html',
    );

    expect(component).toContain('standalone: true');
    expect(component).toContain('ChangeDetectionStrategy.OnPush');
    expect(component).toContain('implements ControlValueAccessor');
    expect(component).toContain('writeValue(value: FormFieldValue | null)');
    expect(component).toContain('registerOnChange(onChange: (value: FormFieldValue) => void)');
    expect(component).toContain('readonly serverErrors = input<readonly string[]>');
    expect(component).toContain('MatFormFieldModule');
    expect(template).toContain('<mat-form-field');
    expect(template).toContain('<mat-label>{{ label() }}</mat-label>');
    expect(template).toContain('[attr.aria-invalid]="errorState()"');
    expect(template).toContain(
      '<mat-error [id]="fieldId() + \'-error\'">{{ errorMessage() }}</mat-error>',
    );
  });

  it.each(['text', 'email', 'password', 'number', 'textarea'] as const)(
    'TC-FORM-FIELD-02: supports the %s control kind',
    (controlType) => {
      const tree = createApplicationTree();
      const generated = formField({ name: `${controlType}-value`, controlType })(
        tree,
      ) as UnitTestTree;
      const component = readContent(
        generated,
        `/src/app/shared/form-helpers/${controlType}-value-field/${controlType}-value-field.ts`,
      );

      expect(component).toContain(`input<FormFieldControlType>('${controlType}')`);
      if (controlType === 'number') {
        expect(component).toContain('export type FormFieldValue = string | number | null;');
        expect(component).toContain("input.value === ''");
        expect(component).toContain('Number.isNaN(value) ? null : value');
      } else {
        expect(component).toContain('export type FormFieldValue = string;');
      }
    },
  );

  it.each([
    ['fill', 'fixed'],
    ['outline', 'dynamic'],
  ] as const)(
    'TC-FORM-FIELD-03: supports %s appearance and %s subscript sizing',
    (appearance, subscriptSizing) => {
      const tree = createApplicationTree();
      const generated = formField({ name: 'title', appearance, subscriptSizing })(
        tree,
      ) as UnitTestTree;
      const component = readContent(
        generated,
        '/src/app/shared/form-helpers/title-field/title-field.ts',
      );
      const template = readContent(
        generated,
        '/src/app/shared/form-helpers/title-field/title-field.html',
      );

      expect(component).toContain(`input<FormFieldAppearance>('${appearance}')`);
      expect(component).toContain(`input<FormFieldSubscriptSizing>('${subscriptSizing}')`);
      expect(template).toContain(
        '[appearance]="appearance()" [subscriptSizing]="subscriptSizing()"',
      );
    },
  );

  it('TC-FORM-FIELD-04: uses the selected project and permits a source-root-contained path', () => {
    const tree = createApplicationTree({
      admin: { root: 'projects/admin', sourceRoot: 'projects/admin/src' },
      storefront: { root: 'projects/storefront', sourceRoot: 'projects/storefront/src' },
    });
    const generated = formField({
      name: 'quantity',
      project: 'storefront',
      path: 'src/app/forms',
    })(tree) as UnitTestTree;

    expect(
      generated.exists('/projects/storefront/src/app/forms/quantity-field/quantity-field.ts'),
    ).toBe(true);
  });

  it('TC-FORM-FIELD-05: rejects invalid options and prerequisites before creating output', () => {
    const tree = createApplicationTree();
    const invalidPath = formField({ name: 'email', path: '../outside' });
    const invalidControl = formField({ name: 'email', controlType: 'date' as never });
    const missingDependencies = createApplicationTree();
    missingDependencies.overwrite('/package.json', JSON.stringify({ dependencies: {} }));

    expect(() => formField({ name: 'Email' })(tree)).toThrow('kebab-case');
    expect(() => invalidPath(tree)).toThrow('within the application source tree');
    expect(() => invalidControl(tree)).toThrow('Unsupported form-field control type');
    expect(() => formField({ name: 'email', unsupported: true } as never)).toThrow(
      'Unsupported form-field option',
    );
    expect(() => formField({ name: 'email' })(missingDependencies)).toThrow(
      'requires installed prerequisites',
    );
    expect(tree.exists('/src/app/shared/form-helpers/email-field/email-field.ts')).toBe(false);
  });

  it('TC-FORM-FIELD-06: rejects reruns before modifying existing output', () => {
    const tree = createApplicationTree();
    const first = formField({ name: 'email' })(tree) as UnitTestTree;
    const componentPath = '/src/app/shared/form-helpers/email-field/email-field.ts';
    first.overwrite(componentPath, '// maintained field');

    expect(() => formField({ name: 'email' })(first)).toThrow('already exists');
    expect(readContent(first, componentPath)).toBe('// maintained field');
  });
});

describe('form-field schematic: OpenUI control nodes', () => {
  const DOCUMENT_PATH = 'documents/controls.openui.json';
  const HELPERS = '/src/app/shared/form-helpers';

  const CONTROLS = [
    {
      id: 'contactForm',
      type: 'Form',
      children: [
        {
          id: 'contactEmail',
          type: 'TextInputs',
          attrs: {
            '[name]': 'work_email',
            '[type]': 'email',
            '[label]': 'Work email',
            '[appearance]': 'outline',
            '[subscriptSizing]': 'dynamic',
          },
        },
        { id: 'seats', type: 'RangeControl', attrs: { '[label]': 'Seats' } },
        { id: 'accepted', type: 'ChoiceControls' },
      ],
    },
  ];

  function createDocumentTree(children: unknown[] = CONTROLS): UnitTestTree {
    const tree = createApplicationTree();
    tree.create(
      `/${DOCUMENT_PATH}`,
      JSON.stringify({ version: '0.2.0', id: 'root', type: 'html', children }),
    );
    return tree;
  }

  function compile(tree: Tree, options: Partial<FormFieldSchema>): UnitTestTree {
    return formField({ document: DOCUMENT_PATH, ...options })(
      tree,
      createSchematicContext(),
    ) as UnitTestTree;
  }

  function outputs(tree: Tree, name: string): string[] {
    return ['ts', 'html', 'scss'].map((extension) =>
      readContent(tree, `${HELPERS}/${name}-field/${name}-field.${extension}`),
    );
  }

  it('TC-FORM-FIELD-OPENUI-01: compiles a control node to output identical to the legacy flags', () => {
    const fromFlags = formField({
      name: 'work-email',
      controlType: 'email',
      appearance: 'outline',
      subscriptSizing: 'dynamic',
    })(createApplicationTree()) as UnitTestTree;
    // The name defaults to the dasherized [name] attribute, matching reactive-form composition.
    const fromDocument = compile(createDocumentTree(), { nodeId: 'contactEmail' });

    expect(outputs(fromDocument, 'work-email')).toEqual(outputs(fromFlags, 'work-email'));
  });

  it('TC-FORM-FIELD-OPENUI-02: compiles RangeControl as number, honours --name, and defaults to the first control', () => {
    const range = compile(createDocumentTree(), { nodeId: 'seats', name: 'seat-count' });
    expect(outputs(range, 'seat-count')).toEqual(
      outputs(
        formField({ name: 'seat-count', controlType: 'number' })(
          createApplicationTree(),
        ) as UnitTestTree,
        'seat-count',
      ),
    );

    expect(
      compile(createDocumentTree(), {}).exists(`${HELPERS}/work-email-field/work-email-field.ts`),
    ).toBe(true);
  });

  it('TC-FORM-FIELD-OPENUI-03: rejects conflicting flags, unsupported nodes, and invalid attributes', () => {
    expect(() => compile(createDocumentTree(), { controlType: 'text' })).toThrow(
      '--document cannot be combined with --controlType;',
    );
    expect(() => formField({ name: 'email', nodeId: 'contactEmail' })).toThrow(
      '--nodeId requires --document.',
    );
    expect(() => compile(createDocumentTree(), { nodeId: 'accepted' })).toThrow(
      'OpenUI node "accepted" has type "ChoiceControls" but this schematic expects "TextInputs" or "RangeControl".',
    );
    expect(() =>
      compile(
        createDocumentTree([
          { id: 'title', type: 'TextInputs', attrs: { '[appearance]': 'outlined' } },
        ]),
        {},
      ),
    ).toThrow('Unsupported form-field appearance "outlined".');
    expect(() =>
      compile(
        createDocumentTree([{ id: 'title', type: 'TextInputs', attrs: { color: 'red' } }]),
        {},
      ),
    ).toThrow(
      'OpenUI node "documents/controls.openui.json#title" has unsupported attribute(s): color.',
    );
  });
});
