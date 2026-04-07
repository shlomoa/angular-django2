import { InjectionToken } from '@angular/core';

import { DEFAULT_ANGULAR_DJANGO2_CONFIG } from './angular-django2-config';
import type { AngularDjango2ResolvedConfig } from './angular-django2-config';

export const ANGULAR_DJANGO2_CONFIG = new InjectionToken<AngularDjango2ResolvedConfig>(
  'ANGULAR_DJANGO2_CONFIG',
  {
    factory: () => DEFAULT_ANGULAR_DJANGO2_CONFIG,
  },
);
