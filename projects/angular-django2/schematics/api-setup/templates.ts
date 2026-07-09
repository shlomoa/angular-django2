export interface ApiSetupHelperFile {
  /** Path relative to the resolved helpers directory. */
  fileName: string;
  /** File contents. */
  content: string;
  /** Whether the file is a spec file (skipped when skipTests is set). */
  spec?: boolean;
}

/**
 * Django auth, CSRF, and transport helpers.
 *
 * These artifacts wire an ng-openapi-gen generated client to a Django backend
 * with explicit CSRF, credential, and bearer-token transport behavior. The
 * wiring stays visible in application code instead of hiding behind a
 * package-owned interceptor.
 * @internal
 */
function transportContent(): string {
  return `import type { HttpInterceptorFn } from '@angular/common/http';
import {
  provideHttpClient,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import type { EnvironmentProviders } from '@angular/core';
import { InjectionToken, inject, makeEnvironmentProviders } from '@angular/core';

/**
 * Transport options for a Django-backed OpenAPI client.
 */
export interface DjangoApiTransportOptions {
  /** Name of the Django CSRF cookie. */
  csrfCookieName?: string;
  /** Name of the header Django expects the CSRF token on. */
  csrfHeaderName?: string;
  /** Whether to send credentials (cookies) with API requests. */
  withCredentials?: boolean;
}

const DEFAULT_TRANSPORT_OPTIONS: Required<DjangoApiTransportOptions> = {
  csrfCookieName: 'csrftoken',
  csrfHeaderName: 'X-CSRFToken',
  withCredentials: true,
};

/**
 * Factory that resolves the current auth token (or \`null\` when anonymous).
 * Provide your own factory to attach a bearer token to outgoing requests.
 */
export type DjangoAuthTokenFactory = () => string | null;

/**
 * Injection token holding the {@link DjangoAuthTokenFactory}. Defaults to an
 * anonymous factory that never attaches an \`Authorization\` header.
 */
export const DJANGO_AUTH_TOKEN = new InjectionToken<DjangoAuthTokenFactory>('DJANGO_AUTH_TOKEN', {
  factory: () => () => null,
});

/**
 * Read a cookie value from \`document.cookie\`.
 *
 * Django exposes the CSRF token as a cookie (\`csrftoken\` by default). This
 * reader returns the decoded value, or \`null\` when the cookie is absent or no
 * document is available (for example during server-side rendering).
 */
export function readCsrfCookie(cookieName = 'csrftoken'): string | null {
  if (typeof document === 'undefined' || !document.cookie) {
    return null;
  }

  const prefix = \`\${cookieName}=\`;
  const match = document.cookie.split('; ').find((row) => row.startsWith(prefix));

  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

/**
 * Authorization scheme used by {@link djangoAuthInterceptor}.
 */
const AUTH_SCHEME = 'Bearer';

/**
 * Interceptor that attaches a bearer \`Authorization\` header when the configured
 * {@link DjangoAuthTokenFactory} returns a token.
 */
export const djangoAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(DJANGO_AUTH_TOKEN)();
  if (!token) {
    return next(req);
  }

  const authorization = [AUTH_SCHEME, token].join(' ');
  return next(req.clone({ setHeaders: { Authorization: authorization } }));
};

/**
 * Build an interceptor that opts requests into credentialed (cookie) transport.
 */
export function djangoCredentialsInterceptor(withCredentials: boolean): HttpInterceptorFn {
  return (req, next) => next(withCredentials ? req.clone({ withCredentials: true }) : req);
}

/**
 * Provide the HTTP transport for a Django-backed OpenAPI client.
 *
 * Wires Angular's built-in XSRF handling with the Django cookie/header names,
 * a credentials interceptor, and a bearer-token auth interceptor. Combine with
 * the generated \`ApiConfiguration\` to point requests at your API root:
 *
 * \`\`\`typescript
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideDjangoApiTransport({ csrfCookieName: 'csrftoken' }),
 *   ],
 * };
 * \`\`\`
 */
export function provideDjangoApiTransport(
  options: DjangoApiTransportOptions = {},
): EnvironmentProviders {
  const resolved: Required<DjangoApiTransportOptions> = {
    ...DEFAULT_TRANSPORT_OPTIONS,
    ...options,
  };

  return makeEnvironmentProviders([
    provideHttpClient(
      withXsrfConfiguration({
        cookieName: resolved.csrfCookieName,
        headerName: resolved.csrfHeaderName,
      }),
      withInterceptors([
        djangoAuthInterceptor,
        djangoCredentialsInterceptor(resolved.withCredentials),
      ]),
    ),
  ]);
}
`;
}

/**
 * CRM-oriented resource adapter and shared integration helpers.
 * @internal
 */
