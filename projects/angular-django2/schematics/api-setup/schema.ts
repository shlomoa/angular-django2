export interface ApiSetupSchema {
  /**
   * Output path for generated API models and services
   * @default "src/app/api"
   */
  outputPath?: string;

  /**
   * Path to the OpenAPI schema file
   * @default "openapi.json"
   */
  inputPath?: string;

  /**
   * Directory for the generated Django integration helpers
   * @default "src/app/api-integration"
   */
  helpersPath?: string;

  /**
   * When true, skips generating the Django auth/CSRF/transport and resource
   * adapter helpers.
   * @default false
   */
  skipHelpers?: boolean;

  /**
   * When true, does not generate spec files alongside the integration helpers.
   * @default false
   */
  skipTests?: boolean;
}
