import { strings } from '@angular-devkit/core';
import {
  REACTIVE_FORM_VALIDATOR_KINDS,
  type ReactiveFormControlKind,
  type ReactiveFormDefinition,
  type ReactiveFormFieldDefinition,
  type ReactiveFormValidatorDefinition,
  type ReactiveFormValidatorKind,
} from './schema';

/** Inputs a composed field primitive is known to expose. */
export interface ReactiveFormPrimitiveInputs {
  fieldId: boolean;
  label: boolean;
  hint: boolean;
  placeholder: boolean;
  required: boolean;
  controlType: boolean;
  serverErrors: boolean;
}

/** A reusable field primitive that already exists in the workspace. */
export interface ReactiveFormPrimitive {
  className: string;
  selector: string;
  importPath: string;
  inputs: ReactiveFormPrimitiveInputs;
}

/** A contract field plus the primitive composed for it, when one exists. */
export interface ResolvedReactiveFormField {
  definition: ReactiveFormFieldDefinition;
  primitive?: ReactiveFormPrimitive;
}

/** A typed artifact that already exists locally and receives the payload. */
export interface ResolvedReactiveFormIntegration {
  symbol: string;
  method: string;
  importPath: string;
  propertyName: string;
}

export interface ReactiveFormTemplateOptions {
  /** Kebab-case base name, for example `contact`. */
  name: string;
  /** Generated file base name, for example `contact-form`. */
  fileName: string;
  /** Generated component class name, for example `ContactFormComponent`. */
  className: string;
  /** Generated component selector, for example `app-contact-form`. */
  selector: string;
  definition: ReactiveFormDefinition;
  fields: readonly ResolvedReactiveFormField[];
  integration?: ResolvedReactiveFormIntegration;
}

/** TypeScript type of a control value for each supported control kind. */
export function controlValueType(control: ReactiveFormControlKind): string {
  return control === 'number' ? 'number | null' : 'string | null';
}

/**
 * Resolve the validators emitted for a field.
 *
 * The `required` shorthand and the implicit `Validators.email` of an `email`
 * control are merged with the explicit `validators` entries, and the result is
 * ordered canonically so the generated code does not depend on authoring
 * order. The contract rejects duplicate declarations, so no validator can be
 * emitted twice.
 */
export function resolveFieldValidators(
  field: ReactiveFormFieldDefinition,
): ReactiveFormValidatorDefinition[] {
  const resolved: ReactiveFormValidatorDefinition[] = [...(field.validators ?? [])];
  if (field.required) {
    resolved.push({ type: 'required' });
  }
  if (field.control === 'email') {
    resolved.push({ type: 'email' });
  }

  return resolved.sort(
    (left, right) =>
      REACTIVE_FORM_VALIDATOR_KINDS.indexOf(left.type) -
      REACTIVE_FORM_VALIDATOR_KINDS.indexOf(right.type),
  );
}

