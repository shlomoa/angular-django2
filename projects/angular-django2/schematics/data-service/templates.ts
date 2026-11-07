import { strings } from '@angular-devkit/core';
import type { DataServiceSchema } from './schema';

/**
 * Import specifiers of the generated ng-openapi-gen client, relative to the data service file.
 * @internal
 */
export interface DataServiceImports {
  /** Specifier of the `services` barrel that exports the wrapped class. */
  apiServicesImport: string;
  /** Specifier of the client output root that holds `strict-http-response`. */
  apiRootImport: string;
}

export interface DataServiceNames {
  className: string;
  serviceName: string;
  apiServiceName: string;
  fileName: string;
}

/**
 * Generate the service file content.
 * @internal
 */
export function generateServiceContent(
  options: DataServiceSchema,
  names: DataServiceNames,
  imports: DataServiceImports,
): string {
  const apiServiceImport = options.apiService || names.apiServiceName;

  return `import { Injectable } from '@angular/core';
import { SortDirection } from '@angular/material/sort';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ${apiServiceImport} } from '${imports.apiServicesImport}';
import type { StrictHttpResponse } from '${imports.apiRootImport}/strict-http-response';

export interface ItemsType<ItemType> {
  items: ItemType[];
  total_count: number;
}

export interface SearchParamsType {
  query: string;
  sort: string;
  order: SortDirection;
  page: number;
  per_page: number;
}

export type SearchFn<ResponseBody> =
  (params: SearchParamsType) => Observable<StrictHttpResponse<ResponseBody>>;

export type ToItems<ItemType, ResponseBody> =
  (body: ResponseBody) => ItemsType<ItemType>;

/**
 * Data service wrapper for ${names.className}
 *
 * This service wraps the generated OpenAPI ${apiServiceImport} and provides
 * typed Observable returns with clean error handling.
 *
 * Usage example:
 * \`\`\`typescript
 * constructor(private ${strings.camelize(names.serviceName)}: ${names.serviceName}) {}
 *
 * searchItems() {
 *   return this.${strings.camelize(names.serviceName)}.search<ItemType, ResponseBody>(
 *     'created',
 *     'desc',
 *     0,
 *     'search query',
 *     (params) => this.${strings.camelize(names.serviceName)}.apiService.searchMethod(params),
 *     (body) => ({ items: body.results, total_count: body.count })
 *   );
 * }
 * \`\`\`
 */
@Injectable({
  providedIn: 'root',
})
export class ${names.serviceName} {
  constructor(public readonly apiService: ${apiServiceImport}) {}

  /**
   * Generic search method that wraps API service search endpoints
   *
   * @param sort - Field to sort by
   * @param order - Sort direction ('asc' or 'desc')
   * @param pageIndex - Zero-based page index
   * @param query - Search query string
   * @param queryFn - Function that calls the actual API service method
   * @param toItems - Function that transforms the response body to ItemsType
   * @returns Observable of ItemsType
   */
  search<ItemType, ResponseBody>(
    sort: string,
    order: SortDirection,
    pageIndex: number,
    query: string,
    queryFn: SearchFn<ResponseBody>,
    toItems: ToItems<ItemType, ResponseBody>,
  ): Observable<ItemsType<ItemType>> {
    const params: SearchParamsType = {
      query,
      sort: this.toSearchSort(sort),
      order: order || 'desc',
      page: pageIndex + 1,
      per_page: 30,
    };

    return queryFn(params).pipe(
      map(response => toItems(response.body as ResponseBody)),
      catchError(error => {
        console.error('Search error:', error);
        throw error;
      })
    );
  }

  /**
   * Get a list of items
   *
   * @param listFn - Function that calls the API service list method
   * @param transform - Optional function to transform the response
   * @returns Observable of the list response
   */
  list<T, R = T>(
    listFn: () => Observable<StrictHttpResponse<R>>,
    transform?: (body: R) => T
  ): Observable<T> {
    return listFn().pipe(
      map(response => {
        const body = response.body as R;
        return transform ? transform(body) : (body as unknown as T);
      }),
      catchError(error => {
        console.error('List error:', error);
        throw error;
      })
    );
  }

  /**
   * Get a single item by ID
   *
   * @param getFn - Function that calls the API service get method
   * @param transform - Optional function to transform the response
   * @returns Observable of the item
   */
  get<T, R = T>(
    getFn: () => Observable<StrictHttpResponse<R>>,
    transform?: (body: R) => T
  ): Observable<T> {
    return getFn().pipe(
      map(response => {
        const body = response.body as R;
        return transform ? transform(body) : (body as unknown as T);
      }),
      catchError(error => {
        console.error('Get error:', error);
        throw error;
      })
    );
  }

  /**
   * Create a new item
   *
   * @param createFn - Function that calls the API service create method
   * @param transform - Optional function to transform the response
   * @returns Observable of the created item
   */
  create<T, R = T>(
    createFn: () => Observable<StrictHttpResponse<R>>,
    transform?: (body: R) => T
  ): Observable<T> {
    return createFn().pipe(
      map(response => {
        const body = response.body as R;
        return transform ? transform(body) : (body as unknown as T);
      }),
      catchError(error => {
        console.error('Create error:', error);
        throw error;
      })
    );
  }

  /**
   * Update an existing item
   *
   * @param updateFn - Function that calls the API service update method
   * @param transform - Optional function to transform the response
   * @returns Observable of the updated item
   */
  update<T, R = T>(
    updateFn: () => Observable<StrictHttpResponse<R>>,
    transform?: (body: R) => T
  ): Observable<T> {
    return updateFn().pipe(
      map(response => {
        const body = response.body as R;
        return transform ? transform(body) : (body as unknown as T);
      }),
      catchError(error => {
        console.error('Update error:', error);
        throw error;
      })
    );
  }

  /**
   * Delete an item
   *
   * @param deleteFn - Function that calls the API service delete method
   * @returns Observable of void
   */
  delete(deleteFn: () => Observable<StrictHttpResponse<void>>): Observable<void> {
    return deleteFn().pipe(
      map(() => undefined),
      catchError(error => {
        console.error('Delete error:', error);
        throw error;
      })
    );
  }

  /**
   * Normalize sort field for search
   * Override this method to customize valid sort fields
   */
  private toSearchSort(sort: string): string {
    const validSorts = ['created', 'updated', 'comments'];
    return validSorts.includes(sort) ? sort : 'created';
  }
}
`;
}

