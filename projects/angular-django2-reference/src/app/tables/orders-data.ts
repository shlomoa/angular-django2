import type { Sort } from '@angular/material/sort';

import type { OrdersTableDrfPage } from './orders-table/orders-table';

/** A row of the demonstration table. */
export interface Order {
  readonly id: number;
  readonly customer: string;
  readonly status: 'Open' | 'Shipped' | 'Cancelled';
  readonly total: number;
}

/** The query parameters a Django REST framework list endpoint reads. */
export interface OrdersQuery {
  readonly search: string;
  readonly ordering: string | undefined;
  readonly limit: number;
  readonly offset: number;
}

const CUSTOMERS = ['Acme Corp', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Stark Industries'];
const STATUSES: readonly Order['status'][] = ['Open', 'Shipped', 'Cancelled'];

/** 47 deterministic orders standing in for the rows of a Django table. */
export const ORDERS: readonly Order[] = Array.from({ length: 47 }, (_, index) => ({
  id: 1001 + index,
  customer: CUSTOMERS[index % CUSTOMERS.length],
  status: STATUSES[(index * 7) % STATUSES.length],
  total: 20 + ((index * 37) % 480),
}));

/**
 * Answer a list request the way a Django REST framework endpoint with
 * `SearchFilter`, `OrderingFilter` and `LimitOffsetPagination` does.
 */
export function queryOrders(query: OrdersQuery): OrdersTableDrfPage<Order> {
  const search = query.search.trim().toLowerCase();
  const matching = ORDERS.filter(
    (order) =>
      search === '' ||
      [String(order.id), order.customer, order.status].some((text) =>
        text.toLowerCase().includes(search),
      ),
  );

  const descending = query.ordering?.startsWith('-') ?? false;
  const key = query.ordering?.replace(/^-/, '') as keyof Order | undefined;
  const ordered =
    key === undefined
      ? matching
      : [...matching].sort((left, right) => {
          const result = compareValues(left[key], right[key]);
          return descending ? -result : result;
        });

  const end = query.offset + query.limit;
  return {
    count: ordered.length,
    next: end < ordered.length ? `?limit=${query.limit}&offset=${end}` : null,
    previous:
      query.offset > 0
        ? `?limit=${query.limit}&offset=${Math.max(0, query.offset - query.limit)}`
        : null,
    results: ordered.slice(query.offset, end),
  };
}

/** The sort the table starts with: none. */
export const NO_SORT: Sort = { active: '', direction: '' };

function compareValues(left: string | number, right: string | number): number {
  return typeof left === 'number' && typeof right === 'number'
    ? left - right
    : String(left).localeCompare(String(right));
}
