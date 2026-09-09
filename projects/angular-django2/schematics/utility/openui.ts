import type { OpenUiDocument } from '@shlomoa/openui-spec';
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

  try {
    const openUi = OpenUiJson.parse(source.toString());
    openUi.validate();

    return openUi.document as OpenUiDocument;
  } catch (error) {
    if (error instanceof OpenUiValidationError) {
      throw new SchematicsException(
        `OpenUI document "${documentPath}" is invalid:\n${error.message}`,
      );
    }
    if (error instanceof OpenUiJsonError) {
      throw new SchematicsException(
        `OpenUI document "${documentPath}" could not be parsed:\n${error.message}`,
      );
    }

    throw error;
  }
}
