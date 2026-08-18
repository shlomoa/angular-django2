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

  return `import { ChangeDetectionStrategy, Component, Input, booleanAttribute, inject } from '@angular/core';
import { ControlValueAccessor, NgControl, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export type FormFieldValue = string | number | null;
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
  imports: [MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './${options.name}-field.html',
  styleUrl: './${options.name}-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${className} implements ControlValueAccessor {
  readonly ngControl = inject(NgControl, { self: true, optional: true });

  @Input() fieldId = '${options.name}-field';
  @Input() label = '${strings.classify(options.name)}';
  @Input({ transform: booleanAttribute }) required = false;
  @Input() hint = '';
  @Input() placeholder = '';
  @Input() appearance: FormFieldAppearance = '${options.appearance}';
  @Input() subscriptSizing: FormFieldSubscriptSizing = '${options.subscriptSizing}';
  @Input() controlType: FormFieldControlType = '${options.controlType}';
  @Input() serverErrors: readonly string[] = [];

  private isDisabled = false;
  protected value: FormFieldValue = null;
  private onChange: (value: FormFieldValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  @Input({ transform: booleanAttribute })
  set disabled(disabled: boolean) {
    this.isDisabled = disabled;
  }

  get disabled(): boolean {
    return this.isDisabled;
  }

  get errorState(): boolean {
    const control = this.ngControl?.control;
    return (
      this.serverErrors.length > 0 ||
      !!control?.invalid && !!(control.touched || control.dirty)
    );
  }

  get errorMessage(): string {
    if (this.serverErrors.length > 0) {
      return this.serverErrors[0];
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
      return \`\${this.label} is required.\`;
    }

    return \`\${this.label} is invalid.\`;
  }

  writeValue(value: FormFieldValue): void {
    this.value = value;
  }

  registerOnChange(onChange: (value: FormFieldValue) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  setDisabledState(disabled: boolean): void {
    this.isDisabled = disabled;
  }

  protected updateValue(event: Event): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    const value =
      this.controlType === 'number'
        ? input.value === ''
          ? null
          : Number(input.value)
        : input.value;

    this.value = Number.isNaN(value) ? null : value;
    this.onChange(this.value);
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
  return `<mat-form-field [appearance]="appearance" [subscriptSizing]="subscriptSizing">
  <mat-label>{{ label }}</mat-label>
  @if (controlType === 'textarea') {
    <textarea
      matInput
      [id]="fieldId"
      [placeholder]="placeholder"
      [required]="required"
      [disabled]="disabled"
      [value]="value ?? ''"
      [attr.aria-invalid]="errorState"
      [attr.aria-errormessage]="errorState ? fieldId + '-error' : null"
      (input)="updateValue($event)"
      (blur)="markTouched()"
    ></textarea>
  } @else {
    <input
      matInput
      [id]="fieldId"
      [type]="controlType"
      [placeholder]="placeholder"
      [required]="required"
      [disabled]="disabled"
      [value]="value ?? ''"
      [attr.aria-invalid]="errorState"
      [attr.aria-errormessage]="errorState ? fieldId + '-error' : null"
      (input)="updateValue($event)"
      (blur)="markTouched()"
    />
  }
  @if (hint) {
    <mat-hint>{{ hint }}</mat-hint>
  }
  @if (errorState) {
    <mat-error [id]="fieldId + '-error'">{{ errorMessage }}</mat-error>
  }
</mat-form-field>
`;
}
