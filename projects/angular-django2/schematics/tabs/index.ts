/**
 * `tabs` schematic: compile an OpenUI `Tabs` node (`containers/tabs`) into a
 * standalone OnPush Angular Material component.
 *
 * The tab strip is a Material tab group (horizontal) or an ARIA vertical
 * tablist (vertical); see `./templates.ts`. The content of every `tab` is
 * compiled into its own components with the shared composition engine that
 * `component` uses (`compileAstChild`, `composeAstChildren`) and embedded into
 * the section of that tab, in document order.
 */
import { strings } from '@angular-devkit/core';
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { chain, SchematicsException } from '@angular-devkit/schematics';
import type { OpenUiElement } from '@shlomoa/openui-spec';
import * as path from 'node:path';

import {
  compileAstChild,
  type ChildCompilationTarget,
  type ContainerCompilationOptions,
} from '../component/ast';
import { generateComponent } from '../component/generate';
import {
  composeAstChildren,
  withoutCompositionAttributes,
  type AstChildCompilation,
} from '../embed-component/compose';
import { readAstNode } from '../utility/ast-compiler';
import { resolveApplicationTargetDirectory } from '../utility/project-relative-path';
import {
  readWorkspace,
  requireWorkspaceProject,
  resolveApplicationProjectName,
} from '../utility/workspace';
import { TABS_AST_TYPE, tabsOptionsFromAst, type TabsAstOptions } from './ast';
import type { TabsSchema } from './schema';
import {
  tabsComponentSource,
  tabsStyles,
  tabsTemplate,
  type TabsComponentNames,
} from './templates';

const KEBAB_CASE_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * Compile the `Tabs` node of an OpenUI document into a tabs component and the
 * components of its tab content.
 *
 * @throws SchematicsException for an invalid document, an unsupported
 * attribute, child or value, or missing Angular Material prerequisites.
 */
export function tabs(options: TabsSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    if (!options.document) {
      throw new SchematicsException('--document is required: tabs compiles an OpenUI Tabs node.');
    }

    const node = readAstNode(tree, options.document, options.nodeId, TABS_AST_TYPE);
    const name = options.name ?? strings.dasherize(node.id);

    const workspace = readWorkspace(tree);
    const projectName = resolveApplicationProjectName(workspace, options.project);
    const project = requireWorkspaceProject(workspace, projectName);
    const destination = resolveApplicationTargetDirectory(
      project,
      options.path,
      `${project.sourceRoot}/app`,
    );
    assertMaterialPrerequisites(tree);

    return compileTabsFromAst(node, {
      name,
      path: destination,
      project: projectName,
      documentPath: options.document,
    })(tree, context);
  };
}

/**
 * Pure AST compiler: generate the component for one `Tabs` node and compile
 * and embed the content of its tabs. Everything the node says is checked
 * before the first file is generated.
 *
 * @throws SchematicsException for unsupported attributes, children, or values.
 */
export function compileTabsFromAst(
  node: OpenUiElement,
  options: ContainerCompilationOptions,
): Rule {
  if (!KEBAB_CASE_NAME.test(options.name)) {
    throw new SchematicsException(
      `The component name "${options.name}" must be non-empty kebab-case.`,
    );
  }

  const described = tabsOptionsFromAst(node, options.documentPath);
  const directory = path.posix.join(options.path, options.name);
  const componentPath = path.posix.join(directory, `${options.name}.ts`);
  const target: ChildCompilationTarget = {
    directory,
    project: options.project,
    documentPath: options.documentPath,
  };
  const content = described.tabs.flatMap((tab) =>
    tab.content.map((child) => compileTabContent(child, target, tab.section)),
  );

  return chain([
    generateComponent({
      name: options.name,
      path: options.path,
      project: options.project,
      standalone: true,
      changeDetection: 'OnPush',
    }),
    writeTabsComponent(options.name, directory, described),
    composeAstChildren(componentPath, content),
  ]);
}

/**
 * Compile one piece of tab content into its own component under the tabs
 * component's directory. A nested `Tabs` node is compiled by this schematic;
 * every other node by the container compiler.
 */
