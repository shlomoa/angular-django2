import { strings } from '@angular-devkit/core';
import type { FormFieldAppearance, FormFieldControlType, FormFieldSubscriptSizing } from './schema';

export interface FormFieldTemplateOptions {
  name: string;
  controlType: FormFieldControlType;
  appearance: FormFieldAppearance;
  subscriptSizing: FormFieldSubscriptSizing;
}

export function formFieldComponentSource(options: FormFieldTemplateOptions): string {
  const className = `${strings.classify(options.name)}FieldComponent`;
  const isNumber = options.controlType === 'number';
  const valueType = isNumber ? 'string | number | null' : 'string';
  const initialValue = isNumber ? 'null' : "''";
  const updateValue = isNumber
    ? `const input = event.target as HTMLInputElement;
    const value = input.value === '' ? null : Number(input.value);
    this.value.set(Number.isNaN(value) ? null : value);
    this.onChange(this.value());`
    : `const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.value.set(value);
    this.onChange(value);`;

  return `import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NgControl, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export type FormFieldValue = ${valueType};
export type FormFieldControlType = 'text' | 'email' | 'password' | 'number' | 'textarea';
export type FormFieldAppearance = 'fill' | 'outline';
export type FormFieldSubscriptSizing = 'fixed' | 'dynamic';

/**
 * Public API:
 * - fieldId, label, required, disabled, hint, and placeholder configure identity and accessible labels.
 * - controlType supports text, email, password, number, and textarea.
 * - appearance supports fill and outline; subscriptSizing supports fixed and dynamic.
 * - serverErrors accepts server validation messages; host-control errors are rendered automatically.
 */
@Component({
  selector: 'app-${options.name}-field',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule],
  templateUrl: './${options.name}-field.html',
  styleUrl: './${options.name}-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${className} implements ControlValueAccessor {
  readonly fieldId = input('${options.name}-field');
  readonly label = input('${strings.classify(options.name)}');
  readonly required = input(false, { transform: booleanAttribute });
  readonly hint = input('');
  readonly placeholder = input('');
  readonly appearance = input<FormFieldAppearance>('${options.appearance}');
  readonly subscriptSizing = input<FormFieldSubscriptSizing>('${options.subscriptSizing}');
  readonly controlType = input<FormFieldControlType>('${options.controlType}');
  readonly serverErrors = input<readonly string[]>([]);

  protected readonly value = signal<FormFieldValue>(${initialValue});
  protected readonly controlDisabled = computed(() => this.disabled() || this.formDisabled());
  protected readonly errorState = computed(() => {
    const control = this.ngControl?.control;
    return (
      this.serverErrors().length > 0 ||
      (!!control?.invalid && !!(control.touched || control.dirty))
    );
  });
  protected readonly errorMessage = computed(() => {
    const serverErrors = this.serverErrors();
    if (serverErrors.length > 0) {
      return serverErrors[0];
    }

    const errors = this.ngControl?.control?.errors;
    if (!errors) {
      return '';
    }

    const serverMessage = serverErrorMessage(errors);
    if (serverMessage) {
      return serverMessage;
    }
    if (errors['required']) {
      return \`\${this.label()} is required.\`;
    }

    return \`\${this.label()} is invalid.\`;
  });

  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly formDisabled = signal(false);
  private onChange: (value: FormFieldValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  readonly disabled = input(false, { transform: booleanAttribute });

  writeValue(value: FormFieldValue | null): void {
    this.value.set(value ?? ${initialValue});
  }

  registerOnChange(onChange: (value: FormFieldValue) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
  }

  protected updateValue(event: Event): void {
    ${updateValue}
  }

  protected markTouched(): void {
    this.onTouched();
  }
}

function serverErrorMessage(errors: ValidationErrors): string | null {
  for (const key of ['server', 'detail', 'non_field_errors']) {
    const value = errors[key];
    if (typeof value === 'string' && value) {
      return value;
    }
    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0];
    }
  }

  return null;
}
`;
}

export function formFieldTemplate(): string {
  return `<mat-form-field [appearance]="appearance()" [subscriptSizing]="subscriptSizing()">
  <mat-label>{{ label() }}</mat-label>
  @if (controlType() === 'textarea') {
    <textarea
      matInput
      [id]="fieldId()"
      [placeholder]="placeholder()"
      [required]="required()"
      [disabled]="controlDisabled()"
      [value]="value() ?? ''"
      [attr.aria-invalid]="errorState()"
      [attr.aria-errormessage]="errorState() ? fieldId() + '-error' : null"
      (input)="updateValue($event)"
      (blur)="markTouched()"
    ></textarea>
  } @else {
    <input
      matInput
      [id]="fieldId()"
      [type]="controlType()"
      [placeholder]="placeholder()"
      [required]="required()"
      [disabled]="controlDisabled()"
      [value]="value() ?? ''"
      [attr.aria-invalid]="errorState()"
      [attr.aria-errormessage]="errorState() ? fieldId() + '-error' : null"
      (input)="updateValue($event)"
      (blur)="markTouched()"
    />
  }
  @if (hint()) {
    <mat-hint>{{ hint() }}</mat-hint>
  }
  @if (errorState()) {
    <mat-error [id]="fieldId() + '-error'">{{ errorMessage() }}</mat-error>
  }
</mat-form-field>
`;
}
