/**
 * OpenUI dialog vocabulary (`widgets/dialog`, openui-spec 0.12.0), read by the
 * `dialog` schematic.
 *
 * A `dialog` node compiles into one standalone OnPush component that opens an
 * Angular Material dialog (`MatDialog`) from its own template:
 *
 * | OpenUI                   | Generated                                                       |
 * | :----------------------- | :-------------------------------------------------------------- |
 * | `uses.open`              | `open` model signal, default from the node (`false`)            |
 * | `uses.modal`             | `modal` input signal, default from the node (`true`)            |
 * | `produces.close`         | `closed` output: the dialog closed without being dismissed      |
 * | `produces.cancel`        | `cancelled` output: Escape or a backdrop click dismissed it     |
 * | `header` (title)         | `<h2 mat-dialog-title>` and the `header` section                |
 * | `section` (content)      | `<mat-dialog-content>` and the `children` section               |
 * | `footer` (actions)       | `<mat-dialog-actions>` and the `actions` section                |
 *
 * The regions are the `header` / `content` / `actions` slots of the `component`
 * composition, so their children are compiled and embedded the same way.
 *
 * @internal
 */
import { SchematicsException } from '@angular-devkit/schematics';
import type { OpenUiDocument, OpenUiElement } from '@shlomoa/openui-spec';

import { AST_SLOT_ATTRIBUTE } from '../embed-component/compose';
import {
  assertAstAttributes,
  astNodeSubject,
  createAstNodeResolver,
  readAstBoolean,
  readAstString,
} from '../utility/ast-compiler';

/** OpenUI catalog type compiled by the dialog schematic (the instance type of `widgets/dialog`). */
export const DIALOG_AST_TYPE = 'dialog';

/** Attribute keys the catalog declares for `dialog`. */
export const DIALOG_ATTRIBUTES = {
  open: 'uses.open',
  modal: 'uses.modal',
  close: 'produces.close',
  cancel: 'produces.cancel',
} as const;

/** Child types of the three ordered regions of a dialog: title, content, actions. */
export const DIALOG_REGION_AST_TYPES = ['header', 'section', 'footer'] as const;

/**
 * Attribute keys understood on the title region. The catalog declares none for
 * `header`; `uses.title` is an `angular-django2` extension.
 */
export const DIALOG_TITLE_ATTRIBUTES = { title: 'uses.title' } as const;

/** OpenUI catalog type of the Modal overlay behavior, which this schematic does not compile. */
export const MODAL_OVERLAY_AST_TYPE = 'ModalOverlay';

type DialogRegionType = (typeof DIALOG_REGION_AST_TYPES)[number];

/** One region of a dialog and the template section that hosts its children. */
export interface DialogRegion {
  readonly node: OpenUiElement;
  /** Template section name (see `slotSection`). */
  readonly section: 'header' | 'children' | 'actions';
}

/** What a `dialog` node describes. */
export interface DialogAstOptions {
  /** `uses.open`: initial value of the `open` model. */
  readonly open: boolean;
  /** `uses.modal`: initial value of the `modal` input. */
  readonly modal: boolean;
  /** `produces.close` is present: generate the `closed` output. */
  readonly close: boolean;
  /** `produces.cancel` is present: generate the `cancelled` output. */
  readonly cancel: boolean;
  /** Title text of the title region (`uses.title`). */
  readonly title: string | undefined;
  /** The title region exists (it may have no text and only children). */
  readonly hasTitleRegion: boolean;
  /** The actions region exists. */
  readonly hasActionsRegion: boolean;
  /** Regions in document order, each with the section that hosts its children. */
  readonly regions: readonly DialogRegion[];
}

const REGION_SECTIONS: Record<DialogRegionType, DialogRegion['section']> = {
  header: 'header',
  section: 'children',
  footer: 'actions',
};

/**
 * Decode a `dialog` node. Everything the compiler does not understand is
 * rejected, never ignored.
 *
 * @throws SchematicsException for unsupported attributes, children that break the
 * ordered title, content, actions model, a `uses.slot` on a region child, or a
 * Modal overlay behavior targeting the dialog.
 */
export function dialogOptionsFromAst(
  document: OpenUiDocument,
  node: OpenUiElement,
  documentPath: string,
): DialogAstOptions {
  const subject = astNodeSubject(documentPath, node);
  assertAstAttributes(node, Object.values(DIALOG_ATTRIBUTES), subject);
  assertNoModalOverlay(document, node, documentPath);

  const regions = regionsFromAst(node, documentPath);
  const titleRegion = regions.find((region) => region.node.type === 'header')?.node;

  return {
    open: readAstBoolean(node, DIALOG_ATTRIBUTES.open, subject) ?? false,
    modal: readAstBoolean(node, DIALOG_ATTRIBUTES.modal, subject) ?? true,
    close: readMarker(node, DIALOG_ATTRIBUTES.close, subject),
    cancel: readMarker(node, DIALOG_ATTRIBUTES.cancel, subject),
    title: titleRegion && readTitle(titleRegion, astNodeSubject(documentPath, titleRegion)),
    hasTitleRegion: titleRegion !== undefined,
    hasActionsRegion: regions.some((region) => region.node.type === 'footer'),
    regions,
  };
}

