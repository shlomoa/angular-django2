import type { Rule, Tree, SchematicContext } from '@angular-devkit/schematics';
import { chain, externalSchematic, SchematicsException } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import type { NgAppSchema } from './schema';

/**
 * Material App Shell Template for app.component.html
 * Responsive sidenav layout with toolbar and content area
 */
const APP_SHELL_TEMPLATE = `<mat-toolbar color="primary">
  <button mat-icon-button (click)="drawer.toggle()" aria-label="Toggle sidenav">
    <mat-icon>menu</mat-icon>
  </button>
  <span>{{ title }}</span>
</mat-toolbar>

<mat-sidenav-container class="sidenav-container">
  <mat-sidenav #drawer mode="side" opened class="sidenav">
    <mat-nav-list>
      <a mat-list-item routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
        <mat-icon matListItemIcon>home</mat-icon>
        <span matListItemTitle>Home</span>
      </a>
    </mat-nav-list>
  </mat-sidenav>

  <mat-sidenav-content>
    <div class="content">
      <router-outlet />
    </div>
  </mat-sidenav-content>
</mat-sidenav-container>
`;

/**
 * Material App Shell Styles for app.component.scss
 */
const APP_SHELL_STYLES = `.sidenav-container {
  position: absolute;
  top: 64px;
  bottom: 0;
  left: 0;
  right: 0;
}

.sidenav {
  width: 250px;
}

.content {
  padding: 20px;
}

mat-toolbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
}
`;

/**
 * Material App Shell Component TypeScript
 */
const APP_SHELL_COMPONENT_TS = `import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
  ],
  templateUrl: './TEMPLATE_FILE',
  styleUrl: './STYLE_FILE',
})
export class CLASS_NAME {
  title = 'REPLACE_APP_NAME';
}
`;

interface WorkspaceConfig {
  projects: Record<
    string,
    {
      root?: string;
      sourceRoot?: string;
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

const BARREL_CONTENT = `// Public API for this directory
export {};
`;

const DIRECTORIES = ['core', 'shared/components', 'shared/pipes', 'features'] as const;

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
    const angularJsonPath = '/angular.json';
    const angularJsonBuffer = tree.read(angularJsonPath);

    let projectExists = false;
    if (angularJsonBuffer) {
      try {
        const workspace = JSON.parse(angularJsonBuffer.toString()) as WorkspaceConfig;
        projectExists = !!workspace.projects[resolvedOptions.name];
      } catch {
        projectExists = false;
      }
    }

    if (!projectExists) {
      // externalSchematic is async — chain() ensures it completes before material setup runs
      return chain([
        externalSchematic('@schematics/angular', 'application', {
          name: resolvedOptions.name,
          routing: resolvedOptions.routing,
          standalone: resolvedOptions.standalone,
          ssr: resolvedOptions.ssr,
          zoneless: resolvedOptions.zoneless,
          style: resolvedOptions.style,
          prefix: resolvedOptions.prefix,
        }),
        (innerTree: Tree, innerContext: SchematicContext) => {
          applyMaterialSetup(innerTree, innerContext, resolvedOptions);
          return innerTree;
        },
      ])(tree, context);
    }

    context.logger.info(
      `Project '${resolvedOptions.name}' already exists, skipping application generation`,
    );
    applyMaterialSetup(tree, context, resolvedOptions);
    return tree;
  };
}

function applyMaterialSetup(
  tree: Tree,
  context: SchematicContext,
  options: ResolvedNgAppSchema,
): void {
  addMaterialDependencies(tree, context);
  configureMaterial(tree, options.name, options.theme, options.typography, options.animations);
  createDirectoryStructure(tree, options.name);
  generateMaterialAppShell(tree, options.name, options.style);
}

/**
 * Add @angular/material and @angular/cdk to package.json dependencies
 */
