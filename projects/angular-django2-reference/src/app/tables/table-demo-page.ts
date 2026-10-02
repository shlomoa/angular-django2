import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import type { Sort } from '@angular/material/sort';

import { BreadcrumbsComponent } from '../shared';
import { NO_SORT, queryOrders, type Order } from './orders-data';
import {
  OrdersTableComponent,
  ordersTableOrdering,
  ordersTablePageQuery,
  type OrdersTableColumn,
  type OrdersTablePage,
} from './orders-table/orders-table';

/**
 * Demonstrates the `table` schematic: `orders-table/` is its unmodified output
 * for `orders.openui.json`. This page is the host: it supplies the columns and
 * the rows and handles the sort, filter and page operations the document
 * declares, as a Django REST framework list endpoint would.
 */
@Component({
  selector: 'app-table-demo-page',
  imports: [BreadcrumbsComponent, OrdersTableComponent],
  templateUrl: './table-demo-page.html',
  styleUrl: './table-demo-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableDemoPage {
  protected readonly columns: readonly OrdersTableColumn<Order>[] = [
    { key: 'id', label: 'Order' },
    { key: 'customer', label: 'Customer' },
    { key: 'status', label: 'Status' },
    { key: 'total', label: 'Total (USD)' },
  ];

  protected readonly sort = signal<Sort>(NO_SORT);
  protected readonly search = signal('');
  protected readonly page = signal({ pageIndex: 0, pageSize: 5 });

  protected readonly response = computed(() => {
    const { pageIndex, pageSize } = this.page();
    return queryOrders({
      search: this.search(),
      ordering: ordersTableOrdering(this.sort()),
      ...ordersTablePageQuery({
        pageIndex,
        pageSize,
        limit: pageSize,
        offset: pageIndex * pageSize,
      }),
    });
  });

  /** Host handler of `behaves.sort`. */
  protected sortOrders(sort: Sort): void {
    this.sort.set(sort);
    this.page.update((page) => ({ ...page, pageIndex: 0 }));
  }

  /** Host handler of `behaves.filter`. */
  protected filterOrders(text: string): void {
    this.search.set(text);
    this.page.update((page) => ({ ...page, pageIndex: 0 }));
  }

  /** Host handler of `behaves.paginate`. */
  protected paginateOrders(page: OrdersTablePage): void {
    this.page.set({ pageIndex: page.pageIndex, pageSize: page.pageSize });
  }
}