/** Generate the typed standalone OnPush reactive-form component. */
export function reactiveFormComponentSource(options: ReactiveFormTemplateOptions): string {
  const base = options.className.replace(/Component$/, '');
  const payloadType = `${base}Payload`;
  const errorsType = `${base}ServerErrors`;
  const statusType = `${base}Status`;
  const inlineFields = options.fields.filter((field) => !field.primitive);
  const usesServerErrorInputs = options.fields.some(
    (field) => field.primitive?.inputs.serverErrors,
  );
  const usesValidators = options.fields.some(
    (field) => resolveFieldValidators(field.definition).length > 0,
  );
  const hasInitialValues = options.fields.some(
    (field) => (field.definition.initialValue ?? null) !== null,
  );
  const inlineValidatorKinds = new Set<ReactiveFormValidatorKind>(
    inlineFields.flatMap((field) =>
      resolveFieldValidators(field.definition).map((validator) => validator.type),
    ),
  );
  const primitiveImports = collectPrimitiveImports(options.fields);

  const coreImports = ['ChangeDetectionStrategy', 'Component'];
  if (options.integration) {
    coreImports.push('DestroyRef');
  }
  coreImports.push('computed', 'inject');
  if (!options.integration) {
    coreImports.push('output');
  }
  coreImports.push('signal');

  const componentImports = ['ReactiveFormsModule'];
  if (inlineFields.length > 0) {
    componentImports.push('MatFormFieldModule', 'MatInputModule');
  }
  componentImports.push('MatButtonModule');
  componentImports.push(...primitiveImports.map((entry) => entry.className));

  const lines: string[] = [];
  lines.push(importStatement(coreImports, '@angular/core'));
  if (options.integration) {
    lines.push(importStatement(['takeUntilDestroyed'], '@angular/core/rxjs-interop'));
  }
  lines.push(
    importStatement(
      ['FormBuilder', 'ReactiveFormsModule', ...(usesValidators ? ['Validators'] : [])],
      '@angular/forms',
    ),
  );
  lines.push(importStatement(['MatButtonModule'], '@angular/material/button'));
  if (inlineFields.length > 0) {
    lines.push(importStatement(['MatFormFieldModule'], '@angular/material/form-field'));
    lines.push(importStatement(['MatInputModule'], '@angular/material/input'));
  }
  for (const entry of primitiveImports) {
    lines.push(importStatement([entry.className], entry.importPath));
  }
  if (options.integration) {
    lines.push(importStatement([options.integration.symbol], options.integration.importPath));
  }
  lines.push('');
  lines.push(`/**`);
  lines.push(` * Payload created by \`<${options.selector}>\`.`);
  lines.push(` *`);
  lines.push(` * Keys match the Django REST Framework serializer fields for`);
  lines.push(` * \`${options.definition.endpoint}\`.`);
  lines.push(` */`);
  lines.push(`export interface ${payloadType} {`);
  for (const field of options.fields) {
    lines.push(`  ${field.definition.name}: ${controlValueType(field.definition.control)};`);
  }
  lines.push(`}`);
  lines.push('');
  lines.push(`/**`);
  lines.push(` * Django REST Framework error payload: serializer field errors plus`);
  lines.push(` * non-field entries such as \`non_field_errors\` and \`detail\`.`);
  lines.push(` */`);
  lines.push(`export type ${errorsType} = Readonly<`);
  lines.push(`  Record<string, string | readonly string[] | undefined>`);
  lines.push(`>;`);
  lines.push('');
  lines.push(`/** Submit lifecycle state of the form. */`);
  lines.push(`export type ${statusType} = 'idle' | 'submitting' | 'success' | 'error';`);
  lines.push('');
  if (usesServerErrorInputs) {
    lines.push(`const NO_SERVER_ERRORS: readonly string[] = Object.freeze([]);`);
    lines.push('');
  }
  if (hasInitialValues) {
    lines.push(`/** Initial values declared by the form definition. */`);
    lines.push(`const INITIAL_VALUES: ${payloadType} = Object.freeze({`);
    for (const field of options.fields) {
      lines.push(`  ${field.definition.name}: ${initialValueSource(field.definition)},`);
    }
    lines.push(`});`);
    lines.push('');
  }
  lines.push(`/**`);
  lines.push(` * Create-only reactive form for \`${options.definition.endpoint}\`.`);
  lines.push(` *`);
  lines.push(` * Public API:`);
  lines.push(` * - \`form\` is a typed \`FormGroup\`; \`endpoint\` keeps the Django URL explicit.`);
  lines.push(` * - \`status\` and \`submitting\` expose the submit state.`);
  if (options.integration) {
    lines.push(
      ` * - \`submit()\` posts through the injected \`${options.integration.symbol}\` artifact.`,
    );
  } else {
    lines.push(` * - \`submit()\` emits \`submitted\` with the typed payload.`);
  }
  lines.push(
    hasInitialValues
      ? ` * - \`completeSubmit()\` resets the form to its initial values; \`failSubmit()\` maps Django REST`
      : ` * - \`completeSubmit()\` clears the form after a create; \`failSubmit()\` maps Django REST`,
  );
  lines.push(` *   Framework errors back onto the controls and retains the entered values.`);
  lines.push(` */`);
  lines.push(`@Component({`);
  lines.push(`  selector: '${options.selector}',`);
  lines.push(`  standalone: true,`);
  lines.push(...componentImportsLines(componentImports));
  lines.push(`  templateUrl: './${options.fileName}.html',`);
  lines.push(`  styleUrl: './${options.fileName}.scss',`);
  lines.push(`  changeDetection: ChangeDetectionStrategy.OnPush,`);
  lines.push(`})`);
  lines.push(`export class ${options.className} {`);
  lines.push(`  /** Django endpoint this form creates against. */`);
  lines.push(`  readonly endpoint = '${escapeSingleQuotes(options.definition.endpoint)}';`);
  lines.push('');
  lines.push(`  private readonly formBuilder = inject(FormBuilder);`);
  lines.push('');
  lines.push(`  readonly form = this.formBuilder.group({`);
  for (const field of options.fields) {
    lines.push(...controlLines(field.definition));
  }
  lines.push(`  });`);
  lines.push('');
  lines.push(`  readonly status = signal<${statusType}>('idle');`);
  lines.push(`  readonly submitting = computed(() => this.status() === 'submitting');`);
  lines.push(`  readonly formErrors = signal<readonly string[]>([]);`);
  lines.push('');
  lines.push(
    `  private readonly fieldErrors = signal<Readonly<Record<string, readonly string[]>>>({});`,
  );
  if (inlineFields.length > 0) {
    lines.push(`  private readonly labels: Readonly<Record<string, string>> = {`);
    for (const field of inlineFields) {
      lines.push(`    ${field.definition.name}: '${escapeSingleQuotes(field.definition.label)}',`);
    }
    lines.push(`  };`);
  }
  if (options.integration) {
    lines.push(`  private readonly destroyRef = inject(DestroyRef);`);
    lines.push(
      `  private readonly ${options.integration.propertyName} = inject(${options.integration.symbol});`,
    );
  } else {
    lines.push('');
    lines.push(`  /** Emitted once client-side validation passes. */`);
    lines.push(`  readonly submitted = output<${payloadType}>();`);
  }
  lines.push('');
  lines.push(`  /** Submit the form. Entered values are retained until a create succeeds. */`);
  lines.push(`  submit(): void {`);
  lines.push(`    if (this.submitting()) {`);
  lines.push(`      return;`);
  lines.push(`    }`);
  lines.push('');
  lines.push(`    this.form.markAllAsTouched();`);
  lines.push(`    this.clearServerErrors();`);
  lines.push(`    if (this.form.invalid) {`);
  lines.push(`      this.status.set('error');`);
  lines.push(`      return;`);
  lines.push(`    }`);
  lines.push('');
  lines.push(`    this.status.set('submitting');`);
  if (options.integration) {
    lines.push(`    this.${options.integration.propertyName}`);
    lines.push(`      .${options.integration.method}(this.form.getRawValue())`);
    lines.push(`      .pipe(takeUntilDestroyed(this.destroyRef))`);
    lines.push(`      .subscribe({`);
    lines.push(`        next: () => this.completeSubmit(),`);
    lines.push(`        error: (error: unknown) => this.failSubmit(toServerErrors(error)),`);
    lines.push(`      });`);
  } else {
    lines.push(`    this.submitted.emit(this.form.getRawValue());`);
  }
  lines.push(`  }`);
  lines.push('');
  lines.push(
    hasInitialValues
      ? `  /** Mark the create as accepted and reset the form to its initial values. */`
      : `  /** Mark the create as accepted and clear the form for the next entry. */`,
  );
  lines.push(`  completeSubmit(): void {`);
  lines.push(`    this.clearServerErrors();`);
  lines.push(`    this.form.reset(${hasInitialValues ? 'INITIAL_VALUES' : ''});`);
  lines.push(`    this.status.set('success');`);
  lines.push(`  }`);
  lines.push('');
  lines.push(`  /**`);
  lines.push(`   * Map a Django REST Framework error payload back onto the form.`);
  lines.push(`   *`);
  lines.push(`   * Serializer field errors are attached to the matching control as a \`server\``);
  lines.push(`   * error; \`non_field_errors\`, \`detail\`, and unknown keys become form-level`);
  lines.push(`   * messages. Entered values are retained so the user can correct them.`);
  lines.push(`   */`);
  lines.push(`  failSubmit(errors: ${errorsType}): void {`);
  lines.push(`    const fieldErrors: Record<string, readonly string[]> = {};`);
  lines.push(`    const formErrors: string[] = [];`);
  lines.push('');
  lines.push(`    for (const [key, value] of Object.entries(errors)) {`);
  lines.push(`      const messages = toMessages(value);`);
  lines.push(`      if (messages.length === 0) {`);
  lines.push(`        continue;`);
  lines.push(`      }`);
  lines.push('');
  lines.push(`      const control = this.form.get(key);`);
  lines.push(`      if (control) {`);
  lines.push(`        fieldErrors[key] = messages;`);
  lines.push(`        control.setErrors({ ...(control.errors ?? {}), server: messages[0] });`);
  lines.push(`        control.markAsTouched();`);
  lines.push(`      } else {`);
  lines.push(`        formErrors.push(...messages);`);
  lines.push(`      }`);
  lines.push(`    }`);
  lines.push('');
  lines.push(`    this.fieldErrors.set(fieldErrors);`);
  lines.push(`    this.formErrors.set(formErrors);`);
  lines.push(`    this.status.set('error');`);
  lines.push(`  }`);
  if (usesServerErrorInputs) {
    lines.push('');
    lines.push(`  /** Server messages rendered by the composed field primitives. */`);
    lines.push(`  serverErrors(field: string): readonly string[] {`);
    lines.push(`    return this.fieldErrors()[field] ?? NO_SERVER_ERRORS;`);
    lines.push(`  }`);
  }
  if (inlineFields.length > 0) {
    lines.push('');
    lines.push(`  /** True when a control must be announced as invalid. */`);
    lines.push(`  hasError(field: string): boolean {`);
    lines.push(`    return this.errorMessage(field) !== '';`);
    lines.push(`  }`);
    lines.push('');
    lines.push(`  /** First message rendered for a control. */`);
    lines.push(`  errorMessage(field: string): string {`);
    lines.push(`    const control = this.form.get(field);`);
    lines.push(`    if (!control?.errors || !(control.touched || control.dirty)) {`);
    lines.push(`      return '';`);
    lines.push(`    }`);
    lines.push('');
    lines.push(`    const server = control.errors['server'];`);
    lines.push(`    if (typeof server === 'string' && server) {`);
    lines.push(`      return server;`);
    lines.push(`    }`);
    lines.push('');
    lines.push(`    const label = this.labels[field] ?? field;`);
    lines.push(`    if (control.errors['required']) {`);
    lines.push('      return `${label} is required.`;');
    lines.push(`    }`);
    lines.push(`    if (control.errors['email']) {`);
    lines.push('      return `${label} must be a valid email address.`;');
    lines.push(`    }`);
    if (inlineValidatorKinds.has('minLength')) {
      lines.push(`    const minLength = control.errors['minlength'];`);
      lines.push(`    if (minLength) {`);
      lines.push(
        '      return `${label} must be at least ${minLength.requiredLength} characters.`;',
      );
      lines.push(`    }`);
    }
    if (inlineValidatorKinds.has('maxLength')) {
      lines.push(`    const maxLength = control.errors['maxlength'];`);
      lines.push(`    if (maxLength) {`);
      lines.push(
        '      return `${label} must be at most ${maxLength.requiredLength} characters.`;',
      );
      lines.push(`    }`);
    }
    if (inlineValidatorKinds.has('min')) {
      lines.push(`    const min = control.errors['min'];`);
      lines.push(`    if (min) {`);
      lines.push('      return `${label} must be ${min.min} or more.`;');
      lines.push(`    }`);
    }
    if (inlineValidatorKinds.has('max')) {
      lines.push(`    const max = control.errors['max'];`);
      lines.push(`    if (max) {`);
      lines.push('      return `${label} must be ${max.max} or less.`;');
      lines.push(`    }`);
    }
    if (inlineValidatorKinds.has('pattern')) {
      lines.push(`    if (control.errors['pattern']) {`);
      lines.push('      return `${label} has an invalid format.`;');
      lines.push(`    }`);
    }
    lines.push('');
    lines.push('    return `${label} is invalid.`;');
    lines.push(`  }`);
  }
  lines.push('');
  lines.push(`  private clearServerErrors(): void {`);
  lines.push(`    this.fieldErrors.set({});`);
  lines.push(`    this.formErrors.set([]);`);
  lines.push(`    for (const control of Object.values(this.form.controls)) {`);
  lines.push(`      if (control.errors?.['server'] !== undefined) {`);
  lines.push(`        control.updateValueAndValidity({ emitEvent: false });`);
  lines.push(`      }`);
  lines.push(`    }`);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push('');
  lines.push(`function toMessages(value: unknown): readonly string[] {`);
  lines.push(`  if (typeof value === 'string') {`);
  lines.push(`    return value ? [value] : [];`);
  lines.push(`  }`);
  lines.push(`  if (Array.isArray(value)) {`);
  lines.push(
    `    return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);`,
  );
  lines.push(`  }`);
  lines.push('');
  lines.push(`  return [];`);
  lines.push(`}`);
  if (options.integration) {
    lines.push('');
    lines.push(`function toServerErrors(error: unknown): ${errorsType} {`);
    lines.push(`  const body = (error as { error?: unknown } | null | undefined)?.error;`);
    lines.push(`  if (body && typeof body === 'object' && !Array.isArray(body)) {`);
    lines.push(`    return body as ${errorsType};`);
    lines.push(`  }`);
    lines.push('');
    lines.push(`  return { detail: 'The request failed. Please try again.' };`);
    lines.push(`}`);
  }

  return `${lines.join('\n')}\n`;
}

