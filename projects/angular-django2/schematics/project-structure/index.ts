import type { Rule, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';

interface ProjectStructureOptions {
  project: string;
  prefix: string;
}

interface WorkspaceConfig {
  projects: Record<
    string,
    {
      root?: string;
      sourceRoot?: string;
    }
  >;
}

const BARREL_CONTENT = `// Public API for this directory
export {};
`;

const DIRECTORIES = ['core', 'shared/components', 'shared/pipes', 'features'] as const;

export function projectStructure(options: ProjectStructureOptions): Rule {
  return (tree: Tree) => {
    const { project } = options;

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

    // Determine the project path from angular.json
    const projectConfig = workspace.projects[project];
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

    return tree;
  };
}
