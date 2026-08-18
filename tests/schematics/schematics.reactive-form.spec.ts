import { readFileSync } from 'node:fs';
import { Tree } from '@angular-devkit/schematics';
import type { UnitTestTree } from '@angular-devkit/schematics/testing';
import { describe, expect, it, vi } from 'vitest';

import { fieldComponent } from '../../projects/angular-django2/schematics/field-component/index';
import { reactiveForm } from '../../projects/angular-django2/schematics/reactive-form/index';
import {
  REACTIVE_FORM_CONTROL_KINDS,
  REACTIVE_FORM_VALIDATOR_KINDS,
} from '../../projects/angular-django2/schematics/reactive-form/schema';
import type { ReactiveFormSchema } from '../../projects/angular-django2/schematics/reactive-form/schema';
import { schematicSchemaPath } from './schematics.helpers';

const COMPONENT_PATH = '/src/app/features/contact-form/contact-form.ts';
const TEMPLATE_PATH = '/src/app/features/contact-form/contact-form.html';
const STYLESHEET_PATH = '/src/app/features/contact-form/contact-form.scss';

const DEFINITION = {
  title: 'Create contact',
  endpoint: '/api/contacts/',
  submitLabel: 'Create contact',
  fields: [
    {
      name: 'first_name',
      label: 'First name',
      control: 'text',
      required: true,
      hint: 'Given name on the record',
      autocomplete: 'given-name',
    },
    { name: 'email', label: 'Email', control: 'email', required: true },
    { name: 'seats', label: 'Seats', control: 'number' },
    { name: 'notes', label: 'Notes', control: 'textarea' },
  ],
};

function createApplicationTree(
  definition: unknown = DEFINITION,
  projects: Record<string, { root: string; sourceRoot: string }> = {
    demo: { root: '', sourceRoot: 'src' },
  },
): UnitTestTree {
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
  tree.create(
    '/contact-form.json',
    typeof definition === 'string' ? definition : JSON.stringify(definition),
  );

  return tree;
}

function createContext() {
  return { logger: { warn: vi.fn() } } as never;
}

function generate(tree: Tree, options: Partial<ReactiveFormSchema> = {}): UnitTestTree {
  return reactiveForm({
    name: 'contact',
    definition: 'contact-form.json',
    ...options,
  } as ReactiveFormSchema)(tree, createContext()) as UnitTestTree;
}

function readContent(tree: Tree, path: string): string {
  return tree.read(path)!.toString();
}

function createCanonicalPrimitive(tree: Tree, name: string): void {
  tree.create(
    `/src/app/shared/form-helpers/${name}-field/${name}-field.ts`,
    'export {}; // Formatting and implementation details are irrelevant to schematic metadata.',
  );
}