/** Generate the accessible Angular Material template for the form. */
export function reactiveFormTemplate(options: ReactiveFormTemplateOptions): string {
  const titleId = `${options.fileName}-title`;
  const submitLabel = options.definition.submitLabel ?? options.definition.title;
  const lines: string[] = [];

  lines.push(`<form`);
  lines.push(`  class="${options.fileName}"`);
  lines.push(`  [formGroup]="form"`);
  lines.push(`  (ngSubmit)="submit()"`);
  lines.push(`  novalidate`);
  lines.push(`  aria-labelledby="${titleId}"`);
  lines.push(`  [attr.aria-busy]="submitting()"`);
  lines.push(`>`);
  lines.push(`  <h2 class="${options.fileName}__title" id="${titleId}">`);
  lines.push(`    ${escapeHtmlText(options.definition.title)}`);
  lines.push(`  </h2>`);
  lines.push('');
  lines.push(`  @if (formErrors().length > 0) {`);
  lines.push(`    <div class="${options.fileName}__errors" role="alert">`);
  lines.push(`      <ul>`);
  lines.push(`        @for (message of formErrors(); track message) {`);
  lines.push(`          <li>{{ message }}</li>`);
  lines.push(`        }`);
  lines.push(`      </ul>`);
  lines.push(`    </div>`);
  lines.push(`  }`);

  for (const field of options.fields) {
    lines.push('');
    lines.push(
      ...(field.primitive
        ? primitiveFieldMarkup(options, field)
        : inlineFieldMarkup(options, field)),
    );
  }

  lines.push('');
  lines.push(`  <div class="${options.fileName}__actions">`);
  lines.push(`    <button mat-flat-button type="submit" [disabled]="submitting()">`);
  lines.push(`      ${escapeHtmlText(submitLabel)}`);
  lines.push(`    </button>`);
  lines.push(`  </div>`);
  lines.push('');
  lines.push(`  @if (status() === 'success') {`);
  lines.push(
    `    <p class="${options.fileName}__status" role="status">Submitted successfully.</p>`,
  );
  lines.push(`  }`);
  lines.push(`</form>`);

  return `${lines.join('\n')}\n`;
}

