import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatSortModule, type Sort, type SortDirection } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

/** A column the host supplies together with the rows; the document declares none. */
export interface OrdersTableColumn<TRow> {
  /** Row property shown in the cell and sent to the host as the sort key. */
  readonly key: keyof TRow & string;
  /** Header text. */
  readonly label: string;
  /** Sorting is offered for every column unless this is `false`. */
  readonly sortable?: boolean;
}

/** A page request: the Material page event plus the Django REST framework `limit` and `offset`. */
export interface OrdersTablePage {
  readonly pageIndex: number;
  readonly pageSize: number;
  readonly limit: number;
  readonly offset: number;
}

/** The Django REST framework pagination response; pass `count` as `totalRows`. */
export interface OrdersTableDrfPage<TRow> {
  readonly count: number;
  readonly next: string | null;
  readonly previous: string | null;
  readonly results: readonly TRow[];
}

/** Query parameters of a Django REST framework `LimitOffsetPagination` request. */
export function ordersTablePageQuery(page: OrdersTablePage): { limit: number; offset: number } {
  return { limit: page.limit, offset: page.offset };
}

/** Django REST framework `ordering` value of a sort: `-key` for descending, `undefined` when unsorted. */
export function ordersTableOrdering(sort: Sort): string | undefined {
  if (!sort.active || !sort.direction) {
    return undefined;
  }
  return sort.direction === 'desc' ? `-${sort.active}` : sort.active;
}

/**
 * Table compiled from the OpenUI `table` element "orders".
 *
 * The host supplies `columns` and `rows` and performs the declared operations:
 * this component never sorts, filters or pages the rows itself. After a
 * sort or a filter the page index returns to 0.
 *
 * ```html
 * <app-orders-table
 *   [columns]="columns"
 *   [rows]="rows"
 *   [totalRows]="count"
 *   (sorted)="sortOrders($event)"
 *   (filtered)="filterOrders($event)"
 *   (paginated)="paginateOrders($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-orders-table',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatPaginatorModule, MatSortModule, MatTableModule],
  templateUrl: './orders-table.html',
  styleUrl: './orders-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersTableComponent<TRow extends object = Record<string, unknown>> {
  /** Column definitions, supplied by the host together with the rows. */
  readonly columns = input.required<readonly OrdersTableColumn<TRow>[]>();
  /** The rows to show; with paging, the current page only. */
  readonly rows = input<readonly TRow[]>([]);
  /** Accessible name of the scrollable table region. */
  readonly ariaLabel = input('Orders table');
  /** Text of the table caption; no caption is rendered while it is empty. */
  readonly caption = input('');
  /** Key of the column currently sorted by the host. */
  readonly sortActive = input('');
  /** Direction of the current sort. */
  readonly sortDirection = input<SortDirection>('');
  /** Label of the filter field. */
  readonly filterLabel = input('Filter');
  /** Filter text the host currently applies. */
  readonly filterText = input('');
  /** Milliseconds to wait after the last keystroke before `filtered` is emitted. */
  readonly filterDebounce = input(300);
  /** Total number of rows on the server (for example the DRF `count`); defaults to the length of `rows`. */
  readonly totalRows = input<number | null>(null);
  /** Zero-based index of the current page; two-way bindable. */
  readonly pageIndex = model(0);
  /** Number of rows per page; two-way bindable. */
  readonly pageSize = model(10);
  /** Page sizes the user can choose. */
  readonly pageSizeOptions = input<readonly number[]>([5, 10, 25, 100]);

  /** Emits the new sort; the document binds it to `sortOrders($event)`. */
  readonly sorted = output<Sort>();
  /** Emits the new filter text; the document binds it to `filterOrders($event)`. */
  readonly filtered = output<string>();
  /** Emits the requested page; the document binds it to `paginateOrders($event)`. */
  readonly paginated = output<OrdersTablePage>();

  protected readonly columnKeys = computed(() => this.columns().map((column) => column.key));
  protected readonly length = computed(() => this.totalRows() ?? this.rows().length);

  private filterTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.filterTimer));
  }

  protected onSort(sort: Sort): void {
    this.pageIndex.set(0);
    this.sorted.emit(sort);
  }

  protected onFilter(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => {
      this.pageIndex.set(0);
      this.filtered.emit(text);
    }, this.filterDebounce());
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.paginated.emit({
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
      limit: event.pageSize,
      offset: event.pageIndex * event.pageSize,
    });
  }

  protected isSortable(column: OrdersTableColumn<TRow>): boolean {
    return column.sortable !== false;
  }
}
