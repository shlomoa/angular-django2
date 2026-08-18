import { strings } from '@angular-devkit/core';
import type { Rule, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import * as path from 'node:path';
import type { FieldComponentSchema, FieldControlKind } from './schema';
import {
  readWorkspace,
  requireWorkspaceProject,
  type WorkspaceProject,
} from '../utility/workspace';

const CONTROL_KINDS: readonly FieldControlKind[] = ['text', 'email', 'password', 'textarea'];
const DEFAULT_DIRECTORY = 'app/shared/ui/form-helpers';

interface ResolvedFieldComponentOptions {
  name: string;
  className: string;
  selector: string;
  kind: FieldControlKind;
  componentPath: string;
  templatePath: string;
}

/**
 * Generate a typed standalone Angular Material ControlValueAccessor.
 */
export function fieldComponent(options: FieldComponentSchema): Rule {
  return (tree: Tree) => {
    const resolved = resolveOptions(tree, options);
    assertMaterialPrerequisites(tree);
    assertNoCollision(tree, resolved);

    tree.create(resolved.componentPath, componentSource(resolved));
    tree.create(resolved.templatePath, templateSource(resolved));

    return tree;
  };
}

function resolveOptions(
  tree: Tree,
  options: FieldComponentSchema,
): ResolvedFieldComponentOptions {
  if (!options.name || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(options.name)) {
    throw new SchematicsException('The field component name must be non-empty kebab-case.');
  }

  const kind = options.kind ?? 'text';
  if (!CONTROL_KINDS.includes(kind)) {
    throw new SchematicsException(
      `Unsupported field control kind "${kind}". Supported kinds: ${CONTROL_KINDS.join(', ')}.`,
    );
  }

  const workspace = readWorkspace(tree);
  const projectName = resolveProjectName(workspace.projects ?? {}, options.project);
  const project = requireWorkspaceProject(workspace, projectName);
  if (project.projectType !== 'application') {
    throw new SchematicsException(`Project "${projectName}" must be an Angular application project.`);
  }

  const sourceRoot = normalizeWorkspacePath(project.sourceRoot ?? '');
  if (!sourceRoot) {
    throw new SchematicsException(`Project "${projectName}" has no application sourceRoot.`);
  }

  const targetDirectory = resolveTargetDirectory(options.path, project, sourceRoot);
  const componentDirectory = path.posix.join(targetDirectory, options.name);

  return {
    name: options.name,
    className: `${strings.classify(options.name)}Component`,
    selector: `app-${options.name}`,
    kind,
    componentPath: `/${path.posix.join(componentDirectory, `${options.name}.ts`)}`,
    templatePath: `/${path.posix.join(componentDirectory, `${options.name}.html`)}`,
  };
}

function resolveProjectName(
  projects: Record<string, WorkspaceProject>,
  requestedProject: string | undefined,
): string {
  if (requestedProject) {
    return requestedProject;
  }

  const applicationProjects = Object.entries(projects)
    .filter(([, project]) => project.projectType === 'application' && !!project.sourceRoot)
    .map(([name]) => name);
  if (applicationProjects.length !== 1) {
    throw new SchematicsException(
      'Specify --project when the workspace does not have exactly one application sourceRoot.',
    );
  }

  return applicationProjects[0];
}

function resolveTargetDirectory(
  requestedPath: string | undefined,
  project: WorkspaceProject,
  sourceRoot: string,
): string {
  if (!requestedPath) {
    return path.posix.join(sourceRoot, DEFAULT_DIRECTORY);
  }

  const normalizedPath = normalizeWorkspacePath(requestedPath);
  if (!normalizedPath || requestedPath.split(/[\\/]+/).includes('..')) {
    throw new SchematicsException(
      'The target path must be a non-empty path within the application source tree.',
    );
  }

  const projectRoot = normalizeWorkspacePath(project.root ?? '');
  const targetDirectory =
    isWithin(normalizedPath, sourceRoot) || (projectRoot && isWithin(normalizedPath, projectRoot))
      ? normalizedPath
      : normalizeWorkspacePath(path.posix.join(projectRoot, normalizedPath));

  if (!isWithin(targetDirectory, sourceRoot)) {
    throw new SchematicsException(
      `The target path "${requestedPath}" must be within the application source root "${sourceRoot}".`,
    );
  }

  return targetDirectory;
}

function assertMaterialPrerequisites(tree: Tree): void {
  const packageJson = tree.read('/package.json');
  if (!packageJson) {
    throw new SchematicsException(
      'field-component requires package.json with @angular/material and @angular/cdk dependencies. Run ng add @angular/material first.',
    );
  }

  let parsed: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    parsed = JSON.parse(packageJson.toString()) as typeof parsed;
  } catch {
    throw new SchematicsException(
      'field-component requires a valid package.json with @angular/material and @angular/cdk dependencies.',
    );
  }
  const dependencies = { ...parsed.devDependencies, ...parsed.dependencies };
  const missing = ['@angular/material', '@angular/cdk'].filter(
    (dependency) => !dependencies[dependency],
  );
  if (missing.length > 0) {
    throw new SchematicsException(
      `field-component requires Angular Material/CDK prerequisites: ${missing.join(', ')}. Run ng add @angular/material first.`,
    );
  }
}

