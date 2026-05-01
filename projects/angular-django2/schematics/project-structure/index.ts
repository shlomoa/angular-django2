import type { Rule, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import type { ProjectStructureSchema } from './schema';

interface WorkspaceConfig {
  projects?: {
    [key: string]: {
      sourceRoot?: string;
    };
  };
}

const BARREL_EXPORT_CONTENT = '// Public API for this directory\nexport {};\n';

const DIRECTORIES = ['core', 'shared/components', 'shared/pipes', 'features'] as const;

export function projectStructure(options: ProjectStructureSchema): Rule {
  return (tree: Tree) => {
    const { project } = options;

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
    const appPath = `/${sourceRoot}/app`;

    // Create directories with barrel exports
    for (const dir of DIRECTORIES) {
      const dirPath = `${appPath}/${dir}`;
      const indexPath = `${dirPath}/index.ts`;

      // Create directory if it doesn't exist (Tree.create will handle directory creation)
      if (!tree.exists(indexPath)) {
        tree.create(indexPath, BARREL_EXPORT_CONTENT);
      }
      // Idempotency: don't overwrite existing index.ts files
    }

    return tree;
  };
}
