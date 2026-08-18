import { Tree } from '@angular-devkit/schematics';
import type { UnitTestTree } from '@angular-devkit/schematics/testing';
import { describe, expect, it } from 'vitest';

import { formField } from '../../projects/angular-django2/schematics/form-field/index';

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
