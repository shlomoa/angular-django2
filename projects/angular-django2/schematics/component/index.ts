import type { JsonObject } from '@angular-devkit/core';
import type { Rule } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import { compileComponentDocument } from './ast';
import { generateComponent } from './generate';

export { addComponentSectionMarkers, addTemplateSectionMarkers } from './generate';

/**
 * Generate a standalone OnPush component with embedding hooks, either from CLI
 * options or, with `--document`, from an OpenUI `SurfaceContainers` node whose
 * children are compiled and embedded recursively.
 */
export function component(options: JsonObject): Rule {
  if (options['document'] === undefined && options['nodeId'] !== undefined) {
    throw new SchematicsException('--nodeId requires --document.');
  }

  if (options['document'] !== undefined) {
    return compileComponentDocument(options);
  }

  // Angular's component schematic rejects unknown keys, even with undefined values.
  const legacyOptions = { ...options };
  delete legacyOptions['document'];
  delete legacyOptions['nodeId'];
  return generateComponent(legacyOptions);
}
