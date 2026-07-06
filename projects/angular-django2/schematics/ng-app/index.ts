import type { Rule, Tree, SchematicContext } from '@angular-devkit/schematics';
import { chain, externalSchematic, SchematicsException } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import type { NgAppSchema } from './schema';
import { ensureDependency, readPackageJson, writePackageJson } from '../utility/package-json';
import type { WorkspaceConfig } from '../utility/workspace';
import {
  ANGULAR_JSON_PATH,
  readWorkspace,
  requireWorkspaceProject,
  writeWorkspace,
} from '../utility/workspace';
import {
  APP_SHELL_COMPONENT_TS,
  APP_SHELL_STYLES,
  APP_SHELL_TEMPLATE,
  MATERIAL_ICONS_STYLESHEET_HREF,
  MATERIAL_ICONS_STYLESHEET_LINK,
  THEME_MAPPING,
} from '../utility/material-constants';
import { BARREL_CONTENT, DIRECTORIES } from '../utility/directory-structure';

type ResolvedNgAppSchema = Required<NgAppSchema>;

const DEFAULT_NG_APP_OPTIONS = {
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
} as const satisfies Omit<ResolvedNgAppSchema, 'name'>;

function resolveNgAppOptions(options: NgAppSchema): ResolvedNgAppSchema {
  return {
    ...DEFAULT_NG_APP_OPTIONS,
    ...options,
  };
}

