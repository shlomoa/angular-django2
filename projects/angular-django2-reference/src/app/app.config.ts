import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import type { ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideAngularDjango2 } from 'angular-django2';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withXsrfConfiguration({
        cookieName: 'csrftoken',
        headerName: 'X-CSRFToken',
      }),
    ),
    provideAnimations(),
    provideAngularDjango2({
      apiBaseUrl: '/api',
      withCredentials: true,
    }),
  ],
};
