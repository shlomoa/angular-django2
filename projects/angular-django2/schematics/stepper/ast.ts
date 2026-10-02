/**
 * OpenUI stepper vocabulary (`widgets/stepper`, OpenUI 0.12.0) and its decoder.
 *
 * A `Stepper` node compiles into a standalone OnPush Angular Material stepper.
 * Its attributes decode as follows (typed values are unquoted strings, enum
 * and text values are quoted literals, events are `null` markers):
 *
 * | OpenUI attribute           | Value                       | Generated                                       |
 * | :------------------------- | :-------------------------- | :---------------------------------------------- |
 * | `uses.selectedIndex`       | integer, `"1"`              | `selectedIndex` model, initial value            |
 * | `uses.linear`              | boolean, `"true"`           | `linear` input, initial value                   |
 * | `uses.orientation`         | enum, `"\"vertical\""`      | `orientation` input, initial value              |
 * | `uses.branching`           | boolean                     | rejected: not supported in this version         |
 * | `produces.selectionChange` | `null` marker               | `selectionChange` output                        |
 * | `produces.complete`        | `null` marker               | `complete` output and a Finish button           |
 *
 * The only child type is `step` (1..n). The catalog declares no attribute for
 * `step`; the schematic reads two extensions, `uses.label` and `uses.optional`.
 *
 * @internal
 */
import { strings } from '@angular-devkit/core';
import { SchematicsException } from '@angular-devkit/schematics';
import type { OpenUiElement } from '@shlomoa/openui-spec';

import {
  assertAstAttributes,
  astNodeSubject,
  readAstBoolean,
  readAstNumber,
  readAstString,
} from '../utility/ast-compiler';

/** OpenUI catalog type compiled by the stepper schematic. */
export const STEPPER_AST_TYPE = 'Stepper';

/** OpenUI catalog type of a stepper's only child. */
export const STEP_AST_TYPE = 'step';

/** Attribute keys compiled on `Stepper` nodes; the catalog declares all of them. */
export const STEPPER_ATTRIBUTES = {
  selectedIndex: 'uses.selectedIndex',
  linear: 'uses.linear',
  orientation: 'uses.orientation',
  selectionChange: 'produces.selectionChange',
  complete: 'produces.complete',
} as const;

/** Attribute the catalog declares for `Stepper` but this version does not compile. */
export const STEPPER_BRANCHING_ATTRIBUTE = 'uses.branching';

/**
 * Attribute keys read on `step` nodes. The catalog declares none, so both are
 * `angular-django2` extensions (mapping § 1.3).
 */
export const STEP_ATTRIBUTES = {
  label: 'uses.label',
  optional: 'uses.optional',
} as const;

/** Values of the `uses.orientation` enum. */
export const STEPPER_ORIENTATIONS = ['horizontal', 'vertical'] as const;

/** Direction in which the steps are shown. */
export type StepperOrientation = (typeof STEPPER_ORIENTATIONS)[number];

/** One decoded `step` child. */
export interface StepAstOptions {
  /** The step node as written; its children are the step content. */
  readonly node: OpenUiElement;
  /** Kebab-case id, used to name the step's template sections. */
  readonly name: string;
  /** Text of the step header. */
  readonly label: string;
  /** Whether the step may be skipped in a linear stepper. */
  readonly optional: boolean;
  /** Diagnostic subject `<document>#<id>`. */
  readonly subject: string;
}

/** A decoded `Stepper` node. */
export interface StepperAstOptions {
  /** Zero-based index of the initially selected step. */
  readonly selectedIndex: number;
  /** Whether a step must be completed before the next one opens. */
  readonly linear: boolean;
  /** Direction in which the steps are shown. */
  readonly orientation: StepperOrientation;
  /** Whether the node declares `produces.selectionChange`. */
  readonly selectionChange: boolean;
  /** Whether the node declares `produces.complete`. */
  readonly complete: boolean;
  /** The ordered steps. */
  readonly steps: readonly StepAstOptions[];
}

/**
 * Decode a `Stepper` node. All checks run here, before any file is written.
 *
 * @param documentPath Workspace-relative path of the document (for diagnostics).
 * @throws SchematicsException for `uses.branching`, unsupported attributes or
 *   child types, invalid values, or a stepper without steps.
 */
