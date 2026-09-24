import { readFileSync } from 'node:fs';
import { Tree } from '@angular-devkit/schematics';
import type { UnitTestTree } from '@angular-devkit/schematics/testing';
import { describe, expect, it, vi } from 'vitest';

import { fieldComponent } from '../../../../projects/angular-django2/schematics/field-component/index';
import { reactiveForm } from '../../../../projects/angular-django2/schematics/reactive-form/index';
import {
  REACTIVE_FORM_CONTROL_KINDS,
  REACTIVE_FORM_VALIDATOR_KINDS,
} from '../../../../projects/angular-django2/schematics/reactive-form/schema';
import type { ReactiveFormSchema } from '../../../../projects/angular-django2/schematics/reactive-form/schema';
import {
  reactiveFormDefinitionFromAst,
  reactiveFormDefinitionToAst,
} from '../../../../projects/angular-django2/schematics/reactive-form/ast';
import { parseReactiveFormDefinition } from '../../../../projects/angular-django2/schematics/reactive-form/definition';
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
    expect(template).toContain('<ul class="contact-form__errors" role="alert">');
    expect(template).not.toContain('<div class="contact-form__errors"');
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
      [{ ...DEFINITION, resource: 'contacts' }, 'resource-operation key'],
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
    // --definition and --document are mutually exclusive, so only name is schema-required.
    expect(schema.required).toEqual(['name']);
    expect(schema.properties.document.format).toBe('path');
    expect(schema.properties.nodeId.aliases).toEqual([
      'element-id',
      'elementId',
      'node-id',
      'nodeId',
    ]);
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