/** Generate the component stylesheet. */
export function reactiveFormStylesheet(options: ReactiveFormTemplateOptions): string {
  return `.${options.fileName} {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 32rem;
}

.${options.fileName}__errors ul {
  margin: 0;
  padding-inline-start: 1.25rem;
}

.${options.fileName}__actions {
  display: flex;
  justify-content: flex-end;
}
`;
}

/**
 * Emit one typed `FormBuilder` control, initialized from the definition and
 * wrapped inside the default 100-column width when it carries validators.
 */
function controlLines(field: ReactiveFormFieldDefinition): string[] {
  const type = controlValueType(field.control);
  const initial = initialValueSource(field);
  const validators = resolveFieldValidators(field).map(validatorSource);
  const call = `this.formBuilder.control<${type}>(${initial}`;
  if (validators.length === 0) {
    return [`    ${field.name}: ${call}),`];
  }

  const singleLine = `    ${field.name}: ${call}, [${validators.join(', ')}]),`;
  if (singleLine.length <= 100) {
    return [singleLine];
  }

  return [
    `    ${field.name}: ${call}, [`,
    ...validators.map((validator) => `      ${validator},`),
    `    ]),`,
  ];
}

/** Render the declared initial value as a TypeScript literal. */
function initialValueSource(field: ReactiveFormFieldDefinition): string {
  const initialValue = field.initialValue ?? null;
  if (initialValue === null) {
    return 'null';
  }

  return typeof initialValue === 'number'
    ? String(initialValue)
    : `'${escapeSingleQuotes(initialValue)}'`;
}