export function ngApp(options: NgAppSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const resolvedOptions = resolveNgAppOptions(options);

    if (!workspaceProjectExists(tree, resolvedOptions.name)) {
      context.logger.info(`Generating Angular application '${resolvedOptions.name}'.`);
      return createApplicationThenApplyMaterialSetup(resolvedOptions)(tree, context);
    }

    context.logger.info(
      `Project '${resolvedOptions.name}' already exists, skipping application generation`,
    );
    applyMaterialSetup(tree, context, resolvedOptions);
    return tree;
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

function createApplicationThenApplyMaterialSetup(options: ResolvedNgAppSchema): Rule {
  // externalSchematic is async — chain() ensures Material setup runs after app generation.
  return chain([generateAngularApplication(options), applyMaterialSetupRule(options)]);
}

function generateAngularApplication(options: ResolvedNgAppSchema): Rule {
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

function applyMaterialSetupRule(options: ResolvedNgAppSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    applyMaterialSetup(tree, context, options);
    return tree;
  };
}

function applyMaterialSetup(
  tree: Tree,
  context: SchematicContext,
  options: ResolvedNgAppSchema,
): void {
  addMaterialDependencies(tree, context);
  configureMaterial(
    tree,
    context,
    options.name,
    options.theme,
    options.typography,
    options.animations,
  );
  createDirectoryStructure(tree, context, options.name);
  updateIndexHtmlWithMaterialIcons(tree, context, options.name);
  generateMaterialAppShell(tree, context, options.name, options.style);
}

/**
 * Add @angular/material and @angular/cdk to package.json dependencies
 */
function addMaterialDependencies(tree: Tree, context: SchematicContext): void {
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
 * Configure Angular Material
 */
function configureMaterial(
  tree: Tree,
  context: SchematicContext,
  projectName: string,
  theme: string,
  typography: boolean,
  animations: boolean,
): void {
  // Validate project exists
  const workspace = readWorkspace(tree);
  const projectConfig = requireWorkspaceProject(workspace, projectName);

  // Determine the project path from angular.json
  const projectRoot = projectConfig.root || '';
  const stylesPath = projectRoot ? `${projectRoot}/src/styles.scss` : 'src/styles.scss';

  // Update angular.json for prebuilt themes
  if (theme !== 'custom') {
    updateAngularJsonStyles(tree, context, workspace, projectName, THEME_MAPPING[theme]);
  }

  // Update styles.scss
  updateStylesFile(tree, context, stylesPath, theme, typography);

  // Update app.config.ts to include Material providers
  updateAppConfig(tree, context, projectRoot, animations);
}

function updateAngularJsonStyles(
  tree: Tree,
  context: SchematicContext,
  workspace: WorkspaceConfig,
  project: string,
  themePath: string,
): void {
  const projectConfig = workspace.projects?.[project];
  if (!projectConfig?.architect?.build?.options) {
    throw new SchematicsException(`Build options not found for project "${project}".`);
  }

  const buildOptions = projectConfig!.architect!.build!.options!;
  const styles = buildOptions.styles || [];

  // Check if the theme is already added (idempotency)
  if (!styles.includes(themePath)) {
    buildOptions.styles = [themePath, ...styles];
    writeWorkspace(tree, workspace);
    context.logger.info(`Added Angular Material theme "${themePath}" to project "${project}".`);
  } else {
    context.logger.info(`Angular Material theme "${themePath}" is already configured.`);
  }
}

function updateStylesFile(
  tree: Tree,
  context: SchematicContext,
  stylesPath: string,
  theme: string,
  typography: boolean,
): void {
  let stylesContent = '';

  if (tree.exists(stylesPath)) {
    stylesContent = tree.read(stylesPath)!.toString();
  }

  // Check if Material styles are already configured (idempotency)
  if (stylesContent.includes("@use '@angular/material'")) {
    context.logger.info(`Angular Material styles are already configured in ${stylesPath}.`);
    return;
  }

  if (theme === 'custom') {
    const typographyConfig = typography ? 'mat.define-typography-config()' : 'null';
    const customThemeContent = `
@use '@angular/material' as mat;

@include mat.core();

$primary: mat.define-palette(mat.$indigo-palette);
$accent:  mat.define-palette(mat.$pink-palette, A200, A100, A400);
$warn:    mat.define-palette(mat.$red-palette);

$theme: mat.define-light-theme((
  color: (
    primary: $primary,
    accent:  $accent,
    warn:    $warn,
  ),
  typography: ${typographyConfig},
  density: 0,
));

@include mat.all-component-themes($theme);

`;
    stylesContent = customThemeContent + stylesContent;
  } else {
    // For prebuilt themes, just add a comment as the theme is included via angular.json
    const prebuiltComment = `/* Angular Material theme is loaded via angular.json styles array */\n\n`;
    stylesContent = prebuiltComment + stylesContent;
  }

  if (tree.exists(stylesPath)) {
    tree.overwrite(stylesPath, stylesContent);
    context.logger.info(`Updated ${stylesPath} with Angular Material style configuration.`);
  } else {
    tree.create(stylesPath, stylesContent);
    context.logger.info(`Created ${stylesPath} with Angular Material style configuration.`);
  }
}

function updateAppConfig(
  tree: Tree,
  context: SchematicContext,
  projectRoot: string,
  animations: boolean,
): void {
  const appConfigPath = `${projectRoot}/src/app/app.config.ts`;

  if (!tree.exists(appConfigPath)) {
    // If app.config.ts doesn't exist, skip this step
    context.logger.info(
      `${appConfigPath} does not exist. Skipping Material animation provider setup.`,
    );
    return;
  }

  let appConfigContent = tree.read(appConfigPath)!.toString();

  // Check if Material providers are already added (idempotency)
  if (
    appConfigContent.includes('provideAnimations') ||
    appConfigContent.includes('provideNoopAnimations')
  ) {
    context.logger.info(`Material animation provider is already configured in ${appConfigPath}.`);
    return;
  }

  // Add animation provider import
  const animationImport = animations
    ? "import { provideAnimations } from '@angular/platform-browser/animations';"
    : "import { provideNoopAnimations } from '@angular/platform-browser/animations';";

  // Find the imports section and add new imports
  const importRegex = /(import\s+.*?from\s+['"].*?['"];?\s*)+/;
  const match = appConfigContent.match(importRegex);

  if (match) {
    const lastImportEnd = match[0].length;
    appConfigContent =
      appConfigContent.slice(0, lastImportEnd) +
      `\n${animationImport}\n` +
      appConfigContent.slice(lastImportEnd);
  }

  // Add providers to the providers array
  const providerToAdd = animations ? 'provideAnimations()' : 'provideNoopAnimations()';

  // Find the providers array and add new providers
  const providersRegex = /providers:\s*\[/;
  const updatedAppConfigContent = appConfigContent.replace(
    providersRegex,
    `providers: [\n    ${providerToAdd},\n   `,
  );

  if (updatedAppConfigContent === appConfigContent) {
    context.logger.warn(
      `Could not find providers array in ${appConfigPath}. Skipping Material animation provider setup.`,
    );
    return;
  }

  tree.overwrite(appConfigPath, updatedAppConfigContent);
  context.logger.info(`Added ${providerToAdd} to ${appConfigPath}.`);
}

/**
 * Create standard directory structure
 */
function createDirectoryStructure(
  tree: Tree,
  context: SchematicContext,
  projectName: string,
): void {
  // Read angular.json to get the actual project root
  const workspace = readWorkspace(tree);
  const projectConfig = requireWorkspaceProject(workspace, projectName);

  const projectRoot = projectConfig.root || '';
  const appRoot = projectRoot ? `${projectRoot}/src/app` : 'src/app';

  // Create directory structure with barrel files
  for (const dir of DIRECTORIES) {
    const dirPath = `${appRoot}/${dir}`;
    const indexPath = `${dirPath}/index.ts`;

    // Check if index.ts already exists and has non-empty content (idempotency)
    if (tree.exists(indexPath)) {
      const existingContent = tree.read(indexPath)!.toString().trim();
      // Only skip if the file has meaningful content beyond the barrel export
      if (existingContent && existingContent !== BARREL_CONTENT.trim()) {
        context.logger.info(`Skipping existing non-empty barrel file ${indexPath}.`);
        continue;
      }
    }

    // Create or overwrite with barrel content
    if (tree.exists(indexPath)) {
      tree.overwrite(indexPath, BARREL_CONTENT);
      context.logger.info(`Updated barrel file ${indexPath}.`);
    } else {
      tree.create(indexPath, BARREL_CONTENT);
      context.logger.info(`Created barrel file ${indexPath}.`);
    }
  }

  // Also ensure shared/index.ts exists
  const sharedIndexPath = `${appRoot}/shared/index.ts`;
  if (!tree.exists(sharedIndexPath)) {
    tree.create(sharedIndexPath, BARREL_CONTENT);
    context.logger.info(`Created barrel file ${sharedIndexPath}.`);
  } else {
    context.logger.info(`Barrel file ${sharedIndexPath} already exists.`);
  }
}

/**
 * Add the Google Material Icons font stylesheet required by mat-icon ligatures.
 */
function updateIndexHtmlWithMaterialIcons(
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
 * Generate Material App Shell by updating app.component files
 */
function generateMaterialAppShell(
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
    tree.overwrite(htmlPath, APP_SHELL_TEMPLATE);
    context.logger.info(`Updated Material app shell template ${htmlPath}.`);
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
    tree.overwrite(stylePath, APP_SHELL_STYLES);
    context.logger.info(`Updated Material app shell styles ${stylePath}.`);
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

    const componentContent = APP_SHELL_COMPONENT_TS.replace('REPLACE_APP_NAME', projectName)
      .replace('TEMPLATE_FILE', templateFile)
      .replace('STYLE_FILE', styleFile)
      .replace('CLASS_NAME', className);
    tree.overwrite(tsPath, componentContent);
    context.logger.info(`Updated Material app shell component ${tsPath}.`);
  } else {
    context.logger.warn(
      `Could not find app component TypeScript file for project "${projectName}".`,
    );
  }
}
