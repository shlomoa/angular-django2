import type { JsonObject } from '@angular-devkit/core';
import type { Rule, Tree, SchematicContext } from '@angular-devkit/schematics';
import { externalSchematic } from '@angular-devkit/schematics';
import { resolveProjectRelativePathOptions } from '../utility/project-relative-path';

export function component(options: JsonObject): Rule {
  return (tree: Tree, context: SchematicContext) =>
    externalSchematic('@schematics/angular', 'component', {
      standalone: true,
      changeDetection: 'OnPush',
      ...resolveProjectRelativePathOptions(tree, options),
    })(tree, context);
}