/** Render a single validator entry as a `Validators` call. */
function validatorSource(validator: ReactiveFormValidatorDefinition): string {
  switch (validator.type) {
    case 'required':
      return 'Validators.required';
    case 'email':
      return 'Validators.email';
    case 'pattern':
      return `Validators.pattern('${escapeSingleQuotes(String(validator.value))}')`;
    default:
      return `Validators.${validator.type}(${String(validator.value)})`;
  }
}

/** Keep the standalone `imports` array inside the default 100-column width. */
function componentImportsLines(componentImports: readonly string[]): string[] {
  const singleLine = `  imports: [${componentImports.join(', ')}],`;
  if (singleLine.length <= 100) {
    return [singleLine];
  }

  return [`  imports: [`, ...componentImports.map((entry) => `    ${entry},`), `  ],`];
}

/** Render an import statement, wrapping it inside the default 100-column width. */
function importStatement(names: readonly string[], from: string): string {
  const singleLine = `import { ${names.join(', ')} } from '${from}';`;
  if (singleLine.length <= 100) {
    return singleLine;
  }

  return `import {\n${names.map((name) => `  ${name},`).join('\n')}\n} from '${from}';`;
}

function primitiveFieldMarkup(
  options: ReactiveFormTemplateOptions,
  field: ResolvedReactiveFormField,
): string[] {
  const primitive = field.primitive!;
  const definition = field.definition;
  const lines = [`  <${primitive.selector}`, `    formControlName="${definition.name}"`];

  if (primitive.inputs.fieldId) {
    lines.push(`    fieldId="${options.fileName}-${definition.name}"`);
  }
  if (primitive.inputs.label) {
    lines.push(`    label="${escapeHtmlAttribute(definition.label)}"`);
  }
  if (primitive.inputs.controlType) {
    lines.push(`    controlType="${definition.control}"`);
  }
  if (primitive.inputs.hint && definition.hint) {
    lines.push(`    hint="${escapeHtmlAttribute(definition.hint)}"`);
  }
  if (primitive.inputs.placeholder && definition.placeholder) {
    lines.push(`    placeholder="${escapeHtmlAttribute(definition.placeholder)}"`);
  }
  if (
    primitive.inputs.required &&
    resolveFieldValidators(definition).some((validator) => validator.type === 'required')
  ) {
    lines.push(`    [required]="true"`);
  }
  if (primitive.inputs.serverErrors) {
    lines.push(`    [serverErrors]="serverErrors('${definition.name}')"`);
  }
  lines.push(`  ></${primitive.selector}>`);

  return lines;
}