/**
 * The regions of a dialog in document order: at most one `header`, exactly one
 * `section` and at most one `footer`, in that order.
 */
function regionsFromAst(node: OpenUiElement, documentPath: string): DialogRegion[] {
  const subject = astNodeSubject(documentPath, node);
  const regions: DialogRegion[] = [];
  let previous = -1;

  for (const child of node.children ?? []) {
    const childSubject = astNodeSubject(documentPath, child);
    const rank = DIALOG_REGION_AST_TYPES.indexOf(child.type as DialogRegionType);
    if (rank === -1) {
      throw new SchematicsException(
        `OpenUI node "${childSubject}" has type "${child.type}", which is not a dialog region. ` +
          `A dialog owns the ordered regions ${DIALOG_REGION_AST_TYPES.join(', ')} (title, content, actions).`,
      );
    }
    if (rank <= previous) {
      throw new SchematicsException(
        `OpenUI node "${childSubject}" (${child.type}) is ${rank === previous ? 'a second' : 'out of order'} ` +
          `region of dialog "${subject}". The regions follow the sequence ` +
          `${DIALOG_REGION_AST_TYPES.join(' -> ')}, each at most once.`,
      );
    }
    previous = rank;

    assertAstAttributes(
      child,
      child.type === 'header' ? Object.values(DIALOG_TITLE_ATTRIBUTES) : [],
      childSubject,
    );
    for (const grandChild of child.children ?? []) {
      if (grandChild.attrs !== undefined && AST_SLOT_ATTRIBUTE in grandChild.attrs) {
        throw new SchematicsException(
          `OpenUI node "${astNodeSubject(documentPath, grandChild)}" is inside the ${child.type} region ` +
            `"${childSubject}" of a dialog and cannot choose a ${AST_SLOT_ATTRIBUTE}; the region decides its slot.`,
        );
      }
    }
    regions.push({ node: child, section: REGION_SECTIONS[child.type as DialogRegionType] });
  }

  if (!regions.some((region) => region.node.type === 'section')) {
    throw new SchematicsException(
      `OpenUI node "${subject}" needs exactly one "section" child (the content region).`,
    );
  }

  return regions;
}

function readTitle(region: OpenUiElement, subject: string): string | undefined {
  const title = readAstString(region, DIALOG_TITLE_ATTRIBUTES.title, subject);
  if (title !== undefined && title.trim() === '') {
    throw new SchematicsException(
      `OpenUI node "${subject}": attribute "${DIALOG_TITLE_ATTRIBUTES.title}" must not be empty.`,
    );
  }
  return title;
}

/**
 * A `produces.` attribute is a `null` marker, so document data never becomes an
 * unchecked Angular expression; the schematic generates the output itself.
 */
function readMarker(node: OpenUiElement, key: string, subject: string): boolean {
  if (node.attrs === undefined || !(key in node.attrs)) {
    return false;
  }
  if (node.attrs[key] !== null) {
    throw new SchematicsException(
      `OpenUI node "${subject}": ${key} must be null when present; the schematic generates the output.`,
    );
  }
  return true;
}

/**
 * Modal focus and dismissal are built in (`uses.modal`, Escape, `produces.cancel`).
 * A Modal overlay behavior that targets the dialog would configure more than the
 * dialog scope requires, so it is rejected rather than ignored.
 */
function assertNoModalOverlay(
  document: OpenUiDocument,
  dialog: OpenUiElement,
  documentPath: string,
): void {
  for (const candidate of createAstNodeResolver(document).walk()) {
    if (candidate.type !== MODAL_OVERLAY_AST_TYPE) {
      continue;
    }
    const subject = astNodeSubject(documentPath, candidate);
    if (readAstString(candidate, 'uses.target', subject) === dialog.id) {
      throw new SchematicsException(
        `OpenUI node "${subject}" is a ${MODAL_OVERLAY_AST_TYPE} behavior targeting the dialog "${dialog.id}", ` +
          'which the dialog schematic does not compile (uses.initialFocus, uses.restoreFocus, ' +
          'uses.dismissOnEscape, produces.dismissRequest). Remove it: a modal dialog moves focus in, ' +
          'restores it and dismisses on Escape by itself (uses.modal, produces.cancel).',
      );
    }
  }
}
