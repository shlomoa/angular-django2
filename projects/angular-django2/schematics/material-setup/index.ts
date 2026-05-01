import type { Rule, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import type { MaterialSetupSchema } from './schema';

interface WorkspaceConfig {
  projects?: {
    [key: string]: {
      architect?: {
        build?: {
          options?: {
            styles?: string[];
          };
        };
      };
      sourceRoot?: string;
    };
  };
}

const PREBUILT_THEMES: Record<string, string> = {
  'indigo-pink': '@angular/material/prebuilt-themes/indigo-pink.css',
  'deeppurple-amber': '@angular/material/prebuilt-themes/deeppurple-amber.css',
  'pink-bluegrey': '@angular/material/prebuilt-themes/pink-bluegrey.css',
  'purple-green': '@angular/material/prebuilt-themes/purple-green.css',
};

const CUSTOM_THEME_SCSS = `@use '@angular/material' as mat;

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
  typography: mat.define-typography-config(),
  density: 0,
));

@include mat.all-component-themes($theme);
`;

const CUSTOM_THEME_SCSS_NO_TYPOGRAPHY = `@use '@angular/material' as mat;

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
  density: 0,
));

@include mat.all-component-themes($theme);
`;

export function materialSetup(options: MaterialSetupSchema): Rule {
  return (tree: Tree) => {
    const { project, theme = 'indigo-pink', typography = true } = options;

    // Read angular.json
    const angularJsonPath = '/angular.json';
    const angularJsonBuffer = tree.read(angularJsonPath);

    if (!angularJsonBuffer) {
      throw new SchematicsException('Could not find angular.json in the target workspace.');
    }

    const workspace = JSON.parse(angularJsonBuffer.toString()) as WorkspaceConfig;

    // Validate project exists
    if (!workspace.projects?.[project]) {
      throw new SchematicsException(`Project "${project}" not found in angular.json.`);
    }

    const projectConfig = workspace.projects[project];
    const sourceRoot = projectConfig.sourceRoot ?? `projects/${project}/src`;

    // Determine styles.scss path
    const stylesScssPath = `/${sourceRoot}/styles.scss`;

    if (theme === 'custom') {
      // Add custom theme to styles.scss
      const customThemeContent = typography ? CUSTOM_THEME_SCSS : CUSTOM_THEME_SCSS_NO_TYPOGRAPHY;

      if (tree.exists(stylesScssPath)) {
        const existingContent = tree.read(stylesScssPath)?.toString() ?? '';

        // Check for idempotency - don't add if already present
        if (existingContent.includes("@use '@angular/material' as mat")) {
          return tree; // Already configured
        }

        // Prepend custom theme
        tree.overwrite(stylesScssPath, `${customThemeContent}\n${existingContent}`);
      } else {
        // Create new styles.scss
        tree.create(stylesScssPath, customThemeContent);
      }
    } else {
      // Add prebuilt theme to angular.json styles array
      const prebuiltThemePath = PREBUILT_THEMES[theme];

      if (!prebuiltThemePath) {
        throw new SchematicsException(`Unknown theme: ${theme}`);
      }

      // Get current styles array
      const buildOptions = projectConfig.architect?.build?.options;

      if (!buildOptions) {
        throw new SchematicsException(`Build configuration not found for project "${project}".`);
      }

      const currentStyles = buildOptions.styles ?? [];

      // Check for idempotency - don't add if already present
      if (currentStyles.includes(prebuiltThemePath)) {
        return tree; // Already configured
      }

      // Add prebuilt theme to styles array
      buildOptions.styles = [prebuiltThemePath, ...currentStyles];

      // Write back to angular.json
      tree.overwrite(angularJsonPath, `${JSON.stringify(workspace, null, 2)}\n`);
    }

    return tree;
  };
}
