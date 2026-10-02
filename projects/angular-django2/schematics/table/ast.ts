/**
 * Reader for the OpenUI `table` element (scope `widgets/table`).
 *
 * | OpenUI                 | Generated component                                                    |
 * | :--------------------- | :--------------------------------------------------------------------- |
 * | `table`                | `mat-table` in a keyboard-reachable, horizontally scrolling region      |
 * | `caption` (0..1)       | a `<caption>` bound to the `caption` input                             |
 * | `thead` (0..1)         | a sticky header row built from the host-supplied `columns`             |
 * | `tr` (0..n)            | body rows, rendered from the host-supplied `rows`                      |
 * | `behaves.sort`         | `matSort` on the header cells and the `sorted` output                  |
 * | `behaves.filter`       | a filter field and the `filtered` output                               |
 * | `behaves.paginate`     | a `mat-paginator` and the `paginated` output                           |
 *
 * The contract declares no column attribute and no cell types (`th` and `td`
 * are not catalog types), so the first version takes its column definitions
 * together with the rows from the host: nothing in the document describes a
 * column or a cell. A `tr` carries no content in the contract; it is validated
 * and the body is rendered from the host rows.
 *
 * A Behaves value is a target-language expression bound to a host handler,
 * for example `sortOrders($event)`. The generated component emits the matching
 * output and the host binds it with that expression.
 *
 * @internal
 */
import { SchematicsException } from '@angular-devkit/schematics';
import type { OpenUiElement } from '@shlomoa/openui-spec';

import { assertAstAttributes, readAstExpression } from '../utility/ast-compiler';

/** OpenUI catalog type compiled by the table schematic. */
export const TABLE_AST_TYPE = 'table';

/** Attribute keys understood on `table` nodes; all three are declared by the catalog. */
export const TABLE_ATTRIBUTES = {
  sort: 'behaves.sort',
  filter: 'behaves.filter',
  paginate: 'behaves.paginate',
} as const;

/** Child types of a `table` node and how many of each are allowed. */
export const TABLE_CHILD_AST_TYPES = {
  caption: { max: 1 },
  thead: { max: 1 },
  tr: { max: Infinity },
} as const;

/** The three Behaves attributes of a table, as generated outputs. */
export type TableBehaviourName = keyof typeof TABLE_ATTRIBUTES;

/** A behaviour the document declares; `handler` is its host expression, when it has one. */
export interface TableBehaviour {
  readonly handler?: string;
}

/** What the generator needs from a validated `table` node. */
export interface TableDefinition {
  /** Element id of the `table` node. */
  readonly id: string;
  /** `caption` child present. */
  readonly caption: boolean;
  /** `thead` child present. */
  readonly header: boolean;
  /** Number of `tr` children. */
  readonly rowCount: number;
  /** Declared behaviours; an absent behaviour generates nothing. */
  readonly behaviours: Readonly<Partial<Record<TableBehaviourName, TableBehaviour>>>;
}

/**
 * A host handler is a call of a (dotted) function with the event, such as
 * `sortOrders($event)` or `orders.sort($event)`. The expression is
 * target-language text, so only this shape is accepted: it is copied into the
 * generated documentation and is what the host writes in its template.
 */
const HANDLER_PATTERN = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\(\$event\)$/;

/**
 * Validate a `table` node and its children and decode them.
 *
 * @param subject Diagnostic subject (see `astNodeSubject`).
 * @throws SchematicsException for an unsupported type, attribute, child, count or handler.
 */
export function tableDefinitionFromAst(node: OpenUiElement, subject: string): TableDefinition {
  if (node.type !== TABLE_AST_TYPE) {
    throw new SchematicsException(
      `OpenUI node "${subject}" has type "${node.type}"; the table schematic compiles "${TABLE_AST_TYPE}" nodes.`,
    );
  }
  assertAstAttributes(node, Object.values(TABLE_ATTRIBUTES), subject);

  const behaviours: Partial<Record<TableBehaviourName, TableBehaviour>> = {};
  for (const name of Object.keys(TABLE_ATTRIBUTES) as TableBehaviourName[]) {
    const key = TABLE_ATTRIBUTES[name];
    if (node.attrs === undefined || !(key in node.attrs)) {
      continue;
    }
    const handler = readAstExpression(node, key, subject);
    if (handler !== undefined && !HANDLER_PATTERN.test(handler)) {
      throw new SchematicsException(
        `OpenUI node "${subject}": attribute "${key}" must be a host handler call with the event, ` +
          `such as "handle${name[0].toUpperCase()}${name.slice(1)}($event)", not ${JSON.stringify(handler)}.`,
      );
    }
    behaviours[name] = handler === undefined ? {} : { handler };
  }

  const counts = { caption: 0, thead: 0, tr: 0 };
  for (const child of node.children ?? []) {
    if (!Object.hasOwn(TABLE_CHILD_AST_TYPES, child.type)) {
      throw new SchematicsException(
        `OpenUI node "${subject}" has a child "${child.id}" of type "${child.type}", which a table does not support. ` +
          `Supported child types: ${Object.keys(TABLE_CHILD_AST_TYPES).join(', ')}.`,
      );
    }
    const type = child.type as keyof typeof TABLE_CHILD_AST_TYPES;
    counts[type] += 1;
    if (counts[type] > TABLE_CHILD_AST_TYPES[type].max) {
      throw new SchematicsException(
        `OpenUI node "${subject}" has more than ${TABLE_CHILD_AST_TYPES[type].max} "${type}" child; ` +
          `a table has at most ${TABLE_CHILD_AST_TYPES[type].max}.`,
      );
    }
    assertEmptyChild(child, `${subject}/${child.id}`);
  }

  if (behaviours.sort !== undefined && counts.thead === 0) {
    throw new SchematicsException(
      `OpenUI node "${subject}" declares ${TABLE_ATTRIBUTES.sort} but has no "thead" child; ` +
        'sorting is done from the header cells.',
    );
  }

  return {
    id: node.id,
    caption: counts.caption > 0,
    header: counts.thead > 0,
    rowCount: counts.tr,
    behaviours,
  };
}

/** `caption`, `thead` and `tr` declare no attribute and no child in the contract. */
function assertEmptyChild(child: OpenUiElement, subject: string): void {
  assertAstAttributes(child, [], subject);
  if (child.children !== undefined && child.children.length > 0) {
    const types = child.children.map((grandchild) => `"${grandchild.type}"`).join(', ');
    throw new SchematicsException(
      `OpenUI node "${subject}" of type "${child.type}" has child node(s) of type ${types}, ` +
        'which the table schematic does not support: the cells come from the host-supplied columns and rows.',
    );
  }
}
