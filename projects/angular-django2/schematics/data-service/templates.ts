import { strings } from '@angular-devkit/core';
import type { DataServiceSchema } from './schema';

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
): string {
  const apiServiceImport = options.apiService || names.apiServiceName;
  const apiPath = options.apiPath || '../api/services';

  return `import { Injectable } from '@angular/core';
import { SortDirection } from '@angular/material/sort';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ${apiServiceImport} } from '${apiPath}';
import type { StrictHttpResponse } from '${apiPath.replace('/services', '')}/strict-http-response';

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
export function generateSpecContent(options: DataServiceSchema, names: DataServiceNames): string {
  const apiServiceImport = options.apiService || names.apiServiceName;
  const apiPath = options.apiPath || '../api/services';

  return `import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ${names.serviceName} } from './${names.fileName}.data.service';
import { ${apiServiceImport} } from '${apiPath}';
import type { StrictHttpResponse } from '${apiPath.replace('/services', '')}/strict-http-response';

describe('${names.serviceName}', () => {
  let service: ${names.serviceName};
  let mockApiService: jasmine.SpyObj<${apiServiceImport}>;

  beforeEach(() => {
    const apiServiceSpy = jasmine.createSpyObj('${apiServiceImport}', [
      'searchMethod',
      'listMethod',
      'getMethod',
      'createMethod',
      'updateMethod',
      'deleteMethod',
    ]);

    TestBed.configureTestingModule({
      providers: [
        ${names.serviceName},
        { provide: ${apiServiceImport}, useValue: apiServiceSpy },
      ],
    });

    service = TestBed.inject(${names.serviceName});
    mockApiService = TestBed.inject(${apiServiceImport}) as jasmine.SpyObj<${apiServiceImport}>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('search', () => {
    it('should transform and return search results', (done) => {
      const mockResponse: StrictHttpResponse<{ results: any[]; count: number }> = {
        body: { results: [{ id: 1 }, { id: 2 }], count: 2 },
        status: 200,
        statusText: 'OK',
        url: 'test-url',
        ok: true,
        headers: {} as any,
        type: 4,
      };

      const searchFn = jasmine.createSpy('searchFn').and.returnValue(of(mockResponse));
      const toItems = (body: any) => ({ items: body.results, total_count: body.count });

      service.search('created', 'desc', 0, 'test', searchFn, toItems).subscribe({
        next: (result) => {
          expect(result.items.length).toBe(2);
          expect(result.total_count).toBe(2);
          expect(searchFn).toHaveBeenCalledWith({
            query: 'test',
            sort: 'created',
            order: 'desc',
            page: 1,
            per_page: 30,
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should handle search errors', (done) => {
      const searchFn = jasmine.createSpy('searchFn').and.returnValue(
        throwError(() => new Error('Search failed'))
      );
      const toItems = (body: any) => ({ items: body.results, total_count: body.count });
      spyOn(console, 'error');

      service.search('created', 'desc', 0, 'test', searchFn, toItems).subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toBe('Search failed');
          expect(console.error).toHaveBeenCalledWith('Search error:', jasmine.any(Error));
          done();
        },
      });
    });
  });

  describe('list', () => {
    it('should return list results', (done) => {
      const mockResponse: StrictHttpResponse<any[]> = {
        body: [{ id: 1 }, { id: 2 }],
        status: 200,
        statusText: 'OK',
        url: 'test-url',
        ok: true,
        headers: {} as any,
        type: 4,
      };

      const listFn = jasmine.createSpy('listFn').and.returnValue(of(mockResponse));

      service.list(listFn).subscribe({
        next: (result) => {
          expect(result).toEqual([{ id: 1 }, { id: 2 }]);
          done();
        },
        error: done.fail,
      });
    });

    it('should transform list results when transform function provided', (done) => {
      const mockResponse: StrictHttpResponse<{ data: any[] }> = {
        body: { data: [{ id: 1 }, { id: 2 }] },
        status: 200,
        statusText: 'OK',
        url: 'test-url',
        ok: true,
        headers: {} as any,
        type: 4,
      };

      const listFn = jasmine.createSpy('listFn').and.returnValue(of(mockResponse));
      const transform = (body: any) => body.data;

      service.list(listFn, transform).subscribe({
        next: (result) => {
          expect(result).toEqual([{ id: 1 }, { id: 2 }]);
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('get', () => {
    it('should return a single item', (done) => {
      const mockResponse: StrictHttpResponse<any> = {
        body: { id: 1, name: 'Test' },
        status: 200,
        statusText: 'OK',
        url: 'test-url',
        ok: true,
        headers: {} as any,
        type: 4,
      };

      const getFn = jasmine.createSpy('getFn').and.returnValue(of(mockResponse));

      service.get(getFn).subscribe({
        next: (result) => {
          expect(result).toEqual({ id: 1, name: 'Test' });
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('create', () => {
    it('should create and return the created item', (done) => {
      const mockResponse: StrictHttpResponse<any> = {
        body: { id: 1, name: 'New Item' },
        status: 201,
        statusText: 'Created',
        url: 'test-url',
        ok: true,
        headers: {} as any,
        type: 4,
      };

      const createFn = jasmine.createSpy('createFn').and.returnValue(of(mockResponse));

      service.create(createFn).subscribe({
        next: (result) => {
          expect(result).toEqual({ id: 1, name: 'New Item' });
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('update', () => {
    it('should update and return the updated item', (done) => {
      const mockResponse: StrictHttpResponse<any> = {
        body: { id: 1, name: 'Updated Item' },
        status: 200,
        statusText: 'OK',
        url: 'test-url',
        ok: true,
        headers: {} as any,
        type: 4,
      };

      const updateFn = jasmine.createSpy('updateFn').and.returnValue(of(mockResponse));

      service.update(updateFn).subscribe({
        next: (result) => {
          expect(result).toEqual({ id: 1, name: 'Updated Item' });
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('delete', () => {
    it('should delete an item', (done) => {
      const mockResponse: StrictHttpResponse<void> = {
        body: undefined as any,
        status: 204,
        statusText: 'No Content',
        url: 'test-url',
        ok: true,
        headers: {} as any,
        type: 4,
      };

      const deleteFn = jasmine.createSpy('deleteFn').and.returnValue(of(mockResponse));

      service.delete(deleteFn).subscribe({
        next: (result) => {
          expect(result).toBeUndefined();
          done();
        },
        error: done.fail,
      });
    });
  });
});
`;
}