function assertNoCollision(tree: Tree, resolved: ResolvedFieldComponentOptions): void {
  if (tree.exists(resolved.componentPath) || tree.exists(resolved.templatePath)) {
    throw new SchematicsException(
      `A field component named "${resolved.name}" already exists. Choose a different name or remove the existing component first.`,
    );
  }
}

function componentSource(resolved: ResolvedFieldComponentOptions): string {
  return `import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export type ${strings.classify(resolved.name)}Value = string;

@Component({
  selector: '${resolved.selector}',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatFormFieldModule, MatInputModule],
  templateUrl: './${resolved.name}.html',
})
export class ${resolved.className} implements ControlValueAccessor {
  /** Typed public API for the field presentation and validation message. */
  readonly label = input<string>('');
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly hint = input<string>('');
  readonly placeholder = input<string>('');
  readonly errorMessage = input<string>('This field is invalid.');

  protected readonly value = signal<${strings.classify(resolved.name)}Value>('');
  protected readonly controlDisabled = computed(() => this.disabled() || this.formDisabled());
  protected readonly showError = computed(() => {
    const control = this.ngControl;
    return !!control?.invalid && (!!control.touched || !!control.dirty);
  });
  protected readonly kind = '${resolved.kind}';

  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly formDisabled = signal(false);
  private onChange: (value: ${strings.classify(resolved.name)}Value) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  writeValue(value: ${strings.classify(resolved.name)}Value | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: ${strings.classify(resolved.name)}Value) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  protected updateValue(event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.value.set(value);
    this.onChange(value);
  }

  protected markTouched(): void {
    this.onTouched();
  }
}
`;
}

function templateSource(resolved: ResolvedFieldComponentOptions): string {
  const nativeControl =
    resolved.kind === 'textarea'
      ? `<textarea
  matInput
  [disabled]="controlDisabled()"
  [placeholder]="placeholder()"
  [required]="required()"
  [value]="value()"
  [attr.aria-invalid]="showError() ? 'true' : null"
  (blur)="markTouched()"
  (input)="updateValue($event)"
></textarea>`
      : `<input
  matInput
  [type]="kind"
  [disabled]="controlDisabled()"
  [placeholder]="placeholder()"
  [required]="required()"
  [value]="value()"
  [attr.aria-invalid]="showError() ? 'true' : null"
  (blur)="markTouched()"
  (input)="updateValue($event)"
/>`;

  return `<mat-form-field>
  <mat-label>{{ label() }}</mat-label>
  ${nativeControl.split('\n').join('\n  ')}
  @if (hint()) {
    <mat-hint>{{ hint() }}</mat-hint>
  }
  @if (showError()) {
    <mat-error>{{ errorMessage() }}</mat-error>
  }
</mat-form-field>
`;
}

function normalizeWorkspacePath(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/^\.\//, '');
}

function isWithin(candidate: string, root: string): boolean {
  return candidate === root || candidate.startsWith(`${root}/`);
}