export function stepperFromAst(node: OpenUiElement, documentPath: string): StepperAstOptions {
  const subject = astNodeSubject(documentPath, node);
  if (node.type !== STEPPER_AST_TYPE) {
    throw new SchematicsException(
      `OpenUI node "${subject}" has type "${node.type}", but this schematic compiles "${STEPPER_AST_TYPE}".`,
    );
  }
  if (STEPPER_BRANCHING_ATTRIBUTE in (node.attrs ?? {})) {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${STEPPER_BRANCHING_ATTRIBUTE} is not supported by the stepper ` +
        'schematic. Steps always follow one another in document order; remove the attribute.',
    );
  }
  assertAstAttributes(node, Object.values(STEPPER_ATTRIBUTES), subject);

  const steps = (node.children ?? []).map((child) => stepFromAst(child, documentPath));
  if (steps.length === 0) {
    throw new SchematicsException(
      `OpenUI node "${subject}" has no steps. A ${STEPPER_AST_TYPE} needs at least one "${STEP_AST_TYPE}" child.`,
    );
  }

  const selectedIndex = readSelectedIndex(node, steps.length, subject);
  const orientation = readOrientation(node, subject);

  return {
    selectedIndex,
    linear: readAstBoolean(node, STEPPER_ATTRIBUTES.linear, subject) ?? false,
    orientation,
    selectionChange: readEventMarker(node, STEPPER_ATTRIBUTES.selectionChange, subject),
    complete: readEventMarker(node, STEPPER_ATTRIBUTES.complete, subject),
    steps,
  };
}

function stepFromAst(child: OpenUiElement, documentPath: string): StepAstOptions {
  const subject = astNodeSubject(documentPath, child);
  if (child.type !== STEP_AST_TYPE) {
    throw new SchematicsException(
      `OpenUI node "${subject}" has type "${child.type}", but a ${STEPPER_AST_TYPE} may contain only ` +
        `"${STEP_AST_TYPE}" children.`,
    );
  }
  assertAstAttributes(child, Object.values(STEP_ATTRIBUTES), subject);

  const label = readAstString(child, STEP_ATTRIBUTES.label, subject);
  if (label !== undefined && label.trim() === '') {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${STEP_ATTRIBUTES.label} must not be empty.`,
    );
  }

  return {
    node: child,
    name: strings.dasherize(child.id),
    label: label ?? defaultStepLabel(child.id),
    optional: readAstBoolean(child, STEP_ATTRIBUTES.optional, subject) ?? false,
    subject,
  };
}

/** Header text of a step without `uses.label`: the id as words (`shippingAddress` is `Shipping address`). */
function defaultStepLabel(id: string): string {
  return strings.capitalize(strings.dasherize(id).replace(/-/g, ' '));
}

function readSelectedIndex(node: OpenUiElement, stepCount: number, subject: string): number {
  const index = readAstNumber(node, STEPPER_ATTRIBUTES.selectedIndex, subject);
  if (index === undefined) {
    return 0;
  }
  if (!Number.isInteger(index) || index < 0 || index >= stepCount) {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${STEPPER_ATTRIBUTES.selectedIndex} must be an integer from 0 to ` +
        `${stepCount - 1} (the position of one of its ${stepCount} step(s)), not ${index}.`,
    );
  }

  return index;
}

function readOrientation(node: OpenUiElement, subject: string): StepperOrientation {
  const orientation = readAstString(node, STEPPER_ATTRIBUTES.orientation, subject);
  if (orientation === undefined) {
    return 'horizontal';
  }
  if (!(STEPPER_ORIENTATIONS as readonly string[]).includes(orientation)) {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${STEPPER_ATTRIBUTES.orientation}="${orientation}" is not supported. ` +
        `Supported orientations: ${STEPPER_ORIENTATIONS.join(', ')}.`,
    );
  }

  return orientation as StepperOrientation;
}

/** A Produces attribute is a `null` marker: present means the output is generated. */
function readEventMarker(node: OpenUiElement, key: string, subject: string): boolean {
  if (!(key in (node.attrs ?? {}))) {
    return false;
  }
  if (node.attrs?.[key] !== null) {
    throw new SchematicsException(`OpenUI node "${subject}": ${key} must be null when present.`);
  }

  return true;
}
