import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { SchematicTestRunner, type UnitTestTree } from '@angular-devkit/schematics/testing';
import { validateText } from '@shlomoa/openui-spec';
import { describe, expect, it } from 'vitest';

import { getRepoRoot } from '../../e2e/utils/temp_areas';
import {
  addMaterialDependencies,
  collectionPath,
  createApplicationWorkspace,
  createEmptyWorkspace,
} from '../schematics/schematics.helpers';

/**
 * Keeps the OpenUI documents in the documentation honest. Every complete document in `docs/` is
 * validated with the canonical validator, and `docs/OPENUI_EXAMPLES.md` is executed: its
 * `ng generate` commands run against a fresh workspace, and its rejected documents produce the
 * diagnostics shown next to them.
 *
 * A block in the examples page starts with a marker comment followed by a `json` fence:
 *
 *   `<!-- openui: example path=<workspace path> -->`  the `bash` fences after it are commands
 *   `<!-- openui: invalid -->`                        the `text` fence after it is the diagnostics
 *   `<!-- openui: rejected -->`                       a `bash` command, then the `text` error excerpt
 */
const repoRoot = getRepoRoot();
const EXAMPLES_PAGE = 'docs/OPENUI_EXAMPLES.md';

interface Fence {
  language: string;
  body: string;
}

interface Block {
  kind: 'example' | 'invalid' | 'rejected';
  attributes: Record<string, string>;
  document: string;
  fences: Fence[];
}

function markdownFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry);
    if (statSync(entryPath).isDirectory()) {
      return markdownFiles(entryPath);
    }

    return entryPath.endsWith('.md') ? [entryPath] : [];
  });
}

function readFences(markdown: string): Fence[] {
  return [...markdown.matchAll(/^```(\w*)[^\n]*\n([\s\S]*?)^```[ \t]*$/gm)].map((match) => ({
    language: match[1],
    body: match[2].replace(/\n$/, ''),
  }));
}

/** The marked blocks of a page, in order; a block ends at the next marker or heading. */
function readBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | undefined;
  let fenceStart = -1;
  let language = '';
  const lines = markdown.split('\n');
  const body: string[] = [];

  for (const line of lines) {
    if (fenceStart >= 0) {
      if (/^```[ \t]*$/.test(line)) {
        const fence: Fence = { language, body: body.join('\n') };
        if (current && current.document === '' && fence.language === 'json') {
          current.document = fence.body;
        } else if (current) {
          current.fences.push(fence);
        }
        fenceStart = -1;
        body.length = 0;
      } else {
        body.push(line);
      }
      continue;
    }

    const marker = /^<!-- openui: (example|invalid|rejected)((?: \w+=\S+)*) -->$/.exec(line);
    if (marker) {
      current = {
        kind: marker[1] as Block['kind'],
        attributes: Object.fromEntries(
          [...marker[2].matchAll(/(\w+)=(\S+)/g)].map(([, key, value]) => [key, value]),
        ),
        document: '',
        fences: [],
      };
      blocks.push(current);
      continue;
    }
    if (/^#{1,6} /.test(line)) {
      current = undefined;
      continue;
    }
    const opening = /^```(\w*)/.exec(line);
    if (opening) {
      language = opening[1];
      fenceStart = 0;
    }
  }

  return blocks;
}

interface Command {
  schematic: string;
  options: Record<string, unknown>;
}

/** Parse the `ng generate angular-django2:<schematic> [name] [--option[=value]]...` lines of a fence. */
function readCommands(fence: Fence): Command[] {
  return fence.body
    .replace(/\\\n/g, ' ')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const [, schematic, rest] = /^ng generate angular-django2:([\w-]+)(.*)$/.exec(line.trim())!;
      const options: Record<string, unknown> = {};
      for (const token of rest.trim().split(/\s+/).filter(Boolean)) {
        const flag = /^--([\w-]+)(?:=(.*))?$/.exec(token);
        if (flag) {
          const key = flag[1].replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase());
          options[key] = flag[2] ?? true;
        } else {
          options['name'] = token;
        }
      }

      return { schematic, options };
    });
}

const CREATES_THE_APPLICATION = ['application', 'material-app'];

