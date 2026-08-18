import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, type UnitTestTree } from '@angular-devkit/schematics/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import * as path from 'node:path';
import { fieldComponent } from '../../projects/angular-django2/schematics/field-component/index';
import type { FieldComponentSchema } from '../../projects/angular-django2/schematics/field-component/schema';
import { createSchematicContext } from './schematics.helpers';

const collectionPath = path.join(
  __dirname,
  '../../dist/angular-django2/schematics/collection.json',
);
const angularCollectionPath = path.join(
  __dirname,
  '../../node_modules/@schematics/angular/collection.json',
);

describe('field-component schematic', () => {
  let runner: SchematicTestRunner;
  let angularRunner: SchematicTestRunner;

  beforeEach(() => {
    runner = new SchematicTestRunner('angular-django2', collectionPath);
    angularRunner = new SchematicTestRunner('@schematics/angular', angularCollectionPath);
  });

  async function createApplicationTree(): Promise<UnitTestTree> {
    let tree = (await angularRunner.runSchematic(
      'workspace',
      { name: 'demo', version: '22.0.0', newProjectRoot: 'projects' },
      Tree.empty(),
    )) as UnitTestTree;
    tree = (await angularRunner.runSchematic(
      'application',
      { name: 'demo-app', standalone: true, routing: false, style: 'scss', zoneless: true },
      tree,
    )) as UnitTestTree;

    const packageJson = JSON.parse(tree.readContent('/package.json')) as {
      dependencies: Record<string, string>;
    };
    packageJson.dependencies['@angular/material'] = '^22.0.0';
    packageJson.dependencies['@angular/cdk'] = '^22.0.0';
    tree.overwrite('/package.json', JSON.stringify(packageJson, null, 2));

    return tree;
  }

  it('TC-FIELD-01: generates a standalone typed Material text field in the default shared form-helper path', async () => {
    const tree = await createApplicationTree();
    const generated = await runner.runSchematic('field-component', { name: 'display-name' }, tree);
    const componentPath =
      '/projects/demo-app/src/app/shared/ui/form-helpers/display-name/display-name.ts';
    const templatePath =
      '/projects/demo-app/src/app/shared/ui/form-helpers/display-name/display-name.html';

    expect(generated.files).toContain(componentPath);
    expect(generated.readContent(componentPath)).toContain(
      'export type DisplayNameValue = string;',
    );
    expect(generated.readContent(componentPath)).toContain("selector: 'app-display-name'");
    expect(generated.readContent(componentPath)).toContain(
      'changeDetection: ChangeDetectionStrategy.OnPush',
    );
    expect(generated.readContent(componentPath)).toContain('implements ControlValueAccessor');
    expect(generated.readContent(componentPath)).toContain('readonly errorMessage = input<string>');
    expect(generated.readContent(templatePath)).toContain('<mat-label>{{ label() }}</mat-label>');
    expect(generated.readContent(templatePath)).toContain('mat-error');
    expect(generated.readContent(templatePath)).toContain('[attr.aria-invalid]');
    expect(generated.readContent(templatePath)).toContain(
      '[attr.disabled]="controlDisabled() ? \'\' : null"',
    );
  });

  it.each([
    ['text', '<input', '[type]="kind"'],
    ['email', '<input', '[type]="kind"'],
    ['password', '<input', '[type]="kind"'],
    ['textarea', '<textarea', '(input)="updateValue($event)"'],
  ] as const)(
    'TC-FIELD-02: generates the supported %s control kind',
    async (kind, element, expectedBinding) => {
      const tree = await createApplicationTree();
      const generated = await runner.runSchematic(
        'field-component',
        { name: `${kind}-value`, kind, path: 'src/app/fields' },
        tree,
      );
      const componentRoot = `/projects/demo-app/src/app/fields/${kind}-value`;

      expect(generated.readContent(`${componentRoot}/${kind}-value.ts`)).toContain(
        `protected readonly kind = '${kind}';`,
      );
      expect(generated.readContent(`${componentRoot}/${kind}-value.html`)).toContain(element);
      expect(generated.readContent(`${componentRoot}/${kind}-value.html`)).toContain(
        expectedBinding,
      );
    },
  );

  it('TC-FIELD-03: resolves an explicitly selected application project and rejects collision', async () => {
    const tree = await createApplicationTree();
    const workspace = JSON.parse(tree.readContent('/angular.json')) as {
      projects: Record<string, unknown>;
    };
    workspace.projects['secondary-app'] = {
      projectType: 'application',
      root: 'projects/secondary-app',
      sourceRoot: 'projects/secondary-app/src',
    };
    tree.overwrite('/angular.json', JSON.stringify(workspace, null, 2));

    const options = {
      name: 'email-field',
      project: 'secondary-app',
      path: 'src/app/forms',
    };
    const generated = await runner.runSchematic('field-component', options, tree);
    expect(generated.files).toContain(
      '/projects/secondary-app/src/app/forms/email-field/email-field.ts',
    );
    await expect(runner.runSchematic('field-component', options, generated)).rejects.toThrow(
      'already exists',
    );
  });

  it('TC-FIELD-04: rejects invalid inputs and Material prerequisites before creating files', () => {
    const tree = Tree.empty();
    tree.create(
      '/angular.json',
      JSON.stringify({
        projects: {
          app: {
            projectType: 'application',
            root: 'projects/app',
            sourceRoot: 'projects/app/src',
          },
        },
      }),
    );
    tree.create('/package.json', JSON.stringify({ dependencies: {} }));
    const context = createSchematicContext();

    expect(() =>
      fieldComponent({ name: 'DisplayName' } as FieldComponentSchema)(tree, context),
    ).toThrow('kebab-case');
    expect(() =>
      fieldComponent({
        name: 'display-name',
        path: '../outside',
      })(tree, context),
    ).toThrow('within the application source tree');
    expect(() =>
      fieldComponent({
        name: 'display-name',
        path: 'src/app/forms/../../../../outside',
      })(tree, context),
    ).toThrow('within the application source tree');
    expect(() =>
      fieldComponent({
        name: 'display-name',
        kind: 'select' as FieldComponentSchema['kind'],
      })(tree, context),
    ).toThrow('Unsupported field control kind');
    expect(() => fieldComponent({ name: 'display-name' })(tree, context)).toThrow(
      'Run ng add @angular/material first',
    );
    expect(
      tree.exists('/projects/app/src/app/shared/ui/form-helpers/display-name/display-name.ts'),
    ).toBe(false);
  });
});