function compileTabContent(
  child: OpenUiElement,
  target: ChildCompilationTarget,
  section: string,
): AstChildCompilation {
  if (child.type !== TABS_AST_TYPE) {
    return compileAstChild(child, target, section);
  }

  const name = strings.dasherize(child.id);
  return {
    node: child,
    section,
    componentPath: path.posix.join(target.directory, name, `${name}.ts`),
    rule: compileTabsFromAst(withoutCompositionAttributes(child), {
      name,
      path: target.directory,
      project: target.project,
      documentPath: target.documentPath,
    }),
  };
}

/**
 * Replace the files Angular generated with the tabs component: the source and
 * template are rewritten around the names Angular chose, the style file receives
 * the layout of the orientation.
 */
function writeTabsComponent(name: string, directory: string, options: TabsAstOptions): Rule {
  return (tree: Tree) => {
    const sourcePath = path.posix.join(directory, `${name}.ts`);
    const generated = tree.read(sourcePath)?.toString();
    if (generated === undefined) {
      throw new SchematicsException(`The generated component file ${sourcePath} was not found.`);
    }

    const names = readGeneratedNames(generated, name, sourcePath);
    const templatePath = path.posix.join(directory, names.templateUrl);
    const stylePath = path.posix.join(directory, names.styleUrl);
    const generatedStyleUrl = /styleUrl:\s*['"]([^'"]+)['"]/.exec(generated)?.[1];
    if (generatedStyleUrl !== undefined && generatedStyleUrl !== names.styleUrl) {
      tree.delete(path.posix.join(directory, generatedStyleUrl));
    }

    tree.overwrite(sourcePath, tabsComponentSource(names, options));
    if (tree.exists(templatePath)) {
      tree.overwrite(templatePath, tabsTemplate(options));
    } else {
      tree.create(templatePath, tabsTemplate(options));
    }
    if (tree.exists(stylePath)) {
      tree.overwrite(stylePath, tabsStyles(options));
    } else {
      tree.create(stylePath, tabsStyles(options));
    }

    return tree;
  };
}

/**
 * Class name, selector, and file references of the component Angular generated.
 *
 * @internal
 */
export function readGeneratedNames(
  source: string,
  name: string,
  sourcePath: string,
): TabsComponentNames {
  const className = /export\s+class\s+(\w+)/.exec(source)?.[1];
  const selector = /selector:\s*['"]([^'"]+)['"]/.exec(source)?.[1];
  const templateUrl = /templateUrl:\s*['"]([^'"]+)['"]/.exec(source)?.[1];
  if (className === undefined || selector === undefined || templateUrl === undefined) {
    throw new SchematicsException(
      `Could not read the class, selector, and template of ${sourcePath}. ` +
        'The tabs schematic needs a component with an external template.',
    );
  }

  // The indented Sass syntax cannot hold the generated plain-CSS layout.
  const styleUrl = /styleUrl:\s*['"]([^'"]+)['"]/.exec(source)?.[1];
  return {
    name,
    className,
    selector,
    templateUrl,
    styleUrl: styleUrl === undefined || styleUrl.endsWith('.sass') ? `./${name}.scss` : styleUrl,
  };
}

function assertMaterialPrerequisites(tree: Tree): void {
  const packageJson = tree.read('/package.json');
  if (!packageJson) {
    throw new SchematicsException(
      'tabs requires package.json with an @angular/material dependency. Run ng add @angular/material first.',
    );
  }

  let parsed: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    parsed = JSON.parse(packageJson.toString()) as typeof parsed;
  } catch {
    throw new SchematicsException(
      'tabs requires a valid package.json with an @angular/material dependency.',
    );
  }

  const dependencies = { ...parsed.devDependencies, ...parsed.dependencies };
  if (!dependencies['angular-django2'] && !dependencies['@angular/material']) {
    throw new SchematicsException(
      'tabs requires installed Angular Material prerequisites: @angular/material.',
    );
  }
}