describe('documentation OpenUI documents', () => {
  const blocks = readBlocks(readFileSync(path.join(repoRoot, EXAMPLES_PAGE), 'utf8'));

  // The examples page shows invalid documents on purpose; TC-DOCS-OPENUI-04 pins their diagnostics.
  const invalidOnPurpose = new Set(
    blocks.filter((block) => block.kind === 'invalid').map((block) => block.document),
  );

  it('TC-DOCS-OPENUI-01: every complete document in docs/ passes the canonical validator', () => {
    let checked = 0;
    for (const file of markdownFiles(path.join(repoRoot, 'docs'))) {
      for (const fence of readFences(readFileSync(file, 'utf8'))) {
        if (fence.language !== 'json') {
          continue;
        }
        let value: unknown;
        try {
          value = JSON.parse(fence.body);
        } catch {
          continue;
        }
        if (typeof value !== 'object' || value === null || !('version' in value)) {
          continue;
        }
        if (invalidOnPurpose.has(fence.body)) {
          continue;
        }
        const relative = path.relative(repoRoot, file);
        expect(validateText(fence.body).map(String), relative).toEqual([]);
        expect((value as { version: string }).version, relative).toBe('0.8.0');
        checked += 1;
      }
    }

    // The tutorial, the CLI pages, and the examples page each hold documents.
    expect(checked).toBeGreaterThanOrEqual(10);
  });

  it('TC-DOCS-OPENUI-02: the examples page marks blocks of every kind', () => {
    for (const kind of ['example', 'invalid', 'rejected']) {
      expect(
        blocks.some((block) => block.kind === kind),
        kind,
      ).toBe(true);
    }
    for (const block of blocks) {
      expect(block.document, `a ${block.kind} block has no json fence`).not.toBe('');
    }
  });

  for (const block of blocks.filter((candidate) => candidate.kind === 'example')) {
    const documentPath = block.attributes['path'];

    it(`TC-DOCS-OPENUI-03: example ${documentPath} is valid and its commands run`, async () => {
      expect(validateText(block.document).map(String)).toEqual([]);

      const runs = block.fences
        .filter((fence) => fence.language === 'bash')
        .map((fence) => readCommands(fence));
      expect(runs.length, 'an example lists at least one command').toBeGreaterThan(0);

      const runner = new SchematicTestRunner('angular-django2', collectionPath);
      for (const commands of runs) {
        const creates = commands.some((command) =>
          CREATES_THE_APPLICATION.includes(command.schematic),
        );
        const documents = { [documentPath]: block.document };
        let tree: UnitTestTree = creates
          ? await createEmptyWorkspace(documents)
          : await createApplicationWorkspace(documents);
        const before = new Set(tree.files);

        for (const command of commands) {
          expect(command.options['document'], 'commands compile the example').toBe(documentPath);
          tree = await runner.runSchematic(command.schematic, command.options, tree);
          addMaterialDependencies(tree);
        }

        expect(
          tree.files.filter((file) => !before.has(file)),
          commands.map((command) => command.schematic).join(', '),
        ).not.toEqual([]);
      }
    });
  }

  for (const [index, block] of blocks
    .filter((candidate) => candidate.kind === 'invalid')
    .entries()) {
    it(`TC-DOCS-OPENUI-04: rejected document ${index + 1} shows the validator diagnostics`, () => {
      const shown = block.fences.find((fence) => fence.language === 'text')!.body;

      expect(validateText(block.document).map(String).join('\n')).toBe(shown);
    });
  }

  for (const [index, block] of blocks
    .filter((candidate) => candidate.kind === 'rejected')
    .entries()) {
    it(`TC-DOCS-OPENUI-05: schematic-rejected document ${index + 1} shows the real error`, async () => {
      // The validator accepts the document; the schematic makes the extra rule.
      expect(validateText(block.document).map(String)).toEqual([]);

      const [command] = readCommands(block.fences.find((fence) => fence.language === 'bash')!);
      const shown = block.fences.find((fence) => fence.language === 'text')!.body;
      const tree = await createApplicationWorkspace({
        [command.options['document'] as string]: block.document,
      });
      const runner = new SchematicTestRunner('angular-django2', collectionPath);

      await expect(runner.runSchematic(command.schematic, command.options, tree)).rejects.toThrow(
        shown,
      );
    });
  }
});
