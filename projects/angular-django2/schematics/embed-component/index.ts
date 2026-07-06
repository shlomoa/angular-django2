import type { Rule, Tree, SchematicContext } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import { strings } from '@angular-devkit/core';
import * as path from 'path';
import type { EmbedComponentSchema } from './schema';

interface ChildComponent {
  selector: string;
  className: string;
  inputs: string[];
  outputs: string[];
}

/**
 * embed-component schematic: wire a child component into a parent component
 * using the begin/end section markers produced by the angular-django2
 * `component` schematic.
 *
 * The child can either be a locally generated component (default "file mode",
 * where `component` is a workspace-relative `.ts` path) or an existing exported
 * component from an npm package ("package mode", enabled by passing `from`).
 * Package mode makes it possible to embed components such as Angular Material's
 * `MatDateRangePicker` without a local source file.
 *
 * The schematic:
 * - adds a `<selector ...>` element to the parent template after the
 *   `Begin children section` marker, feeding inputs and binding outputs to
 *   `on<Output>()` handlers;
 * - imports the child class in the parent TypeScript file and registers it in
 *   the standalone `imports` array; and
 * - adds stub `on<Output>()` handlers that throw a "not implemented" error.
 *
 * Every transformation is idempotent, so embedding the same child twice does
 * not duplicate wiring.
 */
export function embedComponent(options: EmbedComponentSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    if (!options.component || !options.component.trim()) {
      throw new SchematicsException(
        'The "component" argument is required (a child component file path, or a class name in package mode).',
      );
    }
    if (!options.parent || !options.parent.trim()) {
      throw new SchematicsException(
        'The "parent" argument is required (the parent component path).',
      );
    }

    const parentPath = normalizeTreePath(options.parent);

    if (!tree.exists(parentPath)) {
      throw new SchematicsException(`Parent component file not found: ${parentPath}`);
    }

    let child: ChildComponent;
    let importSpecifier: string;

    if (options.from) {
      child = buildPackageChild(options);
      importSpecifier = options.from;
    } else {
      const childPath = normalizeTreePath(options.component);
      if (!tree.exists(childPath)) {
        throw new SchematicsException(`Child component file not found: ${childPath}`);
      }
      child = parseChildComponent(tree.read(childPath)!.toString());
      importSpecifier = computeImportSpecifier(parentPath, childPath);
    }

    const parentContent = tree.read(parentPath)!.toString();
    const updatedParent = embedInComponentTs(parentContent, child, importSpecifier);
    if (updatedParent !== parentContent) {
      tree.overwrite(parentPath, updatedParent);
    }

    const templatePath = resolveTemplatePath(parentPath, parentContent);
    if (templatePath && tree.exists(templatePath)) {
      const templateContent = tree.read(templatePath)!.toString();
      const updatedTemplate = embedInTemplate(templateContent, child);
      if (updatedTemplate !== templateContent) {
        tree.overwrite(templatePath, updatedTemplate);
      }
    } else {
      context.logger.warn(
        `Could not resolve an external template for ${parentPath}; skipped HTML embedding.`,
      );
    }

    context.logger.info(`✓ Embedded <${child.selector}> into ${parentPath}`);

    return tree;
  };
}

/**
 * Parse the child component source to discover its selector, class name, and
 * input/output signal names.
 *
 * @internal
 */
