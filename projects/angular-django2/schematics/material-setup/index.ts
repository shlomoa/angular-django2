import type { Rule, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';

interface MaterialSetupOptions {
  project: string;
  theme: 'indigo-pink' | 'deeppurple-amber' | 'pink-bluegrey' | 'purple-green' | 'custom';
  typography: boolean;
  animations: boolean;
}

interface WorkspaceConfig {
  projects: Record<
    string,
    {
      architect?: {
        build?: {
          options?: {
            styles?: string[];
          };
        };
      };
    }
  >;
}

const THEME_MAPPING: Record<string, string> = {
  'indigo-pink': '@angular/material/prebuilt-themes/indigo-pink.css',
  'deeppurple-amber': '@angular/material/prebuilt-themes/deeppurple-amber.css',
  'pink-bluegrey': '@angular/material/prebuilt-themes/pink-bluegrey.css',
  'purple-green': '@angular/material/prebuilt-themes/purple-green.css',
};

export function materialSetup(options: MaterialSetupOptions): Rule {
  return (tree: Tree) => {
    const { project, theme, typography, animations } = options;

    // Validate project exists
    const angularJsonPath = '/angular.json';
    const angularJsonBuffer = tree.read(angularJsonPath);
    if (!angularJsonBuffer) {
      throw new SchematicsException('Could not find angular.json in the workspace.');
    }

    const workspace = JSON.parse(angularJsonBuffer.toString()) as WorkspaceConfig;
    if (!workspace.projects[project]) {
      throw new SchematicsException(`Project "${project}" not found in angular.json.`);
    }

    // Determine the project path
    const projectRoot = `projects/${project}`;
    const stylesPath = `${projectRoot}/src/styles.scss`;

    // Update angular.json for prebuilt themes
    if (theme !== 'custom') {
      updateAngularJsonStyles(tree, workspace, project, THEME_MAPPING[theme]);
    }

    // Update styles.scss
    updateStylesFile(tree, stylesPath, theme, typography);

    // Update app.config.ts to include Material providers
    updateAppConfig(tree, projectRoot, animations);

    return tree;
  };
}

function updateAngularJsonStyles(
  tree: Tree,
  workspace: WorkspaceConfig,
  project: string,
  themePath: string,
): void {
  const angularJsonPath = '/angular.json';

  if (!workspace.projects[project].architect?.build?.options) {
    throw new SchematicsException(`Build options not found for project "${project}".`);
  }

  const buildOptions = workspace.projects[project].architect!.build!.options!;
  const styles = buildOptions.styles || [];

  // Check if the theme is already added (idempotency)
  if (!styles.includes(themePath)) {
    buildOptions.styles = [themePath, ...styles];
    tree.overwrite(angularJsonPath, `${JSON.stringify(workspace, null, 2)}\n`);
  }
}

function updateStylesFile(
  tree: Tree,
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

  tree.overwrite(stylesPath, stylesContent);
}

function updateAppConfig(tree: Tree, projectRoot: string, animations: boolean): void {
  const appConfigPath = `${projectRoot}/src/app/app.config.ts`;

  if (!tree.exists(appConfigPath)) {
    // If app.config.ts doesn't exist, skip this step
    return;
  }

  let appConfigContent = tree.read(appConfigPath)!.toString();

  // Check if Material providers are already added (idempotency)
  if (
    appConfigContent.includes('provideAnimations') ||
    appConfigContent.includes('provideNoopAnimations')
  ) {
    return;
  }

  // Add animation provider import
  const animationImport = animations
    ? "import { provideAnimations } from '@angular/platform-browser/animations';"
    : "import { provideNoopAnimations } from '@angular/platform-browser/animations';";

  // Add MatNativeDateModule import
  const dateModuleImport = "import { MatNativeDateModule } from '@angular/material/core';";

  // Find the imports section and add new imports
  const importRegex = /(import\s+.*?from\s+['"].*?['"];?\s*)+/;
  const match = appConfigContent.match(importRegex);

  if (match) {
    const lastImportEnd = match[0].length;
    appConfigContent =
      appConfigContent.slice(0, lastImportEnd) +
      `\n${animationImport}\n${dateModuleImport}\n` +
      appConfigContent.slice(lastImportEnd);
  }

  // Add providers to the providers array
  const providerToAdd = animations ? 'provideAnimations()' : 'provideNoopAnimations()';
  const providersToAdd = `${providerToAdd}, MatNativeDateModule`;

  // Find the providers array and add new providers
  const providersRegex = /providers:\s*\[/;
  appConfigContent = appConfigContent.replace(
    providersRegex,
    `providers: [\n    ${providersToAdd},\n   `,
  );

  tree.overwrite(appConfigPath, appConfigContent);
}
