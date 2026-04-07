import { inject, Injectable } from '@angular/core';

import { ANGULAR_DJANGO2_CONFIG } from './angular-django2.tokens';

@Injectable({
  providedIn: 'root',
})
export class AngularDjango2Service {
  readonly resolvedConfig = inject(ANGULAR_DJANGO2_CONFIG);

  buildUrl(path = ''): string {
    if (!path) {
      return this.resolvedConfig.apiBaseUrl;
    }

    if (!this.resolvedConfig.apiBaseUrl) {
      return path;
    }

    const baseUrl = this.resolvedConfig.apiBaseUrl.endsWith('/')
      ? this.resolvedConfig.apiBaseUrl.slice(0, -1)
      : this.resolvedConfig.apiBaseUrl;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${baseUrl}${normalizedPath}`;
  }

  csrfHeader(token: string): Record<string, string> {
    return {
      [this.resolvedConfig.csrfHeaderName]: token,
    };
  }
}
