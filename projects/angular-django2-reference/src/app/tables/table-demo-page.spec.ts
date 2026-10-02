import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ORDERS, queryOrders } from './orders-data';
import { TableDemoPage } from './table-demo-page';

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  expect(element, `Expected to find ${selector}`).not.toBeNull();

  return element as T;
}

function bodyRows(root: ParentNode): string[][] {
  return [...root.querySelectorAll('tbody tr')].map((row) =>
    [...row.querySelectorAll('td')].map((cell) => cell.textContent?.trim() ?? ''),
  );
}

async function renderPage(): Promise<{ compiled: HTMLElement; settle: () => Promise<void> }> {
  const fixture = TestBed.createComponent(TableDemoPage);
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  await settle();

  return { compiled: fixture.nativeElement as HTMLElement, settle };
}

describe('TableDemoPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableDemoPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the host-supplied columns and the first page of rows', async () => {
    const { compiled } = await renderPage();
    const table = requireElement<HTMLTableElement>(compiled, 'table');

    expect(table.querySelector('caption')?.textContent).toContain('Orders');
    expect([...table.querySelectorAll('thead th')].map((cell) => cell.textContent?.trim())).toEqual(
      ['Order', 'Customer', 'Status', 'Total (USD)'],
    );
    expect(bodyRows(compiled).length).toBe(5);
    expect(bodyRows(compiled)[0][0]).toBe(String(ORDERS[0].id));
    expect(
      requireElement<HTMLElement>(compiled, '[role="region"]').getAttribute('aria-label'),
    ).toBe('Orders table');
    expect(requireElement<HTMLElement>(compiled, '[role="region"]').tabIndex).toBe(0);
    expect(compiled.querySelector('.mat-mdc-paginator-range-label')?.textContent).toContain(
      `1 – 5 of ${ORDERS.length}`,
    );
  });

  it('hands a sort to the host, which returns the sorted rows', async () => {
    const { compiled, settle } = await renderPage();
    const totalHeader = [...compiled.querySelectorAll<HTMLElement>('thead th')].find((cell) =>
      cell.textContent?.includes('Total'),
    ) as HTMLElement;

    totalHeader.click();
    await settle();
    const ascending = bodyRows(compiled).map((row) => Number(row[3]));
    expect(totalHeader.getAttribute('aria-sort')).toBe('ascending');
    expect(ascending).toEqual([...ascending].sort((left, right) => left - right));
    expect(ascending[0]).toBe(
      queryOrders({ search: '', ordering: 'total', limit: 5, offset: 0 }).results[0].total,
    );

    totalHeader.click();
    await settle();
    expect(totalHeader.getAttribute('aria-sort')).toBe('descending');
    expect(bodyRows(compiled)[0][3]).toBe(
      String(queryOrders({ search: '', ordering: '-total', limit: 5, offset: 0 }).results[0].total),
    );
  });

  it('hands a page change to the host and shows the next rows', async () => {
    const { compiled, settle } = await renderPage();

    requireElement<HTMLButtonElement>(compiled, '.mat-mdc-paginator-navigation-next').click();
    await settle();

    expect(bodyRows(compiled)[0][0]).toBe(String(ORDERS[5].id));
    expect(compiled.querySelector('.mat-mdc-paginator-range-label')?.textContent).toContain(
      `6 – 10 of ${ORDERS.length}`,
    );
  });

  it('hands the filter text to the host after the debounce and returns to the first page', async () => {
    vi.useFakeTimers();
    try {
      const { compiled, settle } = await renderPage();
      requireElement<HTMLButtonElement>(compiled, '.mat-mdc-paginator-navigation-next').click();
      await settle();

      const input = requireElement<HTMLInputElement>(compiled, 'input[type="search"]');
      input.value = 'globex';
      input.dispatchEvent(new Event('input'));
      await vi.advanceTimersByTimeAsync(299);
      await settle();
      expect(bodyRows(compiled)[0][0]).toBe(String(ORDERS[5].id));

      await vi.advanceTimersByTimeAsync(1);
      await settle();
      const rows = bodyRows(compiled);
      const expected = queryOrders({ search: 'globex', ordering: undefined, limit: 5, offset: 0 });
      expect(rows.length).toBe(expected.results.length);
      expect(rows.every((row) => row[1] === 'Globex')).toBe(true);
      expect(compiled.querySelector('.mat-mdc-paginator-range-label')?.textContent).toContain(
        `1 – ${expected.results.length} of ${expected.count}`,
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('queryOrders', () => {
  it('answers like a Django REST framework list endpoint', () => {
    const first = queryOrders({ search: '', ordering: '-id', limit: 10, offset: 0 });
    expect(first.count).toBe(ORDERS.length);
    expect(first.results[0].id).toBe(Math.max(...ORDERS.map((order) => order.id)));
    expect(first.previous).toBeNull();
    expect(first.next).toBe('?limit=10&offset=10');

    const last = queryOrders({ search: '', ordering: undefined, limit: 10, offset: 40 });
    expect(last.results.length).toBe(ORDERS.length - 40);
    expect(last.next).toBeNull();
    expect(last.previous).toBe('?limit=10&offset=30');
  });
});
