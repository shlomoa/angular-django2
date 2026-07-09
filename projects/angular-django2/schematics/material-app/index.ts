import type { Rule, Tree, SchematicContext } from '@angular-devkit/schematics';
import { chain, externalSchematic } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import type { MaterialAppSchema } from './schema';
import { ensureDependency, readPackageJson, writePackageJson } from '../utility/package-json';
import type { WorkspaceConfig } from '../utility/workspace';
import { ANGULAR_JSON_PATH, readWorkspace, requireWorkspaceProject } from '../utility/workspace';
import {
  MATERIAL_ICONS_STYLESHEET_HREF,
  MATERIAL_ICONS_STYLESHEET_LINK,
  MATERIAL_LAYOUT_COMPONENT_TS,
  MATERIAL_LAYOUT_STYLES,
  MATERIAL_LAYOUT_TEMPLATE,
} from '../utility/material-constants';

type ResolvedMaterialAppSchema = Required<MaterialAppSchema>;

const DEFAULT_MATERIAL_APP_OPTIONS = {
  theme: 'indigo-pink',
  typography: true,
  animations: true,
  routing: true,
  standalone: true,
  ssr: false,
  zoneless: true,
  defaults: true,
  style: 'scss',
  prefix: 'app',
} as const satisfies Omit<ResolvedMaterialAppSchema, 'name'>;

function resolveMaterialAppOptions(options: MaterialAppSchema): ResolvedMaterialAppSchema {
  return {
    ...DEFAULT_MATERIAL_APP_OPTIONS,
    ...options,
  };
}

export function materialApp(options: MaterialAppSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const resolvedOptions = resolveMaterialAppOptions(options);

    if (!workspaceProjectExists(tree, resolvedOptions.name)) {
      context.logger.info(`Generating Angular application '${resolvedOptions.name}'.`);
      return createApplicationThenApplyMaterialSetup(resolvedOptions)(tree, context);
    }

    context.logger.info(
      `Project '${resolvedOptions.name}' already exists, skipping application generation`,
    );
    return applyMaterialSetupRule(resolvedOptions)(tree, context);
  };
}

function workspaceProjectExists(tree: Tree, projectName: string): boolean {
  const angularJsonBuffer = tree.read(ANGULAR_JSON_PATH);
  if (!angularJsonBuffer) {
    return false;
  }

  try {
    const workspace = JSON.parse(angularJsonBuffer.toString()) as WorkspaceConfig;
    return !!workspace.projects?.[projectName];
  } catch {
    return false;
  }
}

function createApplicationThenApplyMaterialSetup(options: ResolvedMaterialAppSchema): Rule {
  // externalSchematic is async — chain() ensures Material setup runs after app generation.
  return chain([generateAngularApplication(options), applyMaterialSetupRule(options)]);
}

function generateAngularApplication(options: ResolvedMaterialAppSchema): Rule {
  return externalSchematic('@schematics/angular', 'application', {
    name: options.name,
    routing: options.routing,
    standalone: options.standalone,
    ssr: options.ssr,
    zoneless: options.zoneless,
    style: options.style,
    prefix: options.prefix,
  });
}

function applyMaterialSetupRule(options: ResolvedMaterialAppSchema): Rule {
  return chain([
    addMaterialDependenciesRule(),
    generateMaterialSetup(options),
    generateProjectStructure(options),
    finalizeMaterialLayoutRule(options),
  ]);
}

function addMaterialDependenciesRule(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    addMaterialDependencies(tree, context);
    return tree;
  };
}

// Delegates to the material-setup schematic instead of duplicating its logic,
// so the Material configuration behavior has a single source of truth.
function generateMaterialSetup(options: ResolvedMaterialAppSchema): Rule {
  return externalSchematic('angular-django2', 'material-setup', {
    project: options.name,
    theme: options.theme,
    typography: options.typography,
    animations: options.animations,
  });
}

// Delegates to the project-structure schematic instead of duplicating its logic,
// so the directory-structure behavior has a single source of truth.
function generateProjectStructure(options: ResolvedMaterialAppSchema): Rule {
  return externalSchematic('angular-django2', 'project-structure', {
    project: options.name,
    prefix: options.prefix,
  });
}

function finalizeMaterialLayoutRule(options: ResolvedMaterialAppSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    updateIndexHtmlWithMaterialIcons(tree, context, options.name);
    generateMaterialLayout(tree, context, options.name, options.style);
    return tree;
  };
}

/**
 * Add @angular/material and @angular/cdk to package.json dependencies
 * @internal exported for direct unit testing; the composed Rule uses chain(),
 * which is async, so full end-to-end behavior is covered by the integration
 * suite instead (see tests/schematics.integration.spec.ts).
 */
export function addMaterialDependencies(tree: Tree, context: SchematicContext): void {
  const pkg = readPackageJson(tree, context);
  if (!pkg) return;

  // Use the same version as the Angular version if possible
  const angularVersion = pkg.dependencies?.['@angular/core'] ?? '^22.0.0';

  // Add Material and CDK dependencies if not already present
  const addedDependencies = [
    ensureDependency(pkg, '@angular/material', angularVersion) ? '@angular/material' : undefined,
    ensureDependency(pkg, '@angular/cdk', angularVersion) ? '@angular/cdk' : undefined,
    ensureDependency(pkg, '@angular/animations', angularVersion)
      ? '@angular/animations'
      : undefined,
  ].filter((name): name is string => !!name);

  if (addedDependencies.length === 0) {
    context.logger.info('Angular Material dependencies are already configured.');
    return;
  }

  writePackageJson(tree, pkg);
  context.logger.info(`Added Angular Material dependencies: ${addedDependencies.join(', ')}.`);

  // Schedule npm install
  context.addTask(new NodePackageInstallTask());
}

