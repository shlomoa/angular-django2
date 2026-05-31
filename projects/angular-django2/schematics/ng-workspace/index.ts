import { normalize } from '@angular-devkit/core';
import type { Rule, Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface NgWorkspaceSchema {
  name: string;
}

const README_TEMPLATE_PATH = join(__dirname, '../../README.md');

function writeOrOverwrite(tree: Tree, filePath: string, content: string): void {
  if (tree.exists(filePath)) {
    tree.overwrite(filePath, content);
    return;
  }

  tree.create(filePath, content);
}

function getWorkspaceReadme(): string {
  return readFileSync(README_TEMPLATE_PATH, 'utf8');
}

export function ngWorkspace(options: NgWorkspaceSchema): Rule {
  return (tree: Tree) => {
    const name = options.name?.trim();

    if (!name) {
      throw new SchematicsException('Option "name" is required.');
    }

    const appName = normalize(name).split('/').pop() ?? name;

    writeOrOverwrite(
      tree,
      '/.github/copilot-instructions.md',
      `# ${appName} Repo Instructions

Read [these instructions first](https://github.com/shlomoa/internal/blob/main/github/copilot-instructions.md)

---
`,
    );
    writeOrOverwrite(tree, '/README.md', getWorkspaceReadme());

    return tree;
  };
}