function addMaterialDependencies(tree: Tree, context: SchematicContext): void {
  const packageJsonPath = '/package.json';
  const packageJsonBuffer = tree.read(packageJsonPath);

  if (!packageJsonBuffer) {
    context.logger.warn('Could not find package.json. Skipping Material dependency installation.');
    return;
  }

  const packageJson = JSON.parse(packageJsonBuffer.toString());

  // Add Material and CDK dependencies if not already present
  if (!packageJson.dependencies) {
    packageJson.dependencies = {};
  }

  // Use the same version as the Angular version if possible
  const angularVersion = packageJson.dependencies['@angular/core'] || '^22.0.0';

  if (!packageJson.dependencies['@angular/material']) {
    packageJson.dependencies['@angular/material'] = angularVersion;
  }

  if (!packageJson.dependencies['@angular/cdk']) {
    packageJson.dependencies['@angular/cdk'] = angularVersion;
  }

  if (!packageJson.dependencies['@angular/animations']) {
    packageJson.dependencies['@angular/animations'] = angularVersion;
  }

  tree.overwrite(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  // Schedule npm install
  context.addTask(new NodePackageInstallTask());
}

/**
 * Configure Angular Material
 */
function configureMaterial(
  tree: Tree,
  projectName: string,
  theme: string,
  typography: boolean,
  animations: boolean,
): void {
  // Validate project exists
  const angularJsonPath = '/angular.json';
  const angularJsonBuffer = tree.read(angularJsonPath);
  if (!angularJsonBuffer) {
    throw new SchematicsException('Could not find angular.json in the workspace.');
  }

  const workspace = JSON.parse(angularJsonBuffer.toString()) as WorkspaceConfig;
  if (!workspace.projects[projectName]) {
    throw new SchematicsException(`Project "${projectName}" not found in angular.json.`);
  }

  // Determine the project path from angular.json
  const projectConfig = workspace.projects[projectName];
  const projectRoot = projectConfig.root || '';
  const stylesPath = projectRoot ? `${projectRoot}/src/styles.scss` : 'src/styles.scss';

  // Update angular.json for prebuilt themes
  if (theme !== 'custom') {
    updateAngularJsonStyles(tree, workspace, projectName, THEME_MAPPING[theme]);
  }

  // Update styles.scss
  updateStylesFile(tree, stylesPath, theme, typography);

  // Update app.config.ts to include Material providers
  updateAppConfig(tree, projectRoot, animations);
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

  if (tree.exists(stylesPath)) {
    tree.overwrite(stylesPath, stylesContent);
  } else {
    tree.create(stylesPath, stylesContent);
  }
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
  appConfigContent = appConfigContent.replace(
    providersRegex,
    `providers: [\n    ${providerToAdd},\n   `,
  );

  tree.overwrite(appConfigPath, appConfigContent);
}

/**
 * Create standard directory structure
 */
function createDirectoryStructure(tree: Tree, projectName: string): void {
  // Read angular.json to get the actual project root
  const angularJsonPath = '/angular.json';
  const angularJsonBuffer = tree.read(angularJsonPath);
  if (!angularJsonBuffer) {
    throw new SchematicsException('Could not find angular.json in the workspace.');
  }

  const workspace = JSON.parse(angularJsonBuffer.toString()) as WorkspaceConfig;
  const projectConfig = workspace.projects[projectName];
  if (!projectConfig) {
    throw new SchematicsException(`Project "${projectName}" not found in angular.json.`);
  }

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
        continue;
      }
    }

    // Create or overwrite with barrel content
    tree.create(indexPath, BARREL_CONTENT);
  }

  // Also ensure shared/index.ts exists
  const sharedIndexPath = `${appRoot}/shared/index.ts`;
  if (!tree.exists(sharedIndexPath)) {
    tree.create(sharedIndexPath, BARREL_CONTENT);
  }
}

/**
 * Generate Material App Shell by updating app.component files
 */
function generateMaterialAppShell(tree: Tree, projectName: string, style: string): void {
  // Read angular.json to get the actual project root
  const angularJsonPath = '/angular.json';
  const angularJsonBuffer = tree.read(angularJsonPath);
  if (!angularJsonBuffer) {
    throw new SchematicsException('Could not find angular.json in the workspace.');
  }

  const workspace = JSON.parse(angularJsonBuffer.toString()) as WorkspaceConfig;
  const projectConfig = workspace.projects[projectName];
  if (!projectConfig) {
    throw new SchematicsException(`Project "${projectName}" not found in angular.json.`);
  }

  const projectRoot = projectConfig.root || '';
  const appRoot = projectRoot ? `${projectRoot}/src/app` : 'src/app';

  // Try both old and new naming conventions
  // Angular 21+ uses app.html, app.ts, app.scss
  // Older versions use app.component.html, app.component.ts, app.component.scss
  const htmlPaths = [`${appRoot}/app.html`, `${appRoot}/app.component.html`];
  const htmlPath = htmlPaths.find((p) => tree.exists(p));
  if (htmlPath) {
    tree.overwrite(htmlPath, APP_SHELL_TEMPLATE);
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
  }
}
