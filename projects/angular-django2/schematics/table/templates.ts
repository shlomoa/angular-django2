import { strings } from '@angular-devkit/core';
import type { TableDefinition } from './ast';

/** Names derived from the kebab-case component name. */
export interface TableNames {
  /** Kebab-case base name (`orders`). */
  readonly name: string;
  /** File and directory name (`orders-table`). */
  readonly fileName: string;
  /** Element selector (`app-orders-table`). */
  readonly selector: string;
  /** Component class (`OrdersTableComponent`). */
  readonly className: string;
  /** Prefix of the exported types (`OrdersTable`). */
  readonly typePrefix: string;
  /** Prefix of the exported functions (`ordersTable`). */
  readonly functionPrefix: string;
  /** Block (BEM) class of the template (`orders-table`). */
  readonly blockClass: string;
}

export function tableNames(name: string): TableNames {
  const fileName = `${name}-table`;
  return {
    name,
    fileName,
    selector: `app-${fileName}`,
    className: `${strings.classify(fileName)}Component`,
    typePrefix: strings.classify(fileName),
    functionPrefix: strings.camelize(fileName),
    blockClass: fileName,
  };
}

/** Human-readable table name used in accessible labels (`Orders`). */
function displayName(names: TableNames): string {
  return strings.capitalize(strings.dasherize(names.name).replace(/-/g, ' '));
}

