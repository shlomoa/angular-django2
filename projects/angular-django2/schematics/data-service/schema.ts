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
   * The name of the generated OpenAPI service to wrap. Defaults to the classified resource name
   * plus the `serviceSuffix` of `ng-openapi-gen.json` (`ApiService` when the file is missing).
   * @example 'UsersApiService'
   */
  apiService?: string;

  /**
   * Where the generated API services are. A path starting with `.` is the import specifier,
   * used verbatim; any other path is an application path, relativized to the data service.
   * Defaults to the `output` of `ng-openapi-gen.json` plus `/services`.
   * @example '../../../../api/services' or 'src/app/api/services'
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
   * `uses.data` `<apiPath>#<ApiService>`.
   */
  document?: string;

  /** Id of the bound node. Requires `document`; defaults to the first node with `uses.data`. */
  nodeId?: string;
}
