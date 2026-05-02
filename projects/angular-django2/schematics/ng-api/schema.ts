export interface NgApiSchema {
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
}