function inlineFieldMarkup(
  options: ReactiveFormTemplateOptions,
  field: ResolvedReactiveFormField,
): string[] {
  const definition = field.definition;
  const controlId = `${options.fileName}-${definition.name}`;
  const errorId = `${controlId}-error`;
  const lines = [`  <mat-form-field appearance="fill">`];
  lines.push(`    <mat-label>${escapeHtmlText(definition.label)}</mat-label>`);

  const attributes = [
    `      matInput`,
    `      id="${controlId}"`,
    `      formControlName="${definition.name}"`,
  ];
  if (definition.control !== 'textarea') {
    attributes.push(`      type="${definition.control}"`);
  }
  if (definition.placeholder) {
    attributes.push(`      placeholder="${escapeHtmlAttribute(definition.placeholder)}"`);
  }
  if (definition.autocomplete) {
    attributes.push(`      autocomplete="${escapeHtmlAttribute(definition.autocomplete)}"`);
  }
  attributes.push(`      [attr.aria-invalid]="hasError('${definition.name}')"`);
  attributes.push(
    `      [attr.aria-errormessage]="hasError('${definition.name}') ? '${errorId}' : null"`,
  );

  if (definition.control === 'textarea') {
    lines.push(`    <textarea`, ...attributes, `    ></textarea>`);
  } else {
    lines.push(`    <input`, ...attributes, `    />`);
  }

  if (definition.hint) {
    lines.push(`    <mat-hint>${escapeHtmlText(definition.hint)}</mat-hint>`);
  }
  lines.push(`    @if (hasError('${definition.name}')) {`);
  lines.push(
    `      <mat-error id="${errorId}">{{ errorMessage('${definition.name}') }}</mat-error>`,
  );
  lines.push(`    }`);
  lines.push(`  </mat-form-field>`);

  return lines;
}

function collectPrimitiveImports(
  fields: readonly ResolvedReactiveFormField[],
): { className: string; importPath: string }[] {
  const imports: { className: string; importPath: string }[] = [];
  for (const field of fields) {
    const primitive = field.primitive;
    if (!primitive || imports.some((entry) => entry.className === primitive.className)) {
      continue;
    }
    imports.push({ className: primitive.className, importPath: primitive.importPath });
  }

  return imports;
}

/** Derive the generated component names from the schematic name. */
export function reactiveFormNames(name: string): {
  fileName: string;
  className: string;
  selector: string;
} {
  const fileName = `${name}-form`;

  return {
    fileName,
    className: `${strings.classify(name)}FormComponent`,
    selector: `app-${fileName}`,
  };
}

function escapeSingleQuotes(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtmlText(value).replace(/"/g, '&quot;');
}
