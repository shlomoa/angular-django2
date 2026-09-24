import type { JsonObject, OpenUiDocument } from '@shlomoa/openui-spec';
import { OpenUiJson, OpenUiJsonError, OpenUiValidationError } from '@shlomoa/openui-spec';
import { SchematicsException, type Tree } from '@angular-devkit/schematics';

/**
 * Load and validate an OpenUI document from a schematic tree before mutations.
 *
 * @throws SchematicsException when the document is missing, malformed, or invalid.
 */
export function readOpenUiDocument(tree: Tree, documentPath: string): OpenUiDocument {
  const normalizedPath = documentPath.startsWith('/') ? documentPath : `/${documentPath}`;
  const source = tree.read(normalizedPath);
  if (source === null) {
    throw new SchematicsException(
      `OpenUI document "${documentPath}" was not found in the workspace.`,
    );
  }

  return loadValidatedOpenUiDocument(
    () => OpenUiJson.parse(source.toString()),
    `OpenUI document "${documentPath}"`,
  );
}

/**
 * Validate an in-memory OpenUI document (for example a synthetic document built
 * from legacy CLI options) with the canonical `@shlomoa/openui-spec` validator.
 *
 * @param subject Human-readable subject used as the diagnostic prefix.
 * @throws SchematicsException when the document is invalid.
 */
export function validateOpenUiDocument(document: JsonObject, subject: string): OpenUiDocument {
  return loadValidatedOpenUiDocument(() => new OpenUiJson(document), subject);
}

/** Single place that maps canonical `openui-spec` errors to DevKit diagnostics. */
function loadValidatedOpenUiDocument(load: () => OpenUiJson, subject: string): OpenUiDocument {
  try {
    const openUi = load();
    openUi.validate();

    return openUi.document as OpenUiDocument;
  } catch (error) {
    if (error instanceof OpenUiValidationError) {
      throw new SchematicsException(`${subject} is invalid:\n${error.message}`);
    }
    if (error instanceof OpenUiJsonError) {
      throw new SchematicsException(`${subject} could not be parsed:\n${error.message}`);
    }

    throw error;
  }
}