describe('reactive-form schematic: OpenUI Form documents', () => {
  const DOCUMENT_PATH = 'documents/app.openui.json';
  const INTEGRATION_ARTIFACT = `export class ContactSubmitService {
  create(payload: unknown): unknown {
    return payload;
  }
}
`;

  /** OpenUI equivalent of DEFINITION, using catalog-style attributes. */
  const CONTACT_FORM = {
    id: 'contactForm',
    type: 'Form',
    attrs: { '[title]': 'Create contact', '[action]': '/api/contacts/' },
    children: [
      {
        id: 'firstName',
        type: 'TextInputs',
        attrs: {
          '[name]': 'first_name',
          '[label]': 'First name',
          '[required]': 'true',
          '[hint]': 'Given name on the record',
          '[autocomplete]': 'given-name',
        },
      },
      {
        id: 'email',
        type: 'TextInputs',
        attrs: { '[type]': 'email', '[label]': 'Email', '[required]': 'true' },
      },
      { id: 'seats', type: 'RangeControl', attrs: { '[label]': 'Seats' } },
      { id: 'notes', type: 'TextInputs', attrs: { '[type]': 'textarea', '[label]': 'Notes' } },
      { id: 'contactSubmit', type: 'ActionControls', attrs: { '[label]': 'Create contact' } },
    ],
  };

  function documentOf(...forms: unknown[]): string {
    return JSON.stringify({ version: '0.2.0', id: 'root', type: 'html', children: forms });
  }

  function createDocumentTree(document: string = documentOf(CONTACT_FORM)): UnitTestTree {
    const tree = createApplicationTree();
    tree.create(`/${DOCUMENT_PATH}`, document);
    return tree;
  }

  function generateFromDocument(
    tree: Tree,
    options: Partial<ReactiveFormSchema> = {},
  ): UnitTestTree {
    return generate(tree, { definition: undefined, document: DOCUMENT_PATH, ...options });
  }

  function outputs(tree: Tree): string[] {
    return [COMPONENT_PATH, TEMPLATE_PATH, STYLESHEET_PATH].map((path) => readContent(tree, path));
  }

  it('TC-REACTIVE-FORM-OPENUI-01: compiles a Form node to output identical to the legacy definition', () => {
    const fromDefinition = generate(createApplicationTree());
    const fromDocument = generateFromDocument(createDocumentTree());

    expect(outputs(fromDocument)).toEqual(outputs(fromDefinition));
  });

  it('TC-REACTIVE-FORM-OPENUI-02: maps (submit) to the typed integration identically to the legacy definition', () => {
    const integration = {
      artifact: 'src/app/api-integration/contact-submit.ts',
      symbol: 'ContactSubmitService',
      method: 'create',
    };
    const legacyTree = createApplicationTree({ ...DEFINITION, integration });
    legacyTree.create(`/${integration.artifact}`, INTEGRATION_ARTIFACT);
    const documentTree = createDocumentTree(
      documentOf({
        ...CONTACT_FORM,
        attrs: {
          ...CONTACT_FORM.attrs,
          '(submit)': 'src/app/api-integration/contact-submit.ts#ContactSubmitService.create',
        },
      }),
    );
    documentTree.create(`/${integration.artifact}`, INTEGRATION_ARTIFACT);

    expect(outputs(generateFromDocument(documentTree))).toEqual(outputs(generate(legacyTree)));
  });

  it('TC-REACTIVE-FORM-OPENUI-DEPRECATION: warns on --definition with a Form node that compiles identically', () => {
    const legacyContext = createContext() as unknown as {
      logger: { warn: ReturnType<typeof vi.fn> };
    };
    const legacyTree = createApplicationTree();
    reactiveForm({ name: 'contact', definition: 'contact-form.json' } as ReactiveFormSchema)(
      legacyTree,
      legacyContext as never,
    );

    const warning = String(legacyContext.logger.warn.mock.calls[0][0]);
    expect(warning).toContain('--definition (reactiveFormDefinition) is deprecated');
    expect(warning).toContain('--nodeId=contact:');

    const form = JSON.parse(warning.slice(warning.indexOf(':\n') + 2));
    const fromWarning = generateFromDocument(createDocumentTree(documentOf(form)), {
      nodeId: form.id,
    });
    expect(outputs(fromWarning)).toEqual(outputs(legacyTree));

    const documentContext = createContext() as unknown as {
      logger: { warn: ReturnType<typeof vi.fn> };
    };
    reactiveForm({ name: 'contact', document: DOCUMENT_PATH } as ReactiveFormSchema)(
      createDocumentTree(),
      documentContext as never,
    );
    expect(documentContext.logger.warn).not.toHaveBeenCalled();
  });

  it('TC-REACTIVE-FORM-OPENUI-03: round-trips every legacy definition feature through the Form AST', () => {
    const source = {
      title: 'Profile',
      endpoint: '/api/profiles/',
      submitLabel: 'Save',
      fields: [
        {
          name: 'user_name',
          label: 'User name',
          control: 'text',
          initialValue: 'guest',
          required: false,
          validators: [
            { type: 'required' },
            { type: 'email' },
            { type: 'minLength', value: 3 },
            { type: 'maxLength', value: 40 },
            { type: 'pattern', value: '^[a-z_]+$' },
          ],
          placeholder: 'e.g. ada',
        },
        // Differs from user_name only by camel case: ids stay unique because they are positional.
        { name: 'userName', label: 'Alias', control: 'password' },
        {
          name: 'age',
          label: 'Age',
          control: 'number',
          initialValue: null,
          validators: [
            { type: 'min', value: 0 },
            { type: 'max', value: 120.5 },
          ],
        },
      ],
      integration: { artifact: 'src/app/api/profile.ts', symbol: 'ProfileApi', method: 'create' },
    };
    const definition = parseReactiveFormDefinition(JSON.stringify(source), 'profile.json');
    const form = reactiveFormDefinitionToAst(definition, 'profile');

    expect(form.id).toBe('profile');
    expect(form.children?.map((child) => child.id)).toEqual([
      'profileField0',
      'profileField1',
      'profileField2',
      'profileSubmitAction',
    ]);
    expect(form.children?.[0].attrs).toMatchObject({
      '[required]': 'true',
      '[email]': 'true',
      '[minLength]': '3',
    });

    const decoded = reactiveFormDefinitionFromAst(form, 'profile.json');
    // `required: false` plus a required validator is emitted as `[required]="true"`.
    expect(decoded).toEqual({
      ...definition,
      fields: [
        {
          ...definition.fields[0],
          required: true,
          validators: definition.fields[0].validators?.filter((entry) => entry.type !== 'required'),
        },
        ...definition.fields.slice(1),
      ],
    });
  });

  it('TC-REACTIVE-FORM-OPENUI-04: selects a Form by --nodeId and defaults to the first Form', () => {
    const second = {
      ...CONTACT_FORM,
      id: 'otherForm',
      attrs: { ...CONTACT_FORM.attrs, '[title]': 'Other form' },
      children: [{ id: 'otherNotes', type: 'TextInputs', attrs: { '[label]': 'Notes' } }],
    };
    const document = documentOf(CONTACT_FORM, second);

    expect(
      readContent(generateFromDocument(createDocumentTree(document)), TEMPLATE_PATH),
    ).toContain('Create contact');
    expect(
      readContent(
        generateFromDocument(createDocumentTree(document), { nodeId: 'otherForm' }),
        TEMPLATE_PATH,
      ),
    ).toContain('Other form');
    expect(() =>
      generateFromDocument(createDocumentTree(document), { nodeId: 'otherNotes' }),
    ).toThrow('OpenUI node "otherNotes" has type "TextInputs" but this schematic expects "Form".');
  });

  it.each([
    [
      'an unsupported Form attribute',
      { ...CONTACT_FORM, attrs: { ...CONTACT_FORM.attrs, '(validate)': 'check()' } },
      'OpenUI node "documents/app.openui.json#contactForm" has unsupported attribute(s): (validate).',
    ],
    [
      'a malformed (submit) binding',
      { ...CONTACT_FORM, attrs: { ...CONTACT_FORM.attrs, '(submit)': 'save()' } },
      'attribute "(submit)" must be "<artifact>#<Symbol>.<method>", not "save()".',
    ],
    [
      'a non-numeric validator',
      {
        ...CONTACT_FORM,
        children: [
          { id: 'seats', type: 'RangeControl', attrs: { '[label]': 'Seats', '[min]': 'x' } },
        ],
      },
      'OpenUI node "documents/app.openui.json#contactForm/seats": attribute "[min]" must be a finite number, not "x".',
    ],
    [
      'a control kind that contradicts its node type',
      {
        ...CONTACT_FORM,
        children: [
          { id: 'seats', type: 'TextInputs', attrs: { '[type]': 'number', '[label]': 'S' } },
        ],
      },
      '[type]="number" requires a "RangeControl" node, not "TextInputs".',
    ],
    [
      'an unsupported control type',
      { ...CONTACT_FORM, children: [{ id: 'agree', type: 'ChoiceControls' }] },
      'has type "ChoiceControls", which is not a supported form control.',
    ],
    [
      'two submit actions',
      {
        ...CONTACT_FORM,
        children: [
          ...CONTACT_FORM.children,
          { id: 'secondSubmit', type: 'ActionControls', attrs: { '[label]': 'Again' } },
        ],
      },
      'declares 2 "ActionControls" children; a reactive form has exactly one submit action.',
    ],
    [
      'a contract violation (missing label)',
      { ...CONTACT_FORM, children: [{ id: 'notes', type: 'TextInputs' }] },
      'reactive-form definition "documents/app.openui.json#contactForm": "fields[0].label" must be a non-empty string.',
    ],
  ])('TC-REACTIVE-FORM-OPENUI-05: rejects %s before creating output', (_case, form, message) => {
    const tree = createDocumentTree(documentOf(form));

    expect(() => generateFromDocument(tree)).toThrow(message);
    expect(tree.exists(COMPONENT_PATH)).toBe(false);
  });

  it('TC-REACTIVE-FORM-OPENUI-06: requires exactly one of --definition and --document', () => {
    expect(() =>
      generate(createDocumentTree(), { definition: 'contact-form.json', document: DOCUMENT_PATH }),
    ).toThrow('Pass either --definition or --document, not both.');
    expect(() => generate(createApplicationTree(), { nodeId: 'contactForm' })).toThrow(
      '--nodeId requires --document.',
    );
    expect(() => generate(createApplicationTree(), { definition: undefined })).toThrow(
      'or --document with an OpenUI document.',
    );
  });
});