/**
 * Generate the spec file content.
 * @internal
 */
export function generateSpecContent(
  options: DataServiceSchema,
  names: DataServiceNames,
  imports: DataServiceImports,
): string {
  const apiServiceImport = options.apiService || names.apiServiceName;

  return `import { HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { ${names.serviceName} } from './${names.fileName}.data.service';
import { ${apiServiceImport} } from '${imports.apiServicesImport}';
import type { StrictHttpResponse } from '${imports.apiRootImport}/strict-http-response';

describe('${names.serviceName}', () => {
  let service: ${names.serviceName};

  beforeEach(() => {
    const apiServiceStub = {
      searchMethod: vi.fn(),
      listMethod: vi.fn(),
      getMethod: vi.fn(),
      createMethod: vi.fn(),
      updateMethod: vi.fn(),
      deleteMethod: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ${names.serviceName},
        { provide: ${apiServiceImport}, useValue: apiServiceStub },
      ],
    });

    service = TestBed.inject(${names.serviceName});
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('search', () => {
    it('should transform and return search results', async () => {
      const mockResponse = new HttpResponse<{ results: any[]; count: number }>({
        body: { results: [{ id: 1 }, { id: 2 }], count: 2 },
        status: 200,
      }) as StrictHttpResponse<{ results: any[]; count: number }>;

      const searchFn = vi.fn().mockReturnValue(of(mockResponse));
      const toItems = (body: any) => ({ items: body.results, total_count: body.count });

      const result = await firstValueFrom(
        service.search('created', 'desc', 0, 'test', searchFn, toItems),
      );

      expect(result.items.length).toBe(2);
      expect(result.total_count).toBe(2);
      expect(searchFn).toHaveBeenCalledWith({
        query: 'test',
        sort: 'created',
        order: 'desc',
        page: 1,
        per_page: 30,
      });
    });

    it('should handle search errors', async () => {
      const searchFn = vi.fn().mockReturnValue(
        throwError(() => new Error('Search failed'))
      );
      const toItems = (body: any) => ({ items: body.results, total_count: body.count });
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      await expect(
        firstValueFrom(service.search('created', 'desc', 0, 'test', searchFn, toItems)),
      ).rejects.toThrow('Search failed');

      expect(consoleError).toHaveBeenCalledWith('Search error:', expect.any(Error));
      consoleError.mockRestore();
    });
  });

  describe('list', () => {
    it('should return list results', async () => {
      const mockResponse = new HttpResponse<any[]>({
        body: [{ id: 1 }, { id: 2 }],
        status: 200,
      }) as StrictHttpResponse<any[]>;

      const listFn = vi.fn().mockReturnValue(of(mockResponse));

      const result = await firstValueFrom(service.list(listFn));

      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should transform list results when transform function provided', async () => {
      const mockResponse = new HttpResponse<{ data: any[] }>({
        body: { data: [{ id: 1 }, { id: 2 }] },
        status: 200,
      }) as StrictHttpResponse<{ data: any[] }>;

      const listFn = vi.fn().mockReturnValue(of(mockResponse));
      const transform = (body: any) => body.data;

      const result = await firstValueFrom(service.list(listFn, transform));

      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('get', () => {
    it('should return a single item', async () => {
      const mockResponse = new HttpResponse<any>({
        body: { id: 1, name: 'Test' },
        status: 200,
      }) as StrictHttpResponse<any>;

      const getFn = vi.fn().mockReturnValue(of(mockResponse));

      const result = await firstValueFrom(service.get(getFn));

      expect(result).toEqual({ id: 1, name: 'Test' });
    });
  });

  describe('create', () => {
    it('should create and return the created item', async () => {
      const mockResponse = new HttpResponse<any>({
        body: { id: 1, name: 'New Item' },
        status: 201,
      }) as StrictHttpResponse<any>;

      const createFn = vi.fn().mockReturnValue(of(mockResponse));

      const result = await firstValueFrom(service.create(createFn));

      expect(result).toEqual({ id: 1, name: 'New Item' });
    });
  });

  describe('update', () => {
    it('should update and return the updated item', async () => {
      const mockResponse = new HttpResponse<any>({
        body: { id: 1, name: 'Updated Item' },
        status: 200,
      }) as StrictHttpResponse<any>;

      const updateFn = vi.fn().mockReturnValue(of(mockResponse));

      const result = await firstValueFrom(service.update(updateFn));

      expect(result).toEqual({ id: 1, name: 'Updated Item' });
    });
  });

  describe('delete', () => {
    it('should delete an item', async () => {
      const mockResponse = new HttpResponse<void>({
        body: undefined,
        status: 204,
      }) as StrictHttpResponse<void>;

      const deleteFn = vi.fn().mockReturnValue(of(mockResponse));

      const result = await firstValueFrom(service.delete(deleteFn));

      expect(result).toBeUndefined();
    });
  });
});
`;
}
