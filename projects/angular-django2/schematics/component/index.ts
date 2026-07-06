import type { JsonObject } from '@angular-devkit/core';
import type { Rule, Tree, SchematicContext } from '@angular-devkit/schematics';
import { chain, externalSchematic } from '@angular-devkit/schematics';
import { resolveProjectRelativePathOptions } from '../utility/project-relative-path';

export function component(options: JsonObject): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const existingFiles = new Set<string>();
    tree.visit((filePath) => existingFiles.add(filePath));

    return chain([
      externalSchematic('@schematics/angular', 'component', {
        standalone: true,
        changeDetection: 'OnPush',
        ...resolveProjectRelativePathOptions(tree, options),
      }),
      addComponentImplementationHooks(existingFiles),
    ])(tree, context);
  };
}

/**
 * Add begin/end section markers to the freshly generated component files so
 * that later tooling (for example the `embed-component` schematic) has stable,
 * well-known insertion points for imports, injected services, input signals,
 * output signals, and embedded child components.
 *
 * @internal
 */
function addComponentImplementationHooks(existingFiles: ReadonlySet<string>): Rule {
  return (tree: Tree) => {
    tree.visit((filePath) => {
      if (existingFiles.has(filePath) || filePath.endsWith('.spec.ts')) {
        return;
      }

      if (filePath.endsWith('.ts')) {
        const content = tree.read(filePath)?.toString();
        if (content && content.includes('@Component(')) {
          const updated = addComponentSectionMarkers(content);
          if (updated !== content) {
            tree.overwrite(filePath, updated);
          }
        }
      } else if (filePath.endsWith('.html')) {
        const content = tree.read(filePath)?.toString();
        if (content !== undefined) {
          const updated = addTemplateSectionMarkers(content);
          if (updated !== content) {
            tree.overwrite(filePath, updated);
          }
        }
      }
    });

    return tree;
  };
}

/**
 * Wrap the leading import block and seed the class body with begin/end markers
 * for injected services, input signals, and output signals.
 *
 * The transformation is idempotent: re-running it leaves already-marked files
 * unchanged.
 *
 * @internal
 */
export function addComponentSectionMarkers(content: string): string {
  if (content.includes('Begin import section')) {
    return content;
  }

  let result = content.replace(
    /^((?:import[^\n]*\n)+)/,
    (block) => `// Begin import section\n${block.replace(/\n$/, '')}\n// End import section\n`,
  );

  const classBody = [
    '  // Begin injected services section',
    '  // End injected services section',
    '',
    '  // Begin input signals section',
    '  // End input signals section',
    '',
    '  // Begin output signals section',
    '  // End output signals section',
  ].join('\n');

  result = result.replace(
    /(export\s+(?:default\s+)?class\s+\w+[^{]*\{)\s*\}/,
    (_match, opening: string) => `${opening}\n${classBody}\n}`,
  );

  return result;
}

/**
 * Append a begin/end "children" marker pair to the component template. The
 * `embed-component` schematic inserts embedded child elements after the begin
 * marker.
 *
 * The transformation is idempotent.
 *
 * @internal
 */
export function addTemplateSectionMarkers(content: string): string {
  if (content.includes('Begin children section')) {
    return content;
  }

  const trimmed = content.replace(/\s*$/, '');
  const markers = '<!-- Begin children section -->\n<!-- End children section -->\n';

  return trimmed.length > 0 ? `${trimmed}\n\n${markers}` : markers;
}
