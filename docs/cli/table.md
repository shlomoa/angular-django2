# table

Compile an [OpenUI](https://github.com/shlomoa/openui-spec) `table` element
(scope `widgets/table`) into a standalone, `OnPush` Angular Material table
component with optional sorting, filtering and paging.

```bash
ng generate angular-django2:table orders \
  --document=src/app/orders.openui.json \
  --node-id=orders \
  --project=my-app \
  --path=src/app/shared/tables
```

`table` has no flag-only form: the table is always compiled from a document.

- `--document=<path>` — workspace-relative OpenUI JSON document. Required.
- `--node-id=<id>` — the `table` element to compile; defaults to the first
  `table` element of the document.
- `name` (first argument) — kebab-case name of the component; defaults to the
  dasherized node id.
- `--path` — defaults to `src/app/shared/tables`; it must stay within the
  selected application's `sourceRoot`.
- `--project` — select it when the workspace has more than one application.

The schematic requires `@angular/material` and `@angular/cdk` before it writes
anything, and it never overwrites: a rerun that finds existing output fails.

## Generated output

For the name `orders`, the schematic writes three files to
`<path>/orders-table/`:

| File                | Content                                                                                                                                     |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------ |
| `orders-table.ts`   | `OrdersTableComponent` (`app-orders-table`), standalone and `OnPush`, with its column, page and DRF types and two helper functions          |
| `orders-table.html` | The Material table: a filter field, a scrollable region with the `mat-table`, and a `mat-paginator`, for the features the document declares |
| `orders-table.scss` | A full-width table in a region that scrolls horizontally and vertically, with a sticky header row                                           |

## OpenUI `table` elements

| OpenUI                  | Generated                                                                                         |
| :---------------------- | :------------------------------------------------------------------------------------------------ |
| `table`                 | `mat-table` in a keyboard-reachable region (`role="region"`, `tabindex="0"`, `aria-label`)        |
| `caption` (at most one) | a `<caption>` bound to the `caption` input; nothing is rendered while the text is empty           |
| `thead` (at most one)   | a sticky header row (`<th scope="col">`) built from the host's columns; without it, no header row |
| `tr` (any number)       | the body rows, rendered from the host's `rows`                                                    |
| `behaves.sort`          | `matSort` and `mat-sort-header` on the header cells, the `sorted` output and the `onSort` handler |
| `behaves.filter`        | a debounced filter field, the `filtered` output and the `onFilter` handler                        |
| `behaves.paginate`      | a `mat-paginator`, the `paginated` output and the `onPage` handler                                |

```json
{
  "id": "orders",
  "type": "table",
  "attrs": {
    "behaves.sort": "sortOrders($event)",
    "behaves.filter": "filterOrders($event)",
    "behaves.paginate": "paginateOrders($event)"
  },
  "children": [
    { "id": "ordersCaption", "type": "caption" },
    { "id": "ordersHeader", "type": "thead" },
    { "id": "ordersRow", "type": "tr" }
  ]
}
```

All three attributes are declared by the catalog; `table` adds no extension
attribute. A Behaves value is an unquoted target-language expression bound to a
host handler. The schematic accepts a (dotted) call with the event, such as
`sortOrders($event)` or `orders.sort($event)`, and rejects anything else. An
attribute written as `null` declares the behaviour without naming a handler. An
absent behaviour generates nothing: no `matSort`, no filter field, no paginator.

A table that declares `behaves.sort` must also have a `thead`, because sorting
is done from the header cells.

### Columns come from the host

The contract declares no column attribute, and `th` and `td` are not catalog
types, so the document cannot describe a column or a cell. The component takes
its column definitions together with the rows from the host:

```ts
readonly columns: readonly OrdersTableColumn<Order>[] = [
  { key: 'id', label: 'Order' },
  { key: 'customer', label: 'Customer' },
  { key: 'total', label: 'Total', sortable: false },
];
```

A `tr` carries no content in the contract. It is validated, and the body rows
are rendered from the host `rows`; their number does not depend on the number of
`tr` elements.

### Unsupported input is rejected

The schematic fails, naming the node, for

- an attribute other than the three behaviours, on `table` and on `caption`,
  `thead` and `tr` (a plain `sort` key and any `uses.*` key included);
- a child of `table` other than `caption`, `thead` and `tr`, and any child of
  `caption`, `thead` and `tr` (`th` and `td` are reported by the validator as
  `catalog/unknown-type`);
- more than one `caption` or more than one `thead`;
- a Behaves value that is not a host handler call with `$event`;
- `behaves.sort` without a `thead`.

## Using the component

The host supplies `columns` and `rows`, and performs every operation the
document declares: the component never sorts, filters or pages the rows. It
emits the matching output, and the host binds it with the expression of the
document.

```html
<app-orders-table
  caption="Orders"
  [columns]="columns"
  [rows]="response().results"
  [totalRows]="response().count"
  [sortActive]="sort().active"
  [sortDirection]="sort().direction"
  [pageIndex]="page().pageIndex"
  [pageSize]="page().pageSize"
  (sorted)="sortOrders($event)"
  (filtered)="filterOrders($event)"
  (paginated)="paginateOrders($event)"
/>
```

| Input                                                   | When generated     | Meaning                                                                    |
| :------------------------------------------------------ | :----------------- | :------------------------------------------------------------------------- |
| `columns` (required), `rows`, `ariaLabel`               | always             | Host-supplied columns and rows; the accessible name of the table region    |
| `caption`                                               | `caption` child    | Caption text                                                               |
| `sortActive`, `sortDirection`                           | `behaves.sort`     | The sort the host currently applies                                        |
| `filterLabel`, `filterText`, `filterDebounce`           | `behaves.filter`   | Filter field label, current text, and the delay (300 ms) before `filtered` |
| `totalRows`, `pageIndex`, `pageSize`, `pageSizeOptions` | `behaves.paginate` | Server row count (defaults to `rows.length`), current page, page sizes     |

| Output      | When generated     | Payload                                  |
| :---------- | :----------------- | :--------------------------------------- |
| `sorted`    | `behaves.sort`     | Material `Sort` (`active`, `direction`)  |
| `filtered`  | `behaves.filter`   | The filter text                          |
| `paginated` | `behaves.paginate` | `{ pageIndex, pageSize, limit, offset }` |

A sort or a filter returns the component's page index to 0; the host resets its
own page the same way (`pageIndex` and `pageSize` are `model` inputs, so they
can also be bound two-way).

### Django REST framework

For the name `orders`, the generated file also exports

- with `behaves.paginate`: `OrdersTableDrfPage<TRow>`, the
  `{ count, next, previous, results }` response shape (pass `count` as
  `totalRows` and `results` as `rows`), and `ordersTablePageQuery(page)`, the
  `limit` and `offset` query parameters of `LimitOffsetPagination`;
- with `behaves.sort`: `ordersTableOrdering(sort)`, the `ordering` value
  (`total`, `-total`, or `undefined` when unsorted).

The reference application shows the component hosted this way, at `/table`
(`projects/angular-django2-reference/src/app/tables`), against an in-memory
stand-in for a Django list endpoint.
