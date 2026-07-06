import type { Tree } from '@angular-devkit/schematics';
import { SchematicsException } from '@angular-devkit/schematics';
import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

/**
 * Hook describing how to provision a single application source file.
 *
 * Exactly one of `content`, `path`, or `template` must be supplied:
 *
 * - `content`  — inline body written verbatim to the target path.
 * - `path`     — local filesystem path read at schematic execution time
 *                (the "user provides a link to the file" mode).
 * - `template` — literal body whose `{{key}}` placeholders are replaced
 *                with the matching value from `params`. Useful for
 *                instantiating a pre-defined template with values.
 */
export interface FileHook {
  content?: string;
  path?: string;
  template?: string;
  params?: Record<string, string | number | boolean>;
}

/**
 * Recognized file identifiers. Each key maps to a fixed relative path under
 * the resolved source root (`src/` by default, or the selected project's
 * `sourceRoot` from `angular.json`).
 *
 * The set matches the application source files documented at
 * https://angular.dev/reference/configs/file-structure#application-source-files.
 */
export type AppSourceFileKey =
  | 'favicon'
  | 'indexHtml'
  | 'mainTs'
  | 'stylesCss'
  | 'appConfigTs'
  | 'appComponentTs'
  | 'appComponentHtml'
  | 'appComponentCss'
  | 'appComponentSpecTs'
  | 'appModuleTs'
  | 'appRoutesTs';

const APP_SOURCE_FILE_PATHS: Record<AppSourceFileKey, string> = {
  favicon: 'favicon.ico',
  indexHtml: 'index.html',
  mainTs: 'main.ts',
  stylesCss: 'styles.css',
  appConfigTs: 'app/app.config.ts',
  appComponentTs: 'app/app.component.ts',
  appComponentHtml: 'app/app.component.html',
  appComponentCss: 'app/app.component.css',
  appComponentSpecTs: 'app/app.component.spec.ts',
  appModuleTs: 'app/app.module.ts',
  appRoutesTs: 'app/app.routes.ts',
};

export function writeOrOverwrite(tree: Tree, filePath: string, content: string): void {
  if (tree.exists(filePath)) {
    tree.overwrite(filePath, content);
    return;
  }

  tree.create(filePath, content);
}

function substituteTemplate(
  template: string,
  params: Record<string, string | number | boolean> | undefined,
): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      return String(params[key]);
    }
    return match;
  });
}

function resolveHookContent(hook: FileHook, fileKey: AppSourceFileKey): string {
  const modes = ['content', 'path', 'template'].filter(
    (mode) => hook[mode as keyof FileHook] !== undefined,
  );

  if (modes.length === 0) {
    throw new SchematicsException(
      `files.${fileKey} must specify exactly one of "content", "path", or "template".`,
    );
  }

  if (modes.length > 1) {
    throw new SchematicsException(
      `files.${fileKey} must specify only one of "content", "path", or "template" (got: ${modes.join(', ')}).`,
    );
  }

  if (hook.content !== undefined) {
    return hook.content;
  }

  if (hook.path !== undefined) {
    // Relative paths are resolved against the schematic's current working
    // directory. Prefer absolute paths for predictable behavior across
    // invocation contexts.
    const resolvedPath = isAbsolute(hook.path) ? hook.path : resolve(process.cwd(), hook.path);
    try {
      return readFileSync(resolvedPath, 'utf8');
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new SchematicsException(
        `Failed to read files.${fileKey}.path "${hook.path}": ${reason}`,
      );
    }
  }

  return substituteTemplate(hook.template!, hook.params);
}

export function applyFileHooks(
  tree: Tree,
  sourceRoot: string,
  files: Partial<Record<AppSourceFileKey, FileHook>>,
): void {
  for (const [key, hook] of Object.entries(files) as [AppSourceFileKey, FileHook | undefined][]) {
    if (!hook) {
      continue;
    }

    const relativePath = APP_SOURCE_FILE_PATHS[key];
    if (!relativePath) {
      throw new SchematicsException(`Unknown application source file key "${key}".`);
    }

    const content = resolveHookContent(hook, key);
    const targetPath = `${sourceRoot}/${relativePath}`;
    writeOrOverwrite(tree, targetPath, content);
  }
}