function resourceAdapterContent(): string {
  return `import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Django REST Framework paginated list envelope.
 */
export interface PaginatedResult<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Common query parameters accepted by Django REST Framework list endpoints.
 */
export interface ResourceQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  ordering?: string;
}

/**
 * CRM-oriented adapter over a generated \`<Resource>ApiService\` client.
 *
 * Concrete adapters implement each operation by delegating to the generated
 * service and returning typed \`Observable\`s. Route responses through
 * {@link ResourceAdapter.adapt} to attach consistent error handling.
 */
export abstract class ResourceAdapter<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  abstract list(query?: ResourceQuery): Observable<PaginatedResult<T>>;
  abstract retrieve(id: string | number): Observable<T>;
  abstract create(payload: TCreate): Observable<T>;
  abstract update(id: string | number, payload: TUpdate): Observable<T>;
  abstract delete(id: string | number): Observable<void>;

  /**
   * Wrap a source observable with the adapter's shared error handling.
   */
  protected adapt<R>(source: Observable<R>, context: string): Observable<R> {
    return source.pipe(
      catchError((error: unknown) => {
        this.onError(context, error);
        throw error;
      }),
    );
  }

  /**
   * Hook invoked when an adapted operation fails. Override to surface snack-bar
   * feedback or forward the error to a logging service.
   */
  protected onError(context: string, error: unknown): void {
    console.error(\`[ResourceAdapter] \${context} failed\`, error);
  }
}
`;
}

/**
 * Barrel file re-exporting the generated integration helpers.
 * @internal
 */
function barrelContent(): string {
  return `export * from './django-transport';
export * from './resource-adapter';
`;
}

/**
 * Spec verifying the generated transport helpers.
 * @internal
 */
function transportSpecContent(): string {
  return `import { readCsrfCookie } from './django-transport';

describe('readCsrfCookie', () => {
  afterEach(() => {
    document.cookie
      .split('; ')
      .filter(Boolean)
      .forEach((row) => {
        const name = row.split('=')[0];
        document.cookie = \`\${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT\`;
      });
  });

  it('returns the decoded cookie value when present', () => {
    document.cookie = 'csrftoken=abc%20123';

    expect(readCsrfCookie('csrftoken')).toBe('abc 123');
  });

  it('returns null when the cookie is absent', () => {
    expect(readCsrfCookie('missing-cookie')).toBeNull();
  });
});
`;
}

/**
 * Spec verifying the generated resource adapter helper.
 * @internal
 */
function resourceAdapterSpecContent(): string {
  return `import { of, throwError } from 'rxjs';
import { PaginatedResult, ResourceAdapter, ResourceQuery } from './resource-adapter';

interface Contact {
  id: number;
  name: string;
}

class ContactsAdapter extends ResourceAdapter<Contact> {
  readonly errors: string[] = [];

  list(_query?: ResourceQuery) {
    const page: PaginatedResult<Contact> = {
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 1, name: 'Ada' }],
    };
    return this.adapt(of(page), 'list');
  }

  retrieve(id: string | number) {
    return this.adapt(of({ id: Number(id), name: 'Ada' }), 'retrieve');
  }

  create(payload: Partial<Contact>) {
    return this.adapt(of({ id: 2, name: payload.name ?? '' }), 'create');
  }

  update(id: string | number, payload: Partial<Contact>) {
    return this.adapt(of({ id: Number(id), name: payload.name ?? '' }), 'update');
  }

  delete(_id: string | number) {
    return this.adapt(throwError(() => new Error('boom')), 'delete');
  }

  protected override onError(context: string): void {
    this.errors.push(context);
  }
}

describe('ResourceAdapter', () => {
  it('passes successful responses through adapt()', (done) => {
    const adapter = new ContactsAdapter();

    adapter.list().subscribe((page) => {
      expect(page.count).toBe(1);
      expect(page.results[0].name).toBe('Ada');
      done();
    });
  });

  it('routes failures through the onError hook', (done) => {
    const adapter = new ContactsAdapter();

    adapter.delete(1).subscribe({
      next: () => done.fail('expected an error'),
      error: () => {
        expect(adapter.errors).toContain('delete');
        done();
      },
    });
  });
});
`;
}

/**
 * Build the list of integration helper artifacts generated by the api-setup
 * schematic.
 * @internal
 */
export function getHelperFiles(): ApiSetupHelperFile[] {
  return [
    { fileName: 'django-transport.ts', content: transportContent() },
    { fileName: 'resource-adapter.ts', content: resourceAdapterContent() },
    { fileName: 'index.ts', content: barrelContent() },
    { fileName: 'django-transport.spec.ts', content: transportSpecContent(), spec: true },
    { fileName: 'resource-adapter.spec.ts', content: resourceAdapterSpecContent(), spec: true },
  ];
}
