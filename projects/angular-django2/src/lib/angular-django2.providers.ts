import type { EnvironmentProviders } from '@angular/core';
import { makeEnvironmentProviders } from '@angular/core';

import { DEFAULT_ANGULAR_DJANGO2_CONFIG } from './angular-django2-config';
import type { AngularDjango2Config, AngularDjango2ResolvedConfig } from './angular-django2-config';
import { ANGULAR_DJANGO2_CONFIG } from './angular-django2.tokens';

export function provideAngularDjango2(config: AngularDjango2Config = {}): EnvironmentProviders {
  const resolvedConfig: AngularDjango2ResolvedConfig = {
    ...DEFAULT_ANGULAR_DJANGO2_CONFIG,
    ...config,
  };

  return makeEnvironmentProviders([
    {
      provide: ANGULAR_DJANGO2_CONFIG,
      useValue: resolvedConfig,
    },
  ]);
}
