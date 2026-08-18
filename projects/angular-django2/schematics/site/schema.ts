export type SiteOperation = 'create' | 'modify' | 'delete';

export interface SiteSchema {
  source?: string;
  defaults?: boolean;
  project?: string;
  operation?: SiteOperation;
  confirmDelete?: boolean;
  authGuard?: string;
  csrfCookieName?: string;
  csrfHeaderName?: string;
}

export interface SiteDefinition {
  pages: SitePageDefinition[];
  forms?: SiteFormDefinition[];
  openapi?: SiteOpenapiDefinition;
}

export interface SitePageDefinition {
  name: string;
  path?: string;
  routePath?: string;
  access?: 'public' | 'protected';
  navigation: {
    id: string;
    label: string;
    icon?: string;
  };
}

export interface SiteFormDefinition {
  name: string;
  definition: string;
  path?: string;
}

export interface SiteOpenapiDefinition {
  spec: string;
  outputPath?: string;
  helpersPath?: string;
}