/**
 * Add the Google Material Icons font stylesheet required by mat-icon ligatures.
 * @internal exported for direct unit testing; see note on addMaterialDependencies.
 */
export function updateIndexHtmlWithMaterialIcons(
  tree: Tree,
  context: SchematicContext,
  projectName: string,
): void {
  const workspace = readWorkspace(tree);
  const projectConfig = requireWorkspaceProject(workspace, projectName);

  const projectRoot = projectConfig.root || '';
  const indexHtmlPath = projectRoot ? `${projectRoot}/src/index.html` : 'src/index.html';

  if (!tree.exists(indexHtmlPath)) {
    context.logger.info(
      `${indexHtmlPath} does not exist. Skipping Material Icons stylesheet setup.`,
    );
    return;
  }

  const indexHtml = tree.read(indexHtmlPath)!.toString();
  if (indexHtml.includes(MATERIAL_ICONS_STYLESHEET_HREF)) {
    context.logger.info(`Material Icons stylesheet is already configured in ${indexHtmlPath}.`);
    return;
  }

  const closingHeadRegex = /^([ \t]*)<\/head>/im;
  const closingHeadMatch = indexHtml.match(closingHeadRegex);
  if (!closingHeadMatch) {
    context.logger.warn(
      `Could not find closing </head> tag in ${indexHtmlPath}. Skipping Material Icons stylesheet setup.`,
    );
    return;
  }

  const indentation = closingHeadMatch[1];
  tree.overwrite(
    indexHtmlPath,
    indexHtml.replace(
      closingHeadRegex,
      `${indentation}${MATERIAL_ICONS_STYLESHEET_LINK}\n${closingHeadMatch[0]}`,
    ),
  );
  context.logger.info(`Added Material Icons stylesheet to ${indexHtmlPath}.`);
}

/**
 * Generate the Material sidenav layout by updating app.component files
 * @internal exported for direct unit testing; see note on addMaterialDependencies.
 */
export function generateMaterialLayout(
  tree: Tree,
  context: SchematicContext,
  projectName: string,
  style: string,
): void {
  // Read angular.json to get the actual project root
  const workspace = readWorkspace(tree);
  const projectConfig = requireWorkspaceProject(workspace, projectName);

  const projectRoot = projectConfig.root || '';
  const appRoot = projectRoot ? `${projectRoot}/src/app` : 'src/app';

  // Try both old and new naming conventions
  // Angular 21+ uses app.html, app.ts, app.scss
  // Older versions use app.component.html, app.component.ts, app.component.scss
  const htmlPaths = [`${appRoot}/app.html`, `${appRoot}/app.component.html`];
  const htmlPath = htmlPaths.find((p) => tree.exists(p));
  if (htmlPath) {
    tree.overwrite(htmlPath, MATERIAL_LAYOUT_TEMPLATE);
    context.logger.info(`Updated Material layout template ${htmlPath}.`);
  } else {
    context.logger.warn(`Could not find app template file for project "${projectName}".`);
  }

  // Update app style file
  const styleExtension = style === 'scss' ? 'scss' : style === 'sass' ? 'sass' : 'css';
  const stylePaths = [
    `${appRoot}/app.${styleExtension}`,
    `${appRoot}/app.component.${styleExtension}`,
  ];
  const stylePath = stylePaths.find((p) => tree.exists(p));
  if (stylePath) {
    tree.overwrite(stylePath, MATERIAL_LAYOUT_STYLES);
    context.logger.info(`Updated Material layout styles ${stylePath}.`);
  } else {
    context.logger.warn(`Could not find app style file for project "${projectName}".`);
  }

  // Update app TypeScript file
  const tsPaths = [`${appRoot}/app.ts`, `${appRoot}/app.component.ts`];
  const tsPath = tsPaths.find((p) => tree.exists(p));
  if (tsPath) {
    // Determine the template and style file names based on which TypeScript file exists
    const templateFile = tsPath.endsWith('app.ts') ? 'app.html' : 'app.component.html';
    const styleFile = tsPath.endsWith('app.ts')
      ? `app.${styleExtension}`
      : `app.component.${styleExtension}`;
    const className = tsPath.endsWith('app.ts') ? 'App' : 'AppComponent';

    const componentContent = MATERIAL_LAYOUT_COMPONENT_TS.replace('REPLACE_APP_NAME', projectName)
      .replace('TEMPLATE_FILE', templateFile)
      .replace('STYLE_FILE', styleFile)
      .replace('CLASS_NAME', className);
    tree.overwrite(tsPath, componentContent);
    context.logger.info(`Updated Material layout component ${tsPath}.`);
  } else {
    context.logger.warn(
      `Could not find app component TypeScript file for project "${projectName}".`,
    );
  }
}