describe('reactive-form schematic', () => {
  it('TC-REACTIVE-FORM-01: generates typed standalone OnPush reactive-form code with submit state', () => {
    const generated = generate(createApplicationTree());
    const component = readContent(generated, COMPONENT_PATH);

    expect(generated.exists(STYLESHEET_PATH)).toBe(true);
    expect(component).toContain("selector: 'app-contact-form'");
    expect(component).toContain('standalone: true');
    expect(component).toContain(
      'imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],',
    );
    expect(component).toContain('ChangeDetectionStrategy.OnPush');
    expect(component).toContain('export interface ContactFormPayload {');
    expect(component).toContain('first_name: string | null;');
    expect(component).toContain('seats: number | null;');
    expect(component).toContain("readonly endpoint = '/api/contacts/';");
    expect(component).toContain('private readonly formBuilder = inject(FormBuilder);');
    expect(component).toContain('readonly form = this.formBuilder.group({');
    expect(component).toContain(
      'first_name: this.formBuilder.control<string | null>(null, [Validators.required]),',
    );
    expect(component).toContain(
      'email: this.formBuilder.control<string | null>(null, [Validators.required, Validators.email]),',
    );
    expect(component).toContain('notes: this.formBuilder.control<string | null>(null),');
    expect(component).toContain("readonly status = signal<ContactFormStatus>('idle');");
    expect(component).toContain(
      "readonly submitting = computed(() => this.status() === 'submitting');",
    );
    expect(component).toContain('readonly submitted = output<ContactFormPayload>();');
    expect(component).toContain('this.submitted.emit(this.form.getRawValue());');
  });

  it('TC-REACTIVE-FORM-02: maps DRF errors onto controls, retains values, and clears only on success', () => {
    const component = readContent(generate(createApplicationTree()), COMPONENT_PATH);

    expect(component).toContain('failSubmit(errors: ContactFormServerErrors): void {');
    expect(component).toContain(
      'control.setErrors({ ...(control.errors ?? {}), server: messages[0] });',
    );
    expect(component).toContain('formErrors.push(...messages);');
    expect(component).toContain("this.status.set('error');");
    // Values are only cleared by an accepted create, never by a failed submit.
    expect(component).toContain('completeSubmit(): void {');
    expect(component).toContain('this.form.reset();');
    expect(component.slice(component.indexOf('failSubmit(errors:'))).not.toContain(
      'this.form.reset()',
    );
  });

  it('TC-REACTIVE-FORM-03: renders accessible Angular Material markup for inline fields', () => {
    const template = readContent(generate(createApplicationTree()), TEMPLATE_PATH);

    expect(template).toContain('aria-labelledby="contact-form-title"');
    expect(template).toContain('[attr.aria-busy]="submitting()"');
    expect(template).toContain('<h2 class="contact-form__title" id="contact-form-title">');
    expect(template).toContain('role="alert"');
    expect(template).toContain('<mat-label>First name</mat-label>');
    expect(template).toContain('formControlName="first_name"');
    expect(template).toContain('autocomplete="given-name"');
    expect(template).toContain('[attr.aria-invalid]="hasError(\'first_name\')"');
    expect(template).toContain(
      "[attr.aria-errormessage]=\"hasError('first_name') ? 'contact-form-first_name-error' : null\"",
    );
    expect(template).toContain(
      '<mat-error id="contact-form-first_name-error">{{ errorMessage(\'first_name\') }}</mat-error>',
    );
    expect(template).toContain('<textarea');
    expect(template).toContain('type="number"');
    expect(template).toContain('<button mat-flat-button type="submit" [disabled]="submitting()">');
    expect(template).toContain('role="status"');
  });

  it('TC-REACTIVE-FORM-04: composes the canonical form-field contract and falls back to inline markup', () => {
    const tree = createApplicationTree();
    createCanonicalPrimitive(tree, 'email');
    const generated = generate(tree);
    const component = readContent(generated, COMPONENT_PATH);
    const template = readContent(generated, TEMPLATE_PATH);

    expect(component).toContain(
      "import { EmailFieldComponent } from '../../shared/form-helpers/email-field/email-field';",
    );
    expect(component).toContain('    MatButtonModule,\n    EmailFieldComponent,\n  ],');
    expect(component).toContain('serverErrors(field: string): readonly string[] {');
    expect(template).toContain('<app-email-field');
    expect(template).toContain('formControlName="email"');
    expect(template).toContain('fieldId="contact-form-email"');
    expect(template).toContain('controlType="email"');
    expect(template).toContain('[required]="true"');
    expect(template).toContain('[serverErrors]="serverErrors(\'email\')"');
    // Fields without a primitive keep the inline Material control.
    expect(template).toContain('formControlName="first_name"');
  });

  it('TC-REACTIVE-FORM-05: prefers the canonical form-field path over a noncanonical file', () => {
    const tree = createApplicationTree();
    createCanonicalPrimitive(tree, 'email');
    tree.create(
      '/src/app/shared/form-helpers/email/email.ts',
      'export {}; // This legacy-shaped path must not compete with the canonical descriptor.',
    );

    const generated = generate(tree);
    const component = readContent(generated, COMPONENT_PATH);
    const template = readContent(generated, TEMPLATE_PATH);

    expect(component).toContain(
      "import { EmailFieldComponent } from '../../shared/form-helpers/email-field/email-field';",
    );
    expect(template).toContain('<app-email-field');
  });

  it('TC-REACTIVE-FORM-05A: composes a field-component façade through its shared canonical output', () => {
    const tree = createApplicationTree();
    fieldComponent({ name: 'email', kind: 'email' })(tree, createContext());

    const generated = generate(tree);
    const template = readContent(generated, TEMPLATE_PATH);

    expect(template).toContain('<app-email-field');
    expect(template).toContain('controlType="email"');
  });

  it('TC-REACTIVE-FORM-05B: resolves number controls only through the canonical form-field descriptor', () => {
    const tree = createApplicationTree();
    createCanonicalPrimitive(tree, 'seats');

    const generated = generate(tree);
    const template = readContent(generated, TEMPLATE_PATH);

    expect(template).toContain('<app-seats-field');
    expect(template).toContain('controlType="number"');
  });

  it('TC-REACTIVE-FORM-05C: ignores primitive source formatting during resolution', () => {
    const tree = createApplicationTree();
    createCanonicalPrimitive(tree, 'email');
    tree.overwrite(
      '/src/app/shared/form-helpers/email-field/email-field.ts',
      '\n\n  export     {    };\n',
    );

    const generated = generate(tree);
    expect(readContent(generated, TEMPLATE_PATH)).toContain('<app-email-field');
  });

  it('TC-REACTIVE-FORM-06: enforces the isolated create-only definition contract atomically', () => {
    const cases: [unknown, string][] = [
      ['{ not json', 'not valid JSON'],
      [[DEFINITION], 'exactly one form definition object'],
      [{ ...DEFINITION, resource: 'contacts' }, 'CRM resource key'],
      [{ ...DEFINITION, list: true }, 'create-only'],
      [{ ...DEFINITION, unexpected: true }, 'unsupported key(s): unexpected'],
      [{ ...DEFINITION, fields: [] }, '"fields" must be a non-empty array'],
      [{ ...DEFINITION, endpoint: 'api/contacts' }, 'must be an absolute Django path'],
      [
        { ...DEFINITION, fields: [{ name: 'a', label: 'A', control: 'date' }] },
        '"fields[0].control" must be one of',
      ],
      [
        {
          ...DEFINITION,
          fields: [
            { name: 'email', label: 'Email', control: 'email' },
            { name: 'email', label: 'Email again', control: 'text' },
          ],
        },
        'field names must be unique',
      ],
      [
        { ...DEFINITION, fields: [{ name: 'Email', label: 'Email', control: 'text' }] },
        '"fields[0].name" must match',
      ],
    ];

    for (const [definition, message] of cases) {
      const tree = createApplicationTree(definition);
      expect(() => generate(tree)).toThrow(message);
      expect(tree.exists(COMPONENT_PATH)).toBe(false);
    }

    const missingDefinition = createApplicationTree();
    expect(() => generate(missingDefinition, { definition: 'missing.json' })).toThrow(
      'was not found in the workspace',
    );
    expect(() => generate(missingDefinition, { definition: 'contact-form.txt' })).toThrow(
      'must be a .json file',
    );
    expect(missingDefinition.exists(COMPONENT_PATH)).toBe(false);
  });

  it('TC-REACTIVE-FORM-07: rejects unsupported options and missing prerequisites before mutation', () => {
    const tree = createApplicationTree();
    const missingDependencies = createApplicationTree();
    missingDependencies.overwrite('/package.json', JSON.stringify({ dependencies: {} }));

    expect(() => generate(tree, { name: 'Contact' })).toThrow('kebab-case');
    expect(() => generate(tree, { path: '../outside' })).toThrow(
      'within the application source tree',
    );
    expect(() => generate(tree, { unsupported: true } as never)).toThrow(
      'Unsupported reactive-form option(s): unsupported',
    );
    expect(() => generate(missingDependencies)).toThrow('requires installed prerequisites');
    expect(tree.exists(COMPONENT_PATH)).toBe(false);
    expect(missingDependencies.exists(COMPONENT_PATH)).toBe(false);
  });

  it('TC-REACTIVE-FORM-08: integrates only through an explicit typed artifact that exists locally', () => {
    const integration = {
      artifact: 'src/app/api-integration/contact-submit.ts',
      symbol: 'ContactSubmitService',
      method: 'create',
    };
    const definition = { ...DEFINITION, integration };
    const artifactSource = `import { Observable } from 'rxjs';

export class ContactSubmitService {
  create(payload: unknown): Observable<unknown> {
    throw new Error('not implemented');
  }
}
`;

    const missingArtifact = createApplicationTree(definition);
    expect(() => generate(missingArtifact)).toThrow('does not exist');
    expect(missingArtifact.exists(COMPONENT_PATH)).toBe(false);

    const wrongSymbol = createApplicationTree(definition);
    wrongSymbol.create(
      '/src/app/api-integration/contact-submit.ts',
      artifactSource.replace('ContactSubmitService', 'OtherService'),
    );
    expect(() => generate(wrongSymbol)).toThrow('does not export class "ContactSubmitService"');

    const wrongMethod = createApplicationTree(definition);
    wrongMethod.create(
      '/src/app/api-integration/contact-submit.ts',
      artifactSource.replace('create(payload', 'save(payload'),
    );
    expect(() => generate(wrongMethod)).toThrow('does not declare a "create" member');

    // A longer member that merely starts with the declared name is not a match.
    const prefixedMethod = createApplicationTree(definition);
    prefixedMethod.create(
      '/src/app/api-integration/contact-submit.ts',
      artifactSource.replace('create(payload', 'createContact(payload'),
    );
    expect(() => generate(prefixedMethod)).toThrow('does not declare a "create" member');
    expect(prefixedMethod.exists(COMPONENT_PATH)).toBe(false);

    const tree = createApplicationTree(definition);
    tree.create('/src/app/api-integration/contact-submit.ts', artifactSource);
    const component = readContent(generate(tree), COMPONENT_PATH);

    expect(component).toContain(
      "import { ContactSubmitService } from '../../api-integration/contact-submit';",
    );
    expect(component).toContain(
      'private readonly contactSubmitService = inject(ContactSubmitService);',
    );
    expect(component).toContain('.create(this.form.getRawValue())');
    expect(component).toContain('.pipe(takeUntilDestroyed(this.destroyRef))');
    expect(component).toContain(
      'error: (error: unknown) => this.failSubmit(toServerErrors(error))',
    );
    expect(component).not.toContain('output<');
  });

  it('TC-REACTIVE-FORM-09: is create-only and deterministic on rerun', () => {
    const tree = createApplicationTree();
    const context = createContext();
    const first = reactiveForm({ name: 'contact', definition: 'contact-form.json' })(
      tree,
      context,
    ) as UnitTestTree;
    first.overwrite(COMPONENT_PATH, '// maintained form');

    const rerun = reactiveForm({ name: 'contact', definition: 'contact-form.json' })(
      first,
      context,
    ) as UnitTestTree;
    expect(readContent(rerun, COMPONENT_PATH)).toBe('// maintained form');
    expect(context.logger.warn).toHaveBeenCalledWith(expect.stringContaining('already exists'));

    rerun.delete(TEMPLATE_PATH);
    expect(() =>
      reactiveForm({ name: 'contact', definition: 'contact-form.json' })(rerun, context),
    ).toThrow('only partially present');
  });

  it('TC-REACTIVE-FORM-10: publishes the definition contract in schema.json', () => {
    const schema = JSON.parse(readFileSync(schematicSchemaPath('reactive-form'), 'utf8'));
    const definition = schema.definitions.reactiveFormDefinition;

    expect(schema.properties.name.$default).toEqual({ $source: 'argv', index: 0 });
    expect(schema.required).toEqual(['name', 'definition']);
    expect(definition.additionalProperties).toBe(false);
    expect(definition.required).toEqual(['title', 'endpoint', 'fields']);
    expect(Object.keys(definition.properties).sort()).toEqual([
      '$schema',
      'endpoint',
      'fields',
      'integration',
      'submitLabel',
      'title',
    ]);
    expect(schema.definitions.reactiveFormField.properties.control.enum).toEqual([
      ...REACTIVE_FORM_CONTROL_KINDS,
    ]);
    expect(Object.keys(schema.definitions.reactiveFormField.properties).sort()).toEqual([
      'autocomplete',
      'control',
      'hint',
      'initialValue',
      'label',
      'name',
      'placeholder',
      'required',
      'validators',
    ]);
    expect(schema.definitions.reactiveFormField.properties.initialValue.type).toEqual([
      'string',
      'number',
      'null',
    ]);
    expect(schema.definitions.reactiveFormValidator.additionalProperties).toBe(false);
    expect(schema.definitions.reactiveFormValidator.required).toEqual(['type']);
    expect(schema.definitions.reactiveFormValidator.properties.type.enum).toEqual([
      ...REACTIVE_FORM_VALIDATOR_KINDS,
    ]);
    expect(schema.definitions.reactiveFormIntegration.required).toEqual([
      'artifact',
      'symbol',
      'method',
    ]);
  });

  it('TC-REACTIVE-FORM-11: honors the selected project, path, and primitives path', () => {
    const tree = createApplicationTree(DEFINITION, {
      admin: { root: 'projects/admin', sourceRoot: 'projects/admin/src' },
      storefront: { root: 'projects/storefront', sourceRoot: 'projects/storefront/src' },
    });
    tree.create('/projects/storefront/src/app/ui/fields/email-field/email-field.ts', 'export {};');

    const generated = generate(tree, {
      project: 'storefront',
      path: 'src/app/checkout',
      primitivesPath: 'src/app/ui/fields',
    });
    const componentPath = '/projects/storefront/src/app/checkout/contact-form/contact-form.ts';

    expect(generated.exists(componentPath)).toBe(true);
    expect(readContent(generated, componentPath)).toContain(
      "import { EmailFieldComponent } from '../../ui/fields/email-field/email-field';",
    );
    expect(() => generate(createApplicationTree(DEFINITION, {}))).toThrow('Specify --project');
  });

  it('TC-REACTIVE-FORM-12: emits typed controls initialized from the contract with declared validators', () => {
    const definition = {
      title: 'Create contact',
      endpoint: '/api/contacts/',
      fields: [
        {
          name: 'email',
          label: 'Email',
          control: 'email',
          initialValue: 'team@example.com',
          validators: [{ type: 'required' }],
        },
        {
          name: 'fullName',
          label: 'Full name',
          control: 'text',
          validators: [
            { type: 'maxLength', value: 120 },
            { type: 'required' },
            { type: 'minLength', value: 2 },
            { type: 'pattern', value: '^[A-Za-z .-]+$' },
          ],
        },
        {
          name: 'headcount',
          label: 'Headcount',
          control: 'number',
          initialValue: 1,
          validators: [
            { type: 'min', value: 1 },
            { type: 'max', value: 500 },
          ],
        },
        { name: 'notes', label: 'Notes', control: 'textarea' },
      ],
    };
    const tree = createApplicationTree(definition);
    createCanonicalPrimitive(tree, 'email');
    const generated = generate(tree);
    const component = readContent(generated, COMPONENT_PATH);
    const template = readContent(generated, TEMPLATE_PATH);

    // Initial values come from the contract and survive an accepted create.
    expect(component).toContain('const INITIAL_VALUES: ContactFormPayload = Object.freeze({');
    expect(component).toContain("  email: 'team@example.com',");
    expect(component).toContain('  headcount: 1,');
    expect(component).toContain('  notes: null,');
    expect(component).toContain('this.form.reset(INITIAL_VALUES);');

    // Validators are emitted in canonical order regardless of declaration order.
    expect(component).toContain(
      [
        'fullName: this.formBuilder.control<string | null>(null, [',
        '      Validators.required,',
        '      Validators.minLength(2),',
        '      Validators.maxLength(120),',
        "      Validators.pattern('^[A-Za-z .-]+$'),",
        '    ]),',
      ].join('\n'),
    );
    expect(component).toContain(
      'headcount: this.formBuilder.control<number | null>(1, [Validators.min(1), Validators.max(500)]),',
    );
    expect(component).toContain('notes: this.formBuilder.control<string | null>(null),');
    expect(component).toContain(
      "email: this.formBuilder.control<string | null>('team@example.com', [",
    );
    // `control: 'email'` still contributes Validators.email exactly once.
    expect(component.match(/Validators\.email/g)).toHaveLength(1);

    // Inline error messages cover the declared validators.
    expect(component).toContain(
      'return `${label} must be at least ${minLength.requiredLength} characters.`;',
    );
    expect(component).toContain(
      'return `${label} must be at most ${maxLength.requiredLength} characters.`;',
    );
    expect(component).toContain('return `${label} must be ${min.min} or more.`;');
    expect(component).toContain('return `${label} must be ${max.max} or less.`;');
    expect(component).toContain('return `${label} has an invalid format.`;');

    // A `required` validator entry drives the composed primitive binding.
    expect(template).toContain('[required]="true"');
  });

  it('TC-REACTIVE-FORM-13: rejects malformed initial values and validators atomically', () => {
    const fieldDefinition = (field: Record<string, unknown>) => ({
      title: 'Create contact',
      endpoint: '/api/contacts/',
      fields: [{ name: 'value', label: 'Value', control: 'text', ...field }],
    });
    const cases: [Record<string, unknown>, string][] = [
      [{ initialValue: 2 }, '"fields[0].initialValue" must be a string or null'],
      [{ initialValue: true }, '"fields[0].initialValue" must be a string or null'],
      [
        { control: 'number', initialValue: '2' },
        '"fields[0].initialValue" must be a finite number or null',
      ],
      [{ validators: {} }, '"fields[0].validators" must be an array of validator objects'],
      [{ validators: ['required'] }, '"fields[0].validators[0]" must be an object'],
      [{ validators: [{ type: 'phone' }] }, '"fields[0].validators[0].type" must be one of'],
      [
        { validators: [{ type: 'min', value: 1, unexpected: true }] },
        'unsupported key(s): unexpected',
      ],
      [{ validators: [{ type: 'minLength' }] }, 'must declare a "value" for "minLength"'],
      [
        { validators: [{ type: 'required', value: true }] },
        'must not declare a "value" for "required"',
      ],
      [
        { validators: [{ type: 'minLength', value: 2.5 }] },
        'must be a non-negative integer for "minLength"',
      ],
      [{ validators: [{ type: 'maxLength', value: '10' }] }, 'must be a finite number'],
      [{ validators: [{ type: 'pattern', value: '([' }] }, 'must be a valid regular expression'],
      [
        {
          validators: [
            { type: 'minLength', value: 1 },
            { type: 'minLength', value: 2 },
          ],
        },
        '"fields[0].validators" declares "minLength" more than once',
      ],
      [
        { required: true, validators: [{ type: 'required' }] },
        '"fields[0]" declares "required" through both the "required" key and a validator entry',
      ],
      [
        { control: 'email', validators: [{ type: 'email' }] },
        'already applies Validators.email through "control": "email"',
      ],
      [
        { control: 'number', validators: [{ type: 'minLength', value: 2 }] },
        '("minLength") does not apply to a "number" control',
      ],
      [{ validators: [{ type: 'min', value: 2 }] }, '("min") only applies to a "number" control'],
    ];

    for (const [field, message] of cases) {
      const tree = createApplicationTree(fieldDefinition(field));
      expect(() => generate(tree)).toThrow(message);
      expect(tree.exists(COMPONENT_PATH)).toBe(false);
    }

    // `"required": false` adds no validator, so an explicit entry is not a duplicate.
    const generated = generate(
      createApplicationTree(
        fieldDefinition({ required: false, validators: [{ type: 'required' }] }),
      ),
    );
    const component = readContent(generated, COMPONENT_PATH);
    expect(component).toContain(
      'value: this.formBuilder.control<string | null>(null, [Validators.required]),',
    );
    expect(component.match(/Validators\.required/g)).toHaveLength(1);
  });
});