export function parseChildComponent(content: string): ChildComponent {
  const classMatch = content.match(/export\s+(?:default\s+)?class\s+(\w+)/);
  if (!classMatch) {
    throw new SchematicsException('Could not find a component class in the child component file.');
  }

  const className = classMatch[1];
  const selectorMatch = content.match(/selector:\s*['"]([^'"]+)['"]/);
  const selector = selectorMatch ? selectorMatch[1] : strings.dasherize(className);

  return {
    className,
    selector,
    inputs: collectSignalNames(
      content,
      /(?:readonly\s+)?(\w+)\s*=\s*(?:model|input)(?:\.required)?\s*[<(]/g,
    ),
    outputs: collectSignalNames(content, /(?:readonly\s+)?(\w+)\s*=\s*output\s*[<(]/g),
  };
}

/**
 * Build a {@link ChildComponent} descriptor for "package mode" from the raw
 * schematic options. In package mode the child is an exported class from an npm
 * package (for example Angular Material's `MatDateRangePicker`) rather than a
 * local file, so the selector, inputs, and outputs are supplied explicitly.
 *
 * @internal
 */
export function buildPackageChild(options: EmbedComponentSchema): ChildComponent {
  const className = options.component.trim();
  if (!className) {
    throw new SchematicsException(
      'A component class name is required in package mode. Provide it as the first argument, e.g. --component=MatDateRangePicker.',
    );
  }

  const selector = options.selector?.trim() || strings.dasherize(className);

  return {
    className,
    selector,
    inputs: parseNameList(options.inputs),
    outputs: parseNameList(options.outputs),
  };
}

/**
 * Parse a comma-separated list of signal names into a de-duplicated array,
 * preserving order and ignoring blank entries.
 *
 * @internal
 */
export function parseNameList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  const names: string[] = [];
  for (const raw of value.split(',')) {
    const name = raw.trim();
    if (name && !names.includes(name)) {
      names.push(name);
    }
  }

  return names;
}

/**
 * Embed the child element into the parent template after the children marker,
 * feeding inputs and binding outputs to `on<Output>()` handlers.
 *
 * @internal
 */
export function embedInTemplate(template: string, child: ChildComponent): string {
  const element = buildChildElement(child);
  if (template.includes(element)) {
    return template;
  }

  const marker = '<!-- Begin children section -->';
  if (template.includes(marker)) {
    return template.replace(marker, `${marker}\n${element}`);
  }

  const trimmed = template.replace(/\s*$/, '');
  return trimmed.length > 0 ? `${trimmed}\n${element}\n` : `${element}\n`;
}

/**
 * Wire the child class into the parent component TypeScript file: add the
 * import, register the class in the `imports` array, and add stub output
 * handlers.
 *
 * @internal
 */
export function embedInComponentTs(
  content: string,
  child: ChildComponent,
  importSpecifier: string,
): string {
  let result = addChildImport(content, child.className, importSpecifier);
  result = addToImportsArray(result, child.className);
  result = addOutputHandlerStubs(result, child.outputs);

  return result;
}

function addChildImport(content: string, className: string, importSpecifier: string): string {
  const importStatement = `import { ${className} } from '${importSpecifier}';`;
  if (content.includes(importStatement)) {
    return content;
  }

  if (content.includes('// End import section')) {
    return content.replace('// End import section', `${importStatement}\n// End import section`);
  }

  const importBlock = /^((?:import[^\n]*\n)+)/;
  if (importBlock.test(content)) {
    return content.replace(importBlock, (block) => `${block}${importStatement}\n`);
  }

  return `${importStatement}\n${content}`;
}

function addToImportsArray(content: string, className: string): string {
  const importsArray = /imports:\s*\[([^\]]*)\]/;
  const match = content.match(importsArray);
  if (!match) {
    return content;
  }

  const items = match[1]
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.includes(className)) {
    return content;
  }

  items.push(className);

  return content.replace(importsArray, `imports: [${items.join(', ')}]`);
}

function addOutputHandlerStubs(content: string, outputs: readonly string[]): string {
  let result = content;

  for (const output of outputs) {
    const handler = handlerName(output);
    const handlerPattern = new RegExp(`\\b${handler}\\s*\\(`);
    if (handlerPattern.test(result)) {
      continue;
    }

    const method = [
      '',
      `  ${handler}($event: unknown): void {`,
      '    void $event;',
      `    throw new Error('${handler} is not implemented');`,
      '  }',
      '',
    ].join('\n');

    result = insertBeforeClassClose(result, method);
  }

  return result;
}

function buildChildElement(child: ChildComponent): string {
  const attributes: string[] = [];

  for (const input of child.inputs) {
    attributes.push(`[${input}]="undefined"`);
  }
  for (const output of child.outputs) {
    attributes.push(`(${output})="${handlerName(output)}($event)"`);
  }

  const attributeText = attributes.length > 0 ? ` ${attributes.join(' ')}` : '';

  return `<${child.selector}${attributeText}></${child.selector}>`;
}

function handlerName(output: string): string {
  return `on${strings.classify(output)}`;
}

function insertBeforeClassClose(content: string, insertion: string): string {
  const closingIndex = content.lastIndexOf('}');
  if (closingIndex === -1) {
    return `${content}${insertion}`;
  }

  return `${content.slice(0, closingIndex)}${insertion}${content.slice(closingIndex)}`;
}

function collectSignalNames(content: string, pattern: RegExp): string[] {
  const names: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    if (!names.includes(match[1])) {
      names.push(match[1]);
    }
  }

  return names;
}

function resolveTemplatePath(parentTsPath: string, parentContent: string): string | null {
  const match = parentContent.match(/templateUrl:\s*['"]([^'"]+)['"]/);
  if (!match) {
    return null;
  }

  const parentDir = path.posix.dirname(parentTsPath);
  return normalizeTreePath(path.posix.join(parentDir, match[1]));
}

function computeImportSpecifier(parentTsPath: string, childTsPath: string): string {
  const parentDir = path.posix.dirname(parentTsPath);
  let relative = path.posix.relative(parentDir, childTsPath).replace(/\\/g, '/');
  relative = relative.replace(/\.ts$/, '');

  if (!relative.startsWith('.')) {
    relative = `./${relative}`;
  }

  return relative;
}

function normalizeTreePath(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/^\.\//, '');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}
