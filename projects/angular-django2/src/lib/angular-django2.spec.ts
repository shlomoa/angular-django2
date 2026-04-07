import { afterEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { AngularDjango2Service } from './angular-django2.service';
import { provideAngularDjango2 } from './angular-django2.providers';
import { ANGULAR_DJANGO2_CONFIG } from './angular-django2.tokens';

describe('angular-django2', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('provides sensible Django-oriented defaults', () => {
    TestBed.configureTestingModule({
      providers: [provideAngularDjango2()],
    });

    expect(TestBed.inject(ANGULAR_DJANGO2_CONFIG)).toEqual({
      apiBaseUrl: '',
      csrfCookieName: 'csrftoken',
      csrfHeaderName: 'X-CSRFToken',
      withCredentials: true,
    });
  });

  it('merges custom configuration and exposes helper methods', () => {
    TestBed.configureTestingModule({
      providers: [
        provideAngularDjango2({
          apiBaseUrl: 'https://api.example.com/v1/',
          csrfHeaderName: 'X-CUSTOM-CSRF',
          withCredentials: false,
        }),
      ],
    });

    const service = TestBed.inject(AngularDjango2Service);

    expect(service.resolvedConfig.withCredentials).toBe(false);
    expect(service.buildUrl('/users/me')).toBe('https://api.example.com/v1/users/me');
    expect(service.csrfHeader('abc123')).toEqual({
      'X-CUSTOM-CSRF': 'abc123',
    });
  });

  it('leaves relative URLs untouched when no API base URL is configured', () => {
    TestBed.configureTestingModule({
      providers: [provideAngularDjango2()],
    });

    const service = TestBed.inject(AngularDjango2Service);

    expect(service.buildUrl('/health')).toBe('/health');
  });
});
