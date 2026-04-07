export interface AngularDjango2Config {
  apiBaseUrl?: string;
  csrfCookieName?: string;
  csrfHeaderName?: string;
  withCredentials?: boolean;
}

export type AngularDjango2ResolvedConfig = Readonly<Required<AngularDjango2Config>>;

export const DEFAULT_ANGULAR_DJANGO2_CONFIG = Object.freeze({
  apiBaseUrl: '',
  csrfCookieName: 'csrftoken',
  csrfHeaderName: 'X-CSRFToken',
  withCredentials: true,
}) as AngularDjango2ResolvedConfig;
