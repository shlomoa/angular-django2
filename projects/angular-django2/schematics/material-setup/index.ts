import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import type { WorkspaceConfig } from '../utility/workspace';
import { readWorkspace, requireWorkspaceProject, writeWorkspace } from '../utility/workspace';
import { THEME_MAPPING } from '../utility/material-constants';
import { beginMarker, endMarker, renderRegion } from '../utility/generated-regions';

interface MaterialSetupOptions {
  project: string;
  theme: 'indigo-pink' | 'deeppurple-amber' | 'pink-bluegrey' | 'purple-green' | 'custom';
  typography: boolean;
  animations: boolean;
}

const PREBUILT_THEME_COMMENT =
  '/* Angular Material theme is loaded via angular.json styles array */';

export function materialSetup(options: MaterialSetupOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const { project, theme, typography, animations } = options;

    // Validate project exists
    const workspace = readWorkspace(tree);
    const projectConfig = requireWorkspaceProject(workspace, project);

    // Determine the project path from angular.json
    const projectRoot = projectConfig.root || '';
    const stylesPath = projectRoot ? `${projectRoot}/src/styles.scss` : 'src/styles.scss';

    // Update angular.json: a prebuilt theme is a styles entry, the custom theme is not
    updateAngularJsonStyles(
      tree,
      context,
      workspace,
      project,
      theme === 'custom' ? undefined : THEME_MAPPING[theme],
    );

    // Update styles.scss
    updateStylesFile(tree, context, stylesPath, theme, typography);

    // Update app.config.ts to include Material providers
    updateAppConfig(tree, context, projectRoot, animations);

    return tree;
  };
}

/**
 * Makes the project's styles array hold the selected prebuilt theme and no other, so a re-run with
 * a changed theme swaps it. Without a theme path (the custom theme) it holds no prebuilt theme.
 */
function updateAngularJsonStyles(
  tree: Tree,
  context: SchematicContext,
  workspace: WorkspaceConfig,
  project: string,
  themePath: string | undefined,
): void {
  const projectConfig = workspace.projects?.[project];
  if (!projectConfig?.architect?.build?.options) {
    throw new SchematicsException(`Build options not found for project "${project}".`);
  }

  const buildOptions = projectConfig!.architect!.build!.options!;
  const styles = buildOptions.styles || [];
  const prebuiltThemes = new Set<unknown>(Object.values(THEME_MAPPING));
  const withoutPrebuilt = styles.filter((entry) => !prebuiltThemes.has(entry));
  const updated =
    themePath === undefined
      ? withoutPrebuilt
      : styles.includes(themePath)
        ? styles.filter((entry) => entry === themePath || !prebuiltThemes.has(entry))
        : [themePath, ...withoutPrebuilt];

  if (JSON.stringify(updated) === JSON.stringify(styles)) {
    context.logger.info(
      themePath
        ? `Angular Material theme "${themePath}" is already configured.`
        : 'No prebuilt Angular Material theme is configured.',
    );
    return;
  }
  buildOptions.styles = updated;
  writeWorkspace(tree, workspace);
  context.logger.info(
    themePath
      ? `Set Angular Material theme "${themePath}" for project "${project}".`
      : `Removed the prebuilt Angular Material theme from project "${project}".`,
  );
}

/**
 * The text of the theme region of `styles.scss`: the custom theme's definition, or for a prebuilt
 * theme (loaded through the angular.json styles array) the marker comment.
 */
function themeBlock(theme: string, typography: boolean): string {
  if (theme !== 'custom') {
    return PREBUILT_THEME_COMMENT;
  }
  const typographyConfig = typography ? 'mat.define-typography-config()' : 'null';
  return renderRegion(
    'theme',
    'css',
    `@use '@angular/material' as mat;

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
`,
  );
}

/**
 * Where the theme block already is in the file: a marked custom theme, the custom theme of an
 * earlier version (no markers) or the prebuilt marker comment.
 */
function findThemeBlock(content: string): { start: number; end: number } | undefined {
  const begin = content.indexOf(beginMarker('theme', 'css'));
  const end = content.indexOf(endMarker('theme', 'css'), begin);
  if (begin !== -1 && end !== -1) {
    return { start: begin, end: end + endMarker('theme', 'css').length };
  }
  const legacy =
    /@use '@angular\/material' as mat;[\s\S]*?@include mat\.all-component-themes\(\$theme\);/.exec(
      content,
    );
  if (legacy) {
    return { start: legacy.index, end: legacy.index + legacy[0].length };
  }
  const comment = content.indexOf(PREBUILT_THEME_COMMENT);
  if (comment !== -1) {
    return { start: comment, end: comment + PREBUILT_THEME_COMMENT.length };
  }
  return undefined;
}

function updateStylesFile(
  tree: Tree,
  context: SchematicContext,
  stylesPath: string,
  theme: string,
  typography: boolean,
): void {
  const exists = tree.exists(stylesPath);
  const stylesContent = exists ? tree.read(stylesPath)!.toString() : '';
  const block = themeBlock(theme, typography);
  const found = findThemeBlock(stylesContent);

  let updated: string;
  if (found) {
    // A re-run replaces the theme block in place (idempotent for unchanged options, and a changed
    // theme or typography is applied); what surrounds the block is not touched.
    updated = stylesContent.slice(0, found.start) + block + stylesContent.slice(found.end);
  } else if (stylesContent.includes("@use '@angular/material'")) {
    // A theme written by hand: leave it as it is.
    context.logger.info(`Angular Material styles are already configured in ${stylesPath}.`);
    return;
  } else {
    updated = `${block}\n\n${stylesContent}`;
  }

  if (updated === stylesContent) {
    context.logger.info(`Angular Material styles are already configured in ${stylesPath}.`);
    return;
  }
  if (exists) {
    tree.overwrite(stylesPath, updated);
    context.logger.info(`Updated ${stylesPath} with Angular Material style configuration.`);
  } else {
    tree.create(stylesPath, updated);
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

  // Check if a Material provider is already added (idempotency); a changed `animations` option
  // swaps the provider.
  const wanted = animations ? 'provideAnimations' : 'provideNoopAnimations';
  const other = animations ? 'provideNoopAnimations' : 'provideAnimations';
  if (appConfigContent.includes(wanted) && !appConfigContent.includes(other)) {
    context.logger.info(`Material animation provider is already configured in ${appConfigPath}.`);
    return;
  }
  if (appConfigContent.includes(other)) {
    tree.overwrite(appConfigPath, appConfigContent.replaceAll(other, wanted));
    context.logger.info(
      `Switched the Material animation provider to ${wanted}() in ${appConfigPath}.`,
    );
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
