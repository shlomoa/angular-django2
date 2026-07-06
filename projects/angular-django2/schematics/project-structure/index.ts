import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { readWorkspace, requireWorkspaceProject } from '../utility/workspace';
import { BARREL_CONTENT, DIRECTORIES } from '../utility/directory-structure';

interface ProjectStructureOptions {
  project: string;
  prefix: string;
}

export function projectStructure(options: ProjectStructureOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const { project } = options;

    // Validate project exists
    const workspace = readWorkspace(tree);
    const projectConfig = requireWorkspaceProject(workspace, project);

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

    return tree;
  };
}
