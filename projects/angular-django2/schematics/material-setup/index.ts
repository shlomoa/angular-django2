import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import type { WorkspaceConfig } from '../utility/workspace';
import { readWorkspace, requireWorkspaceProject, writeWorkspace } from '../utility/workspace';
import { THEME_MAPPING } from '../utility/material-constants';

interface MaterialSetupOptions {
  project: string;
  theme: 'indigo-pink' | 'deeppurple-amber' | 'pink-bluegrey' | 'purple-green' | 'custom';
  typography: boolean;
  animations: boolean;
}

export function materialSetup(options: MaterialSetupOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const { project, theme, typography, animations } = options;

    // Validate project exists
    const workspace = readWorkspace(tree);
    const projectConfig = requireWorkspaceProject(workspace, project);

    // Determine the project path from angular.json
    const projectRoot = projectConfig.root || '';
    const stylesPath = projectRoot ? `${projectRoot}/src/styles.scss` : 'src/styles.scss';

    // Update angular.json for prebuilt themes
    if (theme !== 'custom') {
      updateAngularJsonStyles(tree, context, workspace, project, THEME_MAPPING[theme]);
    }

    // Update styles.scss
    updateStylesFile(tree, context, stylesPath, theme, typography);

    // Update app.config.ts to include Material providers
    updateAppConfig(tree, context, projectRoot, animations);

    return tree;
  };
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