/** Quote text as a single-quoted TypeScript string literal. */
function quote(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** The generated standalone OnPush component class and its exported types. */
export function tableComponentSource(definition: TableDefinition, names: TableNames): string {
  const { sort, filter, paginate } = definition.behaviours;
  const hasPaging = paginate !== undefined;
  const type = names.typePrefix;
  const fn = names.functionPrefix;

  const coreImports = ['ChangeDetectionStrategy', 'Component'];
  if (filter !== undefined) {
    coreImports.push('DestroyRef');
  }
  coreImports.push('computed');
  if (filter !== undefined) {
    coreImports.push('inject');
  }
  coreImports.push('input');
  if (hasPaging) {
    coreImports.push('model');
  }
  if (sort !== undefined || filter !== undefined || hasPaging) {
    coreImports.push('output');
  }

  const imports: string[] = [
    `import { ${coreImports.sort(compareImports).join(', ')} } from '@angular/core';`,
  ];
  if (filter !== undefined) {
    imports.push(`import { MatFormFieldModule } from '@angular/material/form-field';`);
    imports.push(`import { MatInputModule } from '@angular/material/input';`);
  }
  if (hasPaging) {
    imports.push(
      `import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';`,
    );
  }
  if (sort !== undefined) {
    imports.push(
      `import { MatSortModule, type Sort, type SortDirection } from '@angular/material/sort';`,
    );
  }
  imports.push(`import { MatTableModule } from '@angular/material/table';`);

  const modules = [
    ...(filter !== undefined ? ['MatFormFieldModule', 'MatInputModule'] : []),
    ...(hasPaging ? ['MatPaginatorModule'] : []),
    ...(sort !== undefined ? ['MatSortModule'] : []),
    'MatTableModule',
  ];

  const lines: string[] = [...imports, ''];

  lines.push(
    `/** A column the host supplies together with the rows; the document declares none. */`,
  );
  lines.push(`export interface ${type}Column<TRow> {`);
  lines.push(
    `  /** Row property shown in the cell${sort ? ' and sent to the host as the sort key' : ''}. */`,
  );
  lines.push(`  readonly key: keyof TRow & string;`);
  lines.push(`  /** Header text. */`);
  lines.push(`  readonly label: string;`);
  if (sort !== undefined) {
    lines.push(`  /** Sorting is offered for every column unless this is \`false\`. */`);
    lines.push(`  readonly sortable?: boolean;`);
  }
  lines.push(`}`);

  if (hasPaging) {
    lines.push('');
    lines.push(
      `/** A page request: the Material page event plus the Django REST framework \`limit\` and \`offset\`. */`,
    );
    lines.push(`export interface ${type}Page {`);
    lines.push(`  readonly pageIndex: number;`);
    lines.push(`  readonly pageSize: number;`);
    lines.push(`  readonly limit: number;`);
    lines.push(`  readonly offset: number;`);
    lines.push(`}`);
    lines.push('');
    lines.push(
      `/** The Django REST framework pagination response; pass \`count\` as \`totalRows\`. */`,
    );
    lines.push(`export interface ${type}DrfPage<TRow> {`);
    lines.push(`  readonly count: number;`);
    lines.push(`  readonly next: string | null;`);
    lines.push(`  readonly previous: string | null;`);
    lines.push(`  readonly results: readonly TRow[];`);
    lines.push(`}`);
    lines.push('');
    lines.push(
      `/** Query parameters of a Django REST framework \`LimitOffsetPagination\` request. */`,
    );
    lines.push(
      `export function ${fn}PageQuery(page: ${type}Page): { limit: number; offset: number } {`,
    );
    lines.push(`  return { limit: page.limit, offset: page.offset };`);
    lines.push(`}`);
  }
  if (sort !== undefined) {
    lines.push('');
    lines.push(
      `/** Django REST framework \`ordering\` value of a sort: \`-key\` for descending, \`undefined\` when unsorted. */`,
    );
    lines.push(`export function ${fn}Ordering(sort: Sort): string | undefined {`);
    lines.push(`  if (!sort.active || !sort.direction) {`);
    lines.push(`    return undefined;`);
    lines.push(`  }`);
    lines.push(`  return sort.direction === 'desc' ? \`-\${sort.active}\` : sort.active;`);
    lines.push(`}`);
  }

  lines.push('');
  lines.push(...componentDocumentation(definition, names));
  lines.push(`@Component({`);
  lines.push(`  selector: '${names.selector}',`);
  lines.push(`  standalone: true,`);
  lines.push(`  imports: [${modules.join(', ')}],`);
  lines.push(`  templateUrl: './${names.fileName}.html',`);
  lines.push(`  styleUrl: './${names.fileName}.scss',`);
  lines.push(`  changeDetection: ChangeDetectionStrategy.OnPush,`);
  lines.push(`})`);
  lines.push(`export class ${names.className}<TRow extends object = Record<string, unknown>> {`);
  lines.push(`  /** Column definitions, supplied by the host together with the rows. */`);
  lines.push(`  readonly columns = input.required<readonly ${type}Column<TRow>[]>();`);
  lines.push(`  /** The rows to show; with paging, the current page only. */`);
  lines.push(`  readonly rows = input<readonly TRow[]>([]);`);
  lines.push(`  /** Accessible name of the scrollable table region. */`);
  lines.push(`  readonly ariaLabel = input(${quote(`${displayName(names)} table`)});`);
  if (definition.caption) {
    lines.push(`  /** Text of the table caption; no caption is rendered while it is empty. */`);
    lines.push(`  readonly caption = input('');`);
  }
  if (sort !== undefined) {
    lines.push(`  /** Key of the column currently sorted by the host. */`);
    lines.push(`  readonly sortActive = input('');`);
    lines.push(`  /** Direction of the current sort. */`);
    lines.push(`  readonly sortDirection = input<SortDirection>('');`);
  }
  if (filter !== undefined) {
    lines.push(`  /** Label of the filter field. */`);
    lines.push(`  readonly filterLabel = input('Filter');`);
    lines.push(`  /** Filter text the host currently applies. */`);
    lines.push(`  readonly filterText = input('');`);
    lines.push(
      `  /** Milliseconds to wait after the last keystroke before \`filtered\` is emitted. */`,
    );
    lines.push(`  readonly filterDebounce = input(300);`);
  }
  if (hasPaging) {
    lines.push(
      `  /** Total number of rows on the server (for example the DRF \`count\`); defaults to the length of \`rows\`. */`,
    );
    lines.push(`  readonly totalRows = input<number | null>(null);`);
    lines.push(`  /** Zero-based index of the current page; two-way bindable. */`);
    lines.push(`  readonly pageIndex = model(0);`);
    lines.push(`  /** Number of rows per page; two-way bindable. */`);
    lines.push(`  readonly pageSize = model(10);`);
    lines.push(`  /** Page sizes the user can choose. */`);
    lines.push(`  readonly pageSizeOptions = input<readonly number[]>([5, 10, 25, 100]);`);
  }

  if (sort !== undefined || filter !== undefined || hasPaging) {
    lines.push('');
  }
  if (sort !== undefined) {
    lines.push(`  /** Emits the new sort${handlerNote(sort.handler)}. */`);
    lines.push(`  readonly sorted = output<Sort>();`);
  }
  if (filter !== undefined) {
    lines.push(`  /** Emits the new filter text${handlerNote(filter.handler)}. */`);
    lines.push(`  readonly filtered = output<string>();`);
  }
  if (hasPaging) {
    lines.push(`  /** Emits the requested page${handlerNote(paginate.handler)}. */`);
    lines.push(`  readonly paginated = output<${type}Page>();`);
  }

  lines.push('');
  lines.push(
    `  protected readonly columnKeys = computed(() => this.columns().map((column) => column.key));`,
  );
  if (hasPaging) {
    lines.push(
      `  protected readonly length = computed(() => this.totalRows() ?? this.rows().length);`,
    );
  }

  if (filter !== undefined) {
    lines.push('');
    lines.push(`  private filterTimer: ReturnType<typeof setTimeout> | undefined;`);
    lines.push('');
    lines.push(`  constructor() {`);
    lines.push(`    inject(DestroyRef).onDestroy(() => clearTimeout(this.filterTimer));`);
    lines.push(`  }`);
  }

  if (sort !== undefined) {
    lines.push('');
    lines.push(`  protected onSort(sort: Sort): void {`);
    if (hasPaging) {
      lines.push(`    this.pageIndex.set(0);`);
    }
    lines.push(`    this.sorted.emit(sort);`);
    lines.push(`  }`);
  }
  if (filter !== undefined) {
    lines.push('');
    lines.push(`  protected onFilter(event: Event): void {`);
    lines.push(`    const text = (event.target as HTMLInputElement).value;`);
    lines.push(`    clearTimeout(this.filterTimer);`);
    lines.push(`    this.filterTimer = setTimeout(() => {`);
    if (hasPaging) {
      lines.push(`      this.pageIndex.set(0);`);
    }
    lines.push(`      this.filtered.emit(text);`);
    lines.push(`    }, this.filterDebounce());`);
    lines.push(`  }`);
  }
  if (hasPaging) {
    lines.push('');
    lines.push(`  protected onPage(event: PageEvent): void {`);
    lines.push(`    this.pageIndex.set(event.pageIndex);`);
    lines.push(`    this.pageSize.set(event.pageSize);`);
    lines.push(`    this.paginated.emit({`);
    lines.push(`      pageIndex: event.pageIndex,`);
    lines.push(`      pageSize: event.pageSize,`);
    lines.push(`      limit: event.pageSize,`);
    lines.push(`      offset: event.pageIndex * event.pageSize,`);
    lines.push(`    });`);
    lines.push(`  }`);
  }
  if (sort !== undefined) {
    lines.push('');
    lines.push(`  protected isSortable(column: ${type}Column<TRow>): boolean {`);
    lines.push(`    return column.sortable !== false;`);
    lines.push(`  }`);
  }
  lines.push(`}`);

  return `${lines.join('\n')}\n`;
}

function compareImports(left: string, right: string): number {
  return left.localeCompare(right, 'en', { sensitivity: 'base' });
}

function handlerNote(handler: string | undefined): string {
  return handler === undefined ? '' : `; the document binds it to \`${handler}\``;
}

function componentDocumentation(definition: TableDefinition, names: TableNames): string[] {
  const { sort, filter, paginate } = definition.behaviours;
  const lines = [
    `/**`,
    ` * Table compiled from the OpenUI \`table\` element "${definition.id}".`,
    ` *`,
    ` * The host supplies \`columns\` and \`rows\` and performs the declared operations:`,
    ` * this component never sorts, filters or pages the rows itself. After a`,
    ` * sort or a filter the page index returns to 0.`,
  ];
  const bindings: string[] = [];
  if (sort !== undefined) {
    bindings.push(`(sorted)="${sort.handler ?? 'sort($event)'}"`);
  }
  if (filter !== undefined) {
    bindings.push(`(filtered)="${filter.handler ?? 'filter($event)'}"`);
  }
  if (paginate !== undefined) {
    bindings.push(`(paginated)="${paginate.handler ?? 'paginate($event)'}"`);
  }
  lines.push(` *`);
  lines.push(` * \`\`\`html`);
  lines.push(` * <${names.selector}`);
  lines.push(` *   [columns]="columns"`);
  lines.push(` *   [rows]="rows"`);
  if (paginate !== undefined) {
    lines.push(` *   [totalRows]="count"`);
  }
  for (const binding of bindings) {
    lines.push(` *   ${binding}`);
  }
  lines.push(` * />`);
  lines.push(` * \`\`\``);
  lines.push(` */`);
  return lines;
}

/** The Angular Material template of the table. */
export function tableTemplate(definition: TableDefinition, names: TableNames): string {
  const { sort, filter, paginate } = definition.behaviours;
  const block = names.blockClass;
  const lines: string[] = [];

  lines.push(`<div class="${block}">`);
  if (filter !== undefined) {
    lines.push(`  <mat-form-field class="${block}__filter" subscriptSizing="dynamic">`);
    lines.push(`    <mat-label>{{ filterLabel() }}</mat-label>`);
    lines.push(
      `    <input matInput type="search" [value]="filterText()" (input)="onFilter($event)" />`,
    );
    lines.push(`  </mat-form-field>`);
  }
  lines.push(
    `  <div class="${block}__scroll" role="region" tabindex="0" [attr.aria-label]="ariaLabel()">`,
  );

  const tableAttributes = ['mat-table', '[dataSource]="rows()"'];
  if (sort !== undefined) {
    tableAttributes.push(
      'matSort',
      '[matSortActive]="sortActive()"',
      '[matSortDirection]="sortDirection()"',
      '(matSortChange)="onSort($event)"',
    );
  }
  lines.push(`    <table ${tableAttributes.join(' ')}>`);
  if (definition.caption) {
    lines.push(`      @if (caption()) {`);
    lines.push(`        <caption>{{ caption() }}</caption>`);
    lines.push(`      }`);
  }
  lines.push(`      @for (column of columns(); track column.key) {`);
  lines.push(`        <ng-container [matColumnDef]="column.key">`);
  if (definition.header) {
    if (sort !== undefined) {
      lines.push(
        `          <th mat-header-cell *matHeaderCellDef scope="col" [mat-sort-header]="column.key" [disabled]="!isSortable(column)">`,
      );
      lines.push(`            {{ column.label }}`);
      lines.push(`          </th>`);
    } else {
      lines.push(
        `          <th mat-header-cell *matHeaderCellDef scope="col">{{ column.label }}</th>`,
      );
    }
  }
  lines.push(`          <td mat-cell *matCellDef="let row">{{ row[column.key] }}</td>`);
  lines.push(`        </ng-container>`);
  lines.push(`      }`);
  if (definition.header) {
    lines.push(`      <tr mat-header-row *matHeaderRowDef="columnKeys(); sticky: true"></tr>`);
  }
  lines.push(`      <tr mat-row *matRowDef="let row; columns: columnKeys()"></tr>`);
  lines.push(`    </table>`);
  lines.push(`  </div>`);
  if (paginate !== undefined) {
    lines.push(`  <mat-paginator`);
    lines.push(`    [length]="length()"`);
    lines.push(`    [pageIndex]="pageIndex()"`);
    lines.push(`    [pageSize]="pageSize()"`);
    lines.push(`    [pageSizeOptions]="pageSizeOptions()"`);
    lines.push(`    showFirstLastButtons`);
    lines.push(`    aria-label="Select page of ${displayName(names).toLowerCase()}"`);
    lines.push(`    (page)="onPage($event)"`);
    lines.push(`  ></mat-paginator>`);
  }
  lines.push(`</div>`);

  return `${lines.join('\n')}\n`;
}

/** The component stylesheet: a full-width table in a horizontally scrolling region. */
export function tableStyles(names: TableNames): string {
  return `:host {
  display: block;
}

.${names.blockClass}__filter {
  display: block;
  max-width: 24rem;
}

.${names.blockClass}__scroll {
  max-height: 70vh;
  overflow: auto;
}

.${names.blockClass}__scroll table {
  min-width: 100%;
}
`;
}
