export interface DataServiceSchema {
  /**
   * The name of the resource (e.g., 'users' for UsersDataService). Required
   * unless `document` is given; defaults to the dasherized bound node id.
   */
  name?: string;

  /**
   * The destination path for the data service
   * @example 'features/users/services' or 'core/services'
   */
  path?: string;

  /**
   * The target project
   */
  project?: string;

  /**
   * The name of the generated OpenAPI service to wrap
   * @example 'UsersApiService'
   */
  apiService?: string;

  /**
   * The import path to the generated API service
   * @default '../api/services'
   */
  apiPath?: string;

  /**
   * When true, creates the service file directly in the specified path
   * @default false
   */
  flat?: boolean;

  /**
   * When true, does not create a spec file
   * @default false
   */
  skipTests?: boolean;

  /**
   * Workspace-relative path to an OpenUI document whose bound node carries
   * `[data]="<apiPath>#<ApiService>"`.
   */
  document?: string;

  /** Id of the bound node. Requires `document`; defaults to the first node with `[data]`. */
  nodeId?: string;
}
