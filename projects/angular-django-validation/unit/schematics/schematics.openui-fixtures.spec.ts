import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { defaultCatalog, validateText } from '@shlomoa/openui-spec';
import { beforeAll, describe, expect, it } from 'vitest';

import { collectionPath, createApplicationWorkspace } from './schematics.helpers';

/**
 * Data-driven conformance suite for the OpenUI documents angular-django2 accepts and rejects.
 * It follows the shape of the spec's own conformance suite: a document, the stage that reports it,
 * and the diagnostics expected. The cases live in `unit/fixtures/openui/`; `manifest.json` lists them.
 */
const FIXTURE_DIRECTORY = join(__dirname, '../fixtures/openui');
const DOCUMENT_PATH = 'fixture.openui.json';

const STAGES = ['grammar', 'document', 'catalog', 'contract'] as const;

interface FixtureCase {
  file: string;
  stage: (typeof STAGES)[number] | 'schematic' | 'valid';
  summary: string;
  /** Diagnostics the spec validator reports, in order, as `path: code: message`. */
  diagnostics?: string[];
  /** Schematic that rejects a valid document, its options, and text its error contains. */
  schematic?: string;
  options?: Record<string, unknown>;
  error?: string;
}

interface Manifest {
  specVersion: string;
  cases: FixtureCase[];
}

const manifest = JSON.parse(
  readFileSync(join(FIXTURE_DIRECTORY, 'manifest.json'), 'utf8'),
) as Manifest;

function readFixture(file: string): string {
  return readFileSync(join(FIXTURE_DIRECTORY, file), 'utf8');
}

describe('OpenUI 0.8.0 fixture suite', () => {
  it('TC-FIXTURES-01: lists every fixture document exactly once', () => {
    const documents = readdirSync(FIXTURE_DIRECTORY)
      .filter((file) => file.endsWith('.openui.json'))
      .sort();

    expect(manifest.cases.map((testCase) => testCase.file).sort()).toEqual(documents);
  });

  it('TC-FIXTURES-02: targets the spec version the dependency implements', () => {
    expect(manifest.specVersion).toBe(defaultCatalog().version);
  });

  it('TC-FIXTURES-03: covers every validator stage, the schematic stage, and an accepted document', () => {
    const stages = new Set(manifest.cases.map((testCase) => testCase.stage));

    for (const stage of [...STAGES, 'schematic', 'valid']) {
      expect(stages, `no fixture for the ${stage} stage`).toContain(stage);
    }
  });

  describe('validator stages', () => {
    for (const testCase of manifest.cases.filter((candidate) =>
      (STAGES as readonly string[]).includes(candidate.stage),
    )) {
      it(`TC-FIXTURES-04: ${testCase.file} reports ${testCase.stage} diagnostics (${testCase.summary})`, () => {
        const diagnostics = validateText(readFixture(testCase.file));

        expect(diagnostics.map(String)).toEqual(testCase.diagnostics);
        for (const diagnostic of diagnostics) {
          expect(diagnostic.code.startsWith(`${testCase.stage}/`)).toBe(true);
        }
      });
    }
  });

  describe('accepted documents', () => {
    for (const testCase of manifest.cases.filter((candidate) => candidate.stage === 'valid')) {
      it(`TC-FIXTURES-05: ${testCase.file} is valid (${testCase.summary})`, () => {
        expect(validateText(readFixture(testCase.file)).map(String)).toEqual([]);
      });
    }
  });

  describe('schematic stage', () => {
    let runner: SchematicTestRunner;

    beforeAll(() => {
      runner = new SchematicTestRunner('angular-django2', collectionPath);
    });

    for (const testCase of manifest.cases.filter((candidate) => candidate.stage === 'schematic')) {
      it(`TC-FIXTURES-06: ${testCase.schematic} rejects ${testCase.file} (${testCase.summary})`, async () => {
        const text = readFixture(testCase.file);
        // A schematic-stage document is valid for the spec: the schematic makes the extra rule.
        expect(validateText(text).map(String)).toEqual([]);

        const tree = await createApplicationWorkspace({ [DOCUMENT_PATH]: text });
        const before = [...tree.files].sort();

        await expect(
          runner.runSchematic(
            testCase.schematic!,
            { document: DOCUMENT_PATH, ...testCase.options },
            tree,
          ),
        ).rejects.toThrow(testCase.error!);
        expect([...tree.files].sort()).toEqual(before);
      });
    }
  });
});
