import { readFileSync } from 'node:fs';
import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, type UnitTestTree } from '@angular-devkit/schematics/testing';
import type { OpenUiElement } from '@shlomoa/openui-spec';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  angularCollectionPath,
  collectionPath,
  openUiDocumentString as openUiDocument,
  schematicSchemaPath,
} from './schematics.helpers';

const DOCUMENT_PATH = 'ui.openui.json';
const FEATURES = '/projects/demo-app/src/app/features';
const OPTIONS = { document: DOCUMENT_PATH, project: 'demo-app', path: 'src/app/features' };

/** Title, content with a form and a note, and an actions region with a field. */
const confirmDelete: OpenUiElement = {
  id: 'confirmDelete',
  type: 'dialog',
  attrs: {
    'uses.open': 'false',
    'uses.modal': 'true',
    'produces.close': null,
    'produces.cancel': null,
  },
  children: [
    {
      id: 'dialogTitle',
      type: 'header',
      attrs: { 'uses.title': '"Delete {user}? @now"' },
      children: [{ id: 'subtitle', type: 'SurfaceContainers' }],
    },
    {
      id: 'dialogContent',
      type: 'section',
      children: [
        {
          id: 'reason',
          type: 'Form',
          attrs: { 'uses.title': '"Reason"', 'uses.action': '"/api/reasons/"' },
          children: [{ id: 'comment', type: 'TextInputs', attrs: { 'uses.label': '"Comment"' } }],
        },
        { id: 'warning', type: 'SurfaceContainers' },
      ],
    },
    {
      id: 'dialogActions',
      type: 'footer',
      children: [{ id: 'nickname', type: 'TextInputs', attrs: { 'uses.label': '"Nickname"' } }],
    },
  ],
};

const minimalDialog: OpenUiElement = {
  id: 'notice',
  type: 'dialog',
  children: [{ id: 'noticeContent', type: 'section' }],
};

describe('dialog schematic (widgets/dialog)', () => {
  let runner: SchematicTestRunner;
  let angularRunner: SchematicTestRunner;

  beforeEach(() => {
    runner = new SchematicTestRunner('angular-django2', collectionPath);
    angularRunner = new SchematicTestRunner('@schematics/angular', angularCollectionPath);
  });

  async function createApplicationTree(
    document: string,
    dependencies: Record<string, string> = {
      '@angular/cdk': '^22.0.0',
      '@angular/forms': '^22.0.0',
      '@angular/material': '^22.0.0',
    },
  ): Promise<UnitTestTree> {
    let tree = (await angularRunner.runSchematic(
      'workspace',
      { name: 'demo', version: '22.0.0', newProjectRoot: 'projects' },
      Tree.empty(),
    )) as UnitTestTree;
    tree = (await angularRunner.runSchematic(
      'application',
      { name: 'demo-app', standalone: true, routing: false, style: 'scss', zoneless: true },
      tree,
    )) as UnitTestTree;

    const packageJson = JSON.parse(tree.readContent('/package.json'));
    Object.assign(packageJson.dependencies, dependencies);
    tree.overwrite('/package.json', JSON.stringify(packageJson, null, 2));
    tree.create(`/${DOCUMENT_PATH}`, document);

    return tree;
  }

  async function generate(...children: OpenUiElement[]): Promise<UnitTestTree> {
    return runner.runSchematic(
      'dialog',
      OPTIONS,
      await createApplicationTree(openUiDocument(...children)),
    );
  }

  async function expectRejected(
    children: OpenUiElement[],
    message: string,
    options: Record<string, unknown> = OPTIONS,
  ): Promise<void> {
    const tree = await createApplicationTree(openUiDocument(...children));
    await expect(runner.runSchematic('dialog', options, tree)).rejects.toThrow(message);
  }

  describe('collection and schema', () => {
    it('TC-DIALOG-01: registers dialog with a schema that documents every option and requires a document', () => {
      const collection = JSON.parse(readFileSync(collectionPath, 'utf8'));
      expect(collection.schematics.dialog).toMatchObject({
        factory: './dialog/index#dialog',
        schema: './dialog/schema.json',
      });
      expect(collection.schematics.dialog.description).toContain('OpenUI dialog');

      const schema = JSON.parse(readFileSync(schematicSchemaPath('dialog'), 'utf8'));
      expect(schema.additionalProperties).toBe(false);
      expect(schema.required).toEqual(['document']);
      expect(Object.keys(schema.properties)).toEqual([
        'name',
        'path',
        'project',
        'document',
        'nodeId',
      ]);
      for (const property of Object.values<{ description?: string }>(schema.properties)) {
        expect(property.description).toBeTruthy();
      }
      // The Angular CLI keys a multi-alias option by its last alias, so `nodeId` comes last.
      expect(schema.properties.nodeId.aliases).toEqual([
        'element-id',
        'elementId',
        'node-id',
        'nodeId',
      ]);
    });

    it('TC-DIALOG-02: rejects a missing document and options the schema does not declare', async () => {
      const tree = await createApplicationTree(openUiDocument(confirmDelete));
      await expect(runner.runSchematic('dialog', { project: 'demo-app' }, tree)).rejects.toThrow(
        /document/,
      );
      await expect(
        runner.runSchematic('dialog', { ...OPTIONS, modal: true }, tree),
      ).rejects.toThrow(/modal/);
    });
  });

  describe('compilation', () => {
    it('TC-DIALOG-03: compiles a dialog node into a standalone OnPush Material dialog component', async () => {
      const generated = await generate(confirmDelete);

      const root = `${FEATURES}/confirm-delete`;
      expect(generated.files).toEqual(
        expect.arrayContaining([
          `${root}/confirm-delete.ts`,
          `${root}/confirm-delete.html`,
          `${root}/confirm-delete.css`,
          `${root}/confirm-delete.spec.ts`,
        ]),
      );
      const source = generated.readContent(`${root}/confirm-delete.ts`);

      expect(source).toContain("selector: 'app-confirm-delete'");
      expect(source).toContain('imports: [MatDialogModule');
      expect(source).toContain("templateUrl: './confirm-delete.html'");
      expect(source).toContain("styleUrl: './confirm-delete.css'");
      expect(source).toContain('changeDetection: ChangeDetectionStrategy.OnPush');
      expect(source).toContain('export class ConfirmDelete {');
      expect(source).toContain("from '@angular/material/dialog'");
      expect(source).not.toContain('standalone');
      for (const marker of ['import', 'injected services', 'input signals', 'output signals']) {
        expect(source).toContain(`// Begin ${marker} section`);
        expect(source).toContain(`// End ${marker} section`);
      }
    });

    it('TC-DIALOG-04: maps uses.open, uses.modal, produces.close and produces.cancel to signals', async () => {
      const generated = await generate(confirmDelete);
      const source = generated.readContent(`${FEATURES}/confirm-delete/confirm-delete.ts`);

      expect(source).toContain('readonly open = model(false);');
      expect(source).toContain('readonly modal = input(true);');
      expect(source).toContain('readonly closed = output<void>();');
      expect(source).toContain('readonly cancelled = output<void>();');
      expect(source).toContain('if (dismissed) {\n        this.cancelled.emit();');
      expect(source).toContain('this.closed.emit();');

      const initial = await generate({
        id: 'notice',
        type: 'dialog',
        attrs: { 'uses.open': 'true', 'uses.modal': 'false' },
        children: [{ id: 'noticeContent', type: 'section' }],
      });
      const initialSource = initial.readContent(`${FEATURES}/notice/notice.ts`);
      expect(initialSource).toContain('readonly open = model(true);');
      expect(initialSource).toContain('readonly modal = input(false);');
    });

    it('TC-DIALOG-05: opens the content with MatDialog as a modal that is labelled and described', async () => {
      const generated = await generate(confirmDelete);
      const source = generated.readContent(`${FEATURES}/confirm-delete/confirm-delete.ts`);

      expect(source).toContain("viewChild.required<TemplateRef<unknown>>('dialogTemplate')");
      expect(source).toContain('this.dialog.open(this.template(), {');
      expect(source).toContain("ariaDescribedBy: 'confirm-delete-content',");
      expect(source).toContain('ariaModal: modal,');
      expect(source).toContain('hasBackdrop: modal,');
      expect(source).not.toContain('ariaLabel');
      expect(source).not.toContain('disableClose');
      expect(source).toContain("event.key === 'Escape'");
      expect(source).toContain('dialogRef.getState() === MatDialogState.CLOSING');
      expect(source).toContain('inject(DestroyRef).onDestroy(() => this.dialogRef?.close());');
    });

    it('TC-DIALOG-06: maps the regions to a title, a described content and actions around the three sections', async () => {
      const generated = await generate(confirmDelete);
      const template = generated.readContent(`${FEATURES}/confirm-delete/confirm-delete.html`);

      expect(template).toBe(`<ng-template #dialogTemplate>
  <h2 mat-dialog-title>Delete &#123;user&#125;? &#64;now</h2>
  <!-- Begin header section -->
  <app-subtitle></app-subtitle>
  <!-- End header section -->
  <mat-dialog-content id="confirm-delete-content">
    <!-- Begin children section -->
    <app-reason-form (submitted)="onSubmitted($event)"></app-reason-form>
    <app-warning></app-warning>
    <!-- End children section -->
  </mat-dialog-content>
  <mat-dialog-actions>
    <!-- Begin actions section -->
    <app-nickname-field [label]="'Nickname'"></app-nickname-field>
    <!-- End actions section -->
  </mat-dialog-actions>
</ng-template>
`);
    });

    it('TC-DIALOG-07: compiles region children into components embedded in document order', async () => {
      const generated = await generate(confirmDelete);
      const root = `${FEATURES}/confirm-delete`;
      const source = generated.readContent(`${root}/confirm-delete.ts`);

      expect(generated.files).toEqual(
        expect.arrayContaining([
          `${root}/subtitle/subtitle.ts`,
          `${root}/warning/warning.ts`,
          `${root}/nickname-field/nickname-field.ts`,
        ]),
      );
      expect(generated.files.some((file) => file.startsWith(`${root}/reason-form/`))).toBe(true);
      expect(source).toContain("import { Subtitle } from './subtitle/subtitle';");
      expect(source).toContain("import { Warning } from './warning/warning';");
      expect(source).toContain('onSubmitted($event: unknown): void');
      expect(source).toMatch(/imports: \[MatDialogModule, [^\]]*Warning[^\]]*\]/);
    });

    it('TC-DIALOG-08: omits the optional regions, outputs and title, and names an untitled dialog', async () => {
      const generated = await generate(minimalDialog);
      const source = generated.readContent(`${FEATURES}/notice/notice.ts`);
      const template = generated.readContent(`${FEATURES}/notice/notice.html`);

      expect(template).toBe(`<ng-template #dialogTemplate>
  <mat-dialog-content id="notice-content">
    <!-- Begin children section -->
    <!-- End children section -->
  </mat-dialog-content>
</ng-template>
`);
      expect(source).toContain('readonly open = model(false);');
      expect(source).toContain('readonly modal = input(true);');
      expect(source).toContain("ariaLabel: 'Notice',");
      expect(source).not.toMatch(/\boutput\b[,<(]/);
      expect(source).not.toContain('MatDialogState');
      expect(source).not.toContain('rxjs');
      expect(source).toContain('dialogRef.afterClosed().subscribe(() => {');
    });

    it('TC-DIALOG-09: generates only the outputs the node declares', async () => {
      const closeOnly = await generate({
        ...minimalDialog,
        attrs: { 'produces.close': null },
      });
      const closeSource = closeOnly.readContent(`${FEATURES}/notice/notice.ts`);
      expect(closeSource).toContain('readonly closed = output<void>();');
      expect(closeSource).not.toContain('readonly cancelled');
      expect(closeSource).toContain('if (!dismissed) {\n        this.closed.emit();');

      const cancelOnly = await generate({
        ...minimalDialog,
        attrs: { 'produces.cancel': null },
      });
      const cancelSource = cancelOnly.readContent(`${FEATURES}/notice/notice.ts`);
      expect(cancelSource).toContain('readonly cancelled = output<void>();');
      expect(cancelSource).not.toContain('readonly closed');
    });

    it('TC-DIALOG-10: defaults the name to the node id, honours --name, --nodeId and the default path', async () => {
      const tree = await createApplicationTree(openUiDocument(minimalDialog, confirmDelete));

      const first = await runner.runSchematic('dialog', { document: DOCUMENT_PATH }, tree);
      expect(first.files).toContain('/projects/demo-app/src/app/notice/notice.ts');

      const named = await runner.runSchematic(
        'dialog',
        { ...OPTIONS, name: 'side-notice', nodeId: 'notice' },
        await createApplicationTree(openUiDocument(minimalDialog, confirmDelete)),
      );
      expect(named.files).toContain(`${FEATURES}/side-notice/side-notice.ts`);
      expect(named.readContent(`${FEATURES}/side-notice/side-notice.html`)).toContain(
        'id="side-notice-content"',
      );

      const selected = await runner.runSchematic(
        'dialog',
        { ...OPTIONS, nodeId: 'confirmDelete' },
        await createApplicationTree(openUiDocument(minimalDialog, confirmDelete)),
      );
      expect(selected.files).toContain(`${FEATURES}/confirm-delete/confirm-delete.ts`);
    });
  });

  describe('unsupported input', () => {
    it('TC-DIALOG-11: rejects attributes the dialog does not support, including the Modal overlay vocabulary', async () => {
      for (const key of [
        'uses.initialFocus',
        'uses.restoreFocus',
        'uses.dismissOnEscape',
        'produces.dismissRequest',
        'behaves.submit',
        'uses.color',
        'modal',
      ]) {
        await expectRejected(
          [{ ...minimalDialog, attrs: { [key]: null } }],
          `unsupported attribute(s): ${key}`,
        );
      }
    });

    it('TC-DIALOG-12: rejects values that cannot be evaluated at generation time or break the marker rule', async () => {
      const cases: [Record<string, string | null>, string][] = [
        [{ 'uses.modal': 'isModal' }, 'must be the unquoted string "true" or "false"'],
        [{ 'uses.open': 'a.b' }, 'must be the unquoted string "true" or "false"'],
        [{ 'produces.close': 'Host#Dialog.onClose' }, 'produces.close must be null when present'],
        [{ 'produces.cancel': 'onCancel' }, 'produces.cancel must be null when present'],
      ];

      for (const [attrs, message] of cases) {
        await expectRejected([{ ...minimalDialog, attrs }], message);
      }
    });

    it('TC-DIALOG-13: rejects children that break the ordered title, content, actions regions', async () => {
      const title: OpenUiElement = { id: 'title', type: 'header' };
      const content: OpenUiElement = { id: 'content', type: 'section' };
      const actions: OpenUiElement = { id: 'actions', type: 'footer' };
      const cases: [OpenUiElement[], string][] = [
        [[], 'needs exactly one "section" child'],
        [[title, actions], 'needs exactly one "section" child'],
        [[content, title], 'is out of order'],
        [[actions, content], 'is out of order'],
        [[content, { id: 'second', type: 'section' }], 'is a second region'],
        [[title, { id: 'again', type: 'header' }, content], 'is a second region'],
        [[content, { id: 'field', type: 'TextInputs' }], 'which is not a dialog region'],
        [[content, { id: 'surface', type: 'SurfaceContainers' }], 'which is not a dialog region'],
      ];

      for (const [children, message] of cases) {
        await expectRejected([{ id: 'notice', type: 'dialog', children }], message);
      }
    });

    it('TC-DIALOG-14: rejects region attributes, empty titles and slots on region children', async () => {
      const dialogWith = (...children: OpenUiElement[]): OpenUiElement => ({
        id: 'notice',
        type: 'dialog',
        children,
      });
      const content: OpenUiElement = { id: 'content', type: 'section' };
      const cases: [OpenUiElement, string][] = [
        [
          dialogWith({ id: 'title', type: 'header', attrs: { 'uses.label': '"x"' } }, content),
          'unsupported attribute(s): uses.label',
        ],
        [
          dialogWith({ id: 'title', type: 'header', attrs: { 'uses.title': '" "' } }, content),
          'attribute "uses.title" must not be empty',
        ],
        [
          dialogWith(
            { id: 'title', type: 'header', attrs: { 'uses.title': 'titleText' } },
            content,
          ),
          'attribute "uses.title" has the unquoted value titleText',
        ],
        [
          dialogWith({ ...content, attrs: { 'uses.title': '"x"' } }),
          'unsupported attribute(s): uses.title',
        ],
        [
          dialogWith(content, {
            id: 'actions',
            type: 'footer',
            attrs: { 'uses.slot': '"actions"' },
          }),
          'unsupported attribute(s): uses.slot',
        ],
        [
          dialogWith({
            ...content,
            children: [
              { id: 'panel', type: 'SurfaceContainers', attrs: { 'uses.slot': '"actions"' } },
            ],
          }),
          'cannot choose a uses.slot; the region decides its slot',
        ],
        [
          dialogWith({
            ...content,
            children: [{ id: 'grid', type: 'Grid' }],
          }),
          'has type "Grid", which cannot be composed into a container',
        ],
      ];

      for (const [node, message] of cases) {
        await expectRejected([node], message);
      }
    });

    it('TC-DIALOG-15: rejects a Modal overlay behavior that targets the dialog and accepts one that does not', async () => {
      const overlay = (target: string): OpenUiElement => ({
        id: 'modalBehavior',
        type: 'ModalOverlay',
        attrs: { 'uses.target': JSON.stringify(target), 'uses.restoreFocus': 'false' },
      });

      await expectRejected(
        [minimalDialog, overlay('notice')],
        'ModalOverlay behavior targeting the dialog "notice", which the dialog schematic does not compile',
      );

      const other: OpenUiElement = { id: 'sheet', type: 'SurfaceContainers' };
      const generated = await runner.runSchematic(
        'dialog',
        OPTIONS,
        await createApplicationTree(openUiDocument(minimalDialog, other, overlay('sheet'))),
      );
      expect(generated.files).toContain(`${FEATURES}/notice/notice.ts`);
    });

    it('TC-DIALOG-16: rejects documents without a dialog, the wrong node type and unknown ids', async () => {
      await expectRejected(
        [{ id: 'panel', type: 'SurfaceContainers' }],
        'contains no "dialog" element',
      );
      await expectRejected(
        [minimalDialog, { id: 'panel', type: 'SurfaceContainers' }],
        'has type "SurfaceContainers" but this schematic expects "dialog"',
        { ...OPTIONS, nodeId: 'panel' },
      );
      await expectRejected([minimalDialog], 'was not found in the document', {
        ...OPTIONS,
        nodeId: 'missing',
      });
      const tree = await createApplicationTree(openUiDocument(minimalDialog));
      await expect(
        runner.runSchematic('dialog', { ...OPTIONS, document: 'missing.openui.json' }, tree),
      ).rejects.toThrow('was not found in the workspace');
    });

    it('TC-DIALOG-17: validates the name, path and prerequisites before writing any file', async () => {
      await expectRejected([minimalDialog], 'Data path "/name" must match pattern', {
        ...OPTIONS,
        name: 'Bad_Name',
      });
      await expectRejected([minimalDialog], 'non-empty path within the application source tree', {
        ...OPTIONS,
        path: '../outside',
      });
      await expectRejected([minimalDialog], 'must be within the application source root', {
        ...OPTIONS,
        path: '/elsewhere',
      });

      const tree = await createApplicationTree(openUiDocument(minimalDialog), {});
      const before = [...tree.files];
      await expect(runner.runSchematic('dialog', OPTIONS, tree)).rejects.toThrow(
        'dialog requires installed prerequisites: @angular/material, @angular/cdk.',
      );
      expect(tree.files).toEqual(before);
    });

    it('TC-DIALOG-18: a dialog is not composable into containers, whose overlay path is unchanged', async () => {
      const panel: OpenUiElement = {
        id: 'panel',
        type: 'SurfaceContainers',
        children: [minimalDialog],
      };
      const tree = await createApplicationTree(openUiDocument(panel));
      await expect(runner.runSchematic('component', OPTIONS, tree)).rejects.toThrow(
        'has type "dialog", which cannot be composed into a container',
      );

      const overlayCard: OpenUiElement = {
        id: 'card',
        type: 'SurfaceContainers',
        children: [
          {
            id: 'more',
            type: 'OverlayContainers',
            attrs: { 'uses.label': '"More"' },
            children: [{ id: 'details', type: 'SurfaceContainers' }],
          },
        ],
      };
      const generated = await runner.runSchematic(
        'complex-component',
        OPTIONS,
        await createApplicationTree(openUiDocument(overlayCard)),
      );
      expect(generated.readContent(`${FEATURES}/card/card.html`)).toContain('cdkConnectedOverlay');
      expect(generated.readContent(`${FEATURES}/card/card.ts`)).not.toContain('MatDialog');
    });
  });
});
