import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, type UnitTestTree } from '@angular-devkit/schematics/testing';
import type { OpenUiElement } from '@shlomoa/openui-spec';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  stepperFromAst,
  STEPPER_ATTRIBUTES,
  STEP_ATTRIBUTES,
} from 'angular-django2/schematics/stepper/ast';
import { stepperTemplate } from 'angular-django2/schematics/stepper/templates';
import {
  angularCollectionPath,
  collectionPath,
  openUiDocumentString as openUiDocument,
  schematicSchemaPath,
} from './schematics.helpers';
import { readFileSync } from 'node:fs';

const DOCUMENT_PATH = 'checkout.openui.json';
const APP = '/projects/demo-app/src/app';

const step = (id: string, attrs?: Record<string, string | null>, children?: OpenUiElement[]) =>
  ({ id, type: 'step', attrs, children }) as OpenUiElement;

/** Three steps: a form with a header note, a plain panel, and an optional last step. */
const checkoutStepper: OpenUiElement = {
  id: 'checkout',
  type: 'Stepper',
  attrs: {
    'uses.selectedIndex': '1',
    'uses.linear': 'true',
    'uses.orientation': '"vertical"',
    'produces.selectionChange': null,
    'produces.complete': null,
  },
  children: [
    step('shipping', { 'uses.label': '"Shipping address"' }, [
      {
        id: 'address',
        type: 'Form',
        attrs: { 'uses.title': '"Address"', 'uses.action': '"/api/address/"' },
        children: [{ id: 'street', type: 'TextInputs', attrs: { 'uses.label': '"Street"' } }],
      },
      { id: 'hint', type: 'SurfaceContainers', attrs: { 'uses.slot': '"header"' } },
      { id: 'summary', type: 'SurfaceContainers', attrs: { 'uses.slot': '"actions"' } },
    ]),
    step('payment', undefined, [
      { id: 'first', type: 'SurfaceContainers' },
      {
        id: 'cardNumber',
        type: 'TextInputs',
        attrs: { 'uses.label': '"Card number"', 'uses.required': 'true' },
      },
    ]),
    step('review', { 'uses.optional': 'true' }),
  ],
};

describe('stepper schematic (widgets/stepper)', () => {
  let runner: SchematicTestRunner;
  let angularRunner: SchematicTestRunner;

  beforeEach(() => {
    runner = new SchematicTestRunner('angular-django2', collectionPath);
    angularRunner = new SchematicTestRunner('@schematics/angular', angularCollectionPath);
  });

  async function createApplicationTree(
    document: string,
    options: { material?: boolean; extraApplication?: boolean } = {},
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
    if (options.extraApplication) {
      tree = (await angularRunner.runSchematic(
        'application',
        { name: 'admin-app', standalone: true, routing: false, style: 'scss', zoneless: true },
        tree,
      )) as UnitTestTree;
    }

    const packageJson = JSON.parse(tree.readContent('/package.json'));
    Object.assign(packageJson.dependencies, {
      '@angular/forms': '^22.0.0',
      ...(options.material === false
        ? {}
        : { '@angular/cdk': '^22.0.0', '@angular/material': '^22.0.0' }),
    });
    tree.overwrite('/package.json', JSON.stringify(packageJson, null, 2));
    tree.create(`/${DOCUMENT_PATH}`, document);

    return tree;
  }

  async function runStepper(
    stepperNode: OpenUiElement,
    options: Record<string, unknown> = {},
  ): Promise<UnitTestTree> {
    const tree = await createApplicationTree(openUiDocument(stepperNode));
    return runner.runSchematic(
      'stepper',
      { document: DOCUMENT_PATH, project: 'demo-app', path: 'src/app/features', ...options },
      tree,
    );
  }

  async function expectRejected(
    stepperNode: OpenUiElement,
    message: string | RegExp,
    options: Record<string, unknown> = {},
  ): Promise<void> {
    await expect(runStepper(stepperNode, options)).rejects.toThrow(message);
  }

  const stepperWith = (
    attrs: Record<string, string | null> | undefined,
    children: OpenUiElement[] = [step('only')],
  ): OpenUiElement => ({ id: 'wizard', type: 'Stepper', attrs, children });

  describe('registration', () => {
    it('TC-STEPPER-01: the collection registers stepper with its schema and compiled factory', () => {
      const collection = JSON.parse(readFileSync(collectionPath, 'utf8')) as {
        schematics: Record<string, { factory: string; schema: string; description: string }>;
      };
      const entry = collection.schematics['stepper'];

      expect(entry.factory).toBe('./stepper/index#stepper');
      expect(entry.schema).toBe('./stepper/schema.json');
      expect(entry.description).toContain('Stepper');

      const schema = JSON.parse(readFileSync(schematicSchemaPath('stepper'), 'utf8')) as {
        properties: Record<string, { description?: string; aliases?: string[] }>;
        required: string[];
        additionalProperties: boolean;
      };
      expect(schema.additionalProperties).toBe(false);
      expect(schema.required).toEqual(['document']);
      expect(Object.keys(schema.properties)).toEqual([
        'name',
        'path',
        'project',
        'document',
        'nodeId',
      ]);
      expect(schema.properties['nodeId'].aliases).toEqual([
        'element-id',
        'elementId',
        'node-id',
        'nodeId',
      ]);
      for (const property of Object.values(schema.properties)) {
        expect(property.description).toBeTruthy();
      }
      expect(runner.engine.createCollection(collectionPath).listSchematicNames()).toContain(
        'stepper',
      );
    });
  });

  describe('compilation', () => {
    it('TC-STEPPER-02: compiles a Stepper node into a standalone OnPush mat-stepper component', async () => {
      const generated = await runStepper(stepperWith(undefined, [step('one'), step('two')]));

      const root = `${APP}/features/wizard`;
      const source = generated.readContent(`${root}/wizard.ts`);
      const template = generated.readContent(`${root}/wizard.html`);

      expect(source).toContain("selector: 'app-wizard'");
      expect(source).toContain('changeDetection: ChangeDetectionStrategy.OnPush');
      expect(source).toContain(
        "import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';",
      );
      expect(source).not.toContain('standalone: false');
      expect(source).toContain('imports: [MatButtonModule, MatStepperModule]');
      expect(source).toContain("import { MatStepperModule } from '@angular/material/stepper';");
      expect(source).toContain(
        "import type { StepperOrientation, StepperSelectionEvent } from '@angular/cdk/stepper';",
      );
      expect(source).toContain('// Begin input signals section');
      expect(source).toContain('readonly selectedIndex = model(0);');
      expect(source).toContain('readonly linear = input(false);');
      expect(source).toContain("readonly orientation = input<StepperOrientation>('horizontal');");
      expect(source).not.toContain('output(');
      expect(source).not.toContain('finish()');
      expect(source).toContain('protected onSelectionChange(event: StepperSelectionEvent): void {');
      expect(source).toContain('this.selectedIndex.set(event.selectedIndex);');

      expect(template).toContain('<mat-stepper');
      expect(template).toContain('[linear]="linear()"');
      expect(template).toContain('[orientation]="orientation()"');
      expect(template).toContain('[selectedIndex]="selectedIndex()"');
      expect(template).toContain('(selectionChange)="onSelectionChange($event)"');
      expect(template.match(/<mat-step /g)).toHaveLength(2);
      expect(template).toContain('<mat-step label="One">');
      expect(template).toContain('<mat-step label="Two">');
      // No Finish button without produces.complete; Back/Next navigate between the steps.
      expect(template.match(/matStepperNext/g)).toHaveLength(1);
      expect(template.match(/matStepperPrevious/g)).toHaveLength(1);
      expect(template).not.toContain('Finish');
      expect(generated.readContent(`${root}/wizard.css`)).toContain(':host');
      expect(generated.files).toContain(`${root}/wizard.spec.ts`);
    });

    it('TC-STEPPER-03: uses.selectedIndex, uses.linear and uses.orientation become the initial input values', async () => {
      const generated = await runStepper(
        stepperWith(
          {
            'uses.selectedIndex': '1',
            'uses.linear': 'true',
            'uses.orientation': '"vertical"',
          },
          [step('one'), step('two')],
        ),
      );

      const source = generated.readContent(`${APP}/features/wizard/wizard.ts`);
      expect(source).toContain('readonly selectedIndex = model(1);');
      expect(source).toContain('readonly linear = input(true);');
      expect(source).toContain("readonly orientation = input<StepperOrientation>('vertical');");
    });

    it('TC-STEPPER-04: produces.selectionChange and produces.complete generate outputs and a Finish button', async () => {
      const generated = await runStepper(
        stepperWith({ 'produces.selectionChange': null, 'produces.complete': null }, [
          step('one'),
          step('two'),
        ]),
      );

      const root = `${APP}/features/wizard`;
      const source = generated.readContent(`${root}/wizard.ts`);
      const template = generated.readContent(`${root}/wizard.html`);

      expect(source).toContain(
        "import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';",
      );
      expect(source).toMatch(
        /\/\/ Begin output signals section\n {2}readonly selectionChange = output<StepperSelectionEvent>\(\);\n {2}readonly complete = output<void>\(\);\n {2}\/\/ End output signals section/,
      );
      expect(source).toContain('this.selectionChange.emit(event);');
      expect(source).toContain('protected finish(): void {\n    this.complete.emit();\n  }');
      // Finish only on the last step.
      expect(template.match(/\(click\)="finish\(\)"/g)).toHaveLength(1);
      expect(template).toMatch(
        /matStepperPrevious>Back<\/button>\n\s+<button[^>]*\(click\)="finish\(\)"/,
      );
    });

    it('TC-STEPPER-05: step label defaults to the words of the id, uses.label and uses.optional are applied and escaped', async () => {
      const generated = await runStepper(
        stepperWith(undefined, [
          step('shippingAddress'),
          step('billing', {
            'uses.label': '"Pay \\"now\\" & {save} @ <b>"',
            'uses.optional': 'true',
          }),
          step('last', { 'uses.optional': 'false' }),
        ]),
      );

      const template = generated.readContent(`${APP}/features/wizard/wizard.html`);
      expect(template).toContain('<mat-step label="Shipping address">');
      expect(template).toContain(
        '<mat-step label="Pay &quot;now&quot; &amp; &#123;save&#125; &#64; &lt;b&gt;" [optional]="true">',
      );
      expect(template).toContain('<mat-step label="Last">');
    });

    it('TC-STEPPER-06: compiles and embeds step content into the step section of its uses.slot', async () => {
      const generated = await runStepper(checkoutStepper);

      const root = `${APP}/features/checkout`;
      const template = generated.readContent(`${root}/checkout.html`);
      const source = generated.readContent(`${root}/checkout.ts`);

      // Each child is its own component under the stepper directory.
      for (const child of ['address-form', 'hint', 'summary', 'first', 'card-number-field']) {
        expect(generated.files.some((file) => file.startsWith(`${root}/${child}/`))).toBe(true);
      }
      expect(source).toContain(
        "import { AddressFormComponent } from './address-form/address-form';",
      );
      expect(source).toContain("import { Hint } from './hint/hint';");
      expect(source).toContain('MatStepperModule');

      // header, content (children) and actions sections, per step, in document order.
      expect(template).toMatch(
        /<!-- Begin step-shipping-header section -->\n\s+<app-hint><\/app-hint>\n\s+<!-- End step-shipping-header section -->/,
      );
      expect(template).toMatch(
        /<!-- Begin step-shipping-children section -->\n\s+<app-address-form[^>]*><\/app-address-form>\n\s+<!-- End step-shipping-children section -->/,
      );
      expect(template).toMatch(
        /<!-- Begin step-shipping-actions section -->\n\s+<app-summary><\/app-summary>\n\s+<!-- End step-shipping-actions section -->/,
      );
      expect(template).toMatch(
        /<!-- Begin step-payment-children section -->\n\s+<app-first><\/app-first>\n\s+<app-card-number-field[^>]*><\/app-card-number-field>\n\s+<!-- End step-payment-children section -->/,
      );
      expect(template).toMatch(
        /<!-- Begin step-review-children section -->\n\s+<!-- End step-review-children section -->/,
      );
      // Content of one step never lands in another step.
      expect(template.indexOf('<app-address-form')).toBeLessThan(
        template.indexOf('<mat-step label="Payment">'),
      );
      expect(template.indexOf('<app-first')).toBeGreaterThan(
        template.indexOf('<mat-step label="Payment">'),
      );
      // The embedded child inputs are bound as the composition engine does.
      expect(template).toContain('[required]="true"');
      expect(template).toContain('[label]="\'Card number\'"');
    });

    it('TC-STEPPER-07: the generated stepper keeps the embedding hooks of component', async () => {
      const generated = await runStepper(stepperWith(undefined));

      const source = generated.readContent(`${APP}/features/wizard/wizard.ts`);
      for (const section of ['import', 'injected services', 'input signals', 'output signals']) {
        expect(source).toContain(`// Begin ${section} section`);
        expect(source).toContain(`// End ${section} section`);
      }
    });

    it('TC-STEPPER-08: --name, --path and --node-id select the output; the default name is the dasherized node id', async () => {
      const tree = await createApplicationTree(
        openUiDocument(
          { id: 'ignored', type: 'SurfaceContainers' },
          { id: 'onboardingFlow', type: 'Stepper', children: [step('welcome')] },
          { id: 'secondFlow', type: 'Stepper', children: [step('other')] },
        ),
      );

      const first = await runner.runSchematic(
        'stepper',
        { document: DOCUMENT_PATH, project: 'demo-app' },
        tree,
      );
      expect(first.files).toContain(`${APP}/onboarding-flow/onboarding-flow.ts`);
      expect(first.files).not.toContain(`${APP}/second-flow/second-flow.ts`);

      const second = await runner.runSchematic(
        'stepper',
        { document: DOCUMENT_PATH, project: 'demo-app', nodeId: 'secondFlow', name: 'tour' },
        await createApplicationTree(
          openUiDocument(
            { id: 'onboardingFlow', type: 'Stepper', children: [step('welcome')] },
            { id: 'secondFlow', type: 'Stepper', children: [step('other')] },
          ),
        ),
      );
      expect(second.files).toContain(`${APP}/tour/tour.ts`);
      expect(second.readContent(`${APP}/tour/tour.html`)).toContain('label="Other"');
    });
  });

  describe('rejections', () => {
    it('TC-STEPPER-09: uses.branching is rejected as unsupported, whatever its value', async () => {
      for (const value of ['true', 'false']) {
        await expectRejected(
          stepperWith({ 'uses.branching': value }),
          /uses\.branching is not supported by the stepper schematic/,
        );
      }
    });

    it('TC-STEPPER-10: unsupported Stepper attributes are rejected, never ignored', async () => {
      await expectRejected(
        stepperWith({ 'uses.linear': 'true', 'uses.title': '"Hi"' }),
        /unsupported attribute\(s\): uses\.title/,
      );
      await expectRejected(stepperWith({ 'uses.slot': '"actions"' }), /uses\.slot/);
      await expectRejected(stepperWith({ 'behaves.submit': 'x#Y.z' }), /behaves\.submit/);
      // A plain (uncategorized) key is not a categorized key the schematic lists.
      await expectRejected(stepperWith({ linear: 'true' }), /unsupported attribute\(s\): linear/);
    });

    it('TC-STEPPER-11: unsupported step attributes are rejected, never ignored', async () => {
      await expectRejected(
        stepperWith(undefined, [step('one', { 'uses.label': '"One"', 'uses.icon': '"done"' })]),
        /checkout\.openui\.json#one.*unsupported attribute\(s\): uses\.icon/,
      );
      await expectRejected(
        stepperWith(undefined, [step('one', { 'uses.slot': '"actions"' })]),
        /unsupported attribute\(s\): uses\.slot/,
      );
      await expectRejected(
        stepperWith(undefined, [step('one', { 'produces.complete': null })]),
        /unsupported attribute\(s\): produces\.complete/,
      );
    });

    it('TC-STEPPER-12: children other than step are rejected, and at least one step is required', async () => {
      await expectRejected(
        stepperWith(undefined, [step('one'), { id: 'stray', type: 'SurfaceContainers' }]),
        /has type "SurfaceContainers", but a Stepper may contain only "step" children/,
      );
      await expectRejected(stepperWith(undefined, []), /has no steps/);
    });

    it('TC-STEPPER-13: step content of an unsupported type is rejected', async () => {
      await expectRejected(
        stepperWith(undefined, [
          step('one', undefined, [{ id: 'panel', type: 'OverlayContainers' }]),
        ]),
        /has type "OverlayContainers", which cannot be composed into a container/,
      );
      await expectRejected(
        stepperWith(undefined, [
          step('one', undefined, [
            { id: 'note', type: 'SurfaceContainers', attrs: { 'uses.slot': '"footer"' } },
          ]),
        ]),
        /uses\.slot="footer" is not a supported slot/,
      );
    });

    it('TC-STEPPER-14: invalid attribute values are rejected with the document subject', async () => {
      const two = [step('one'), step('two')];
      await expectRejected(
        stepperWith({ 'uses.selectedIndex': '2' }, two),
        /checkout\.openui\.json#wizard.*uses\.selectedIndex must be an integer from 0 to 1/,
      );
      await expectRejected(
        stepperWith({ 'uses.selectedIndex': '1.5' }, two),
        /uses\.selectedIndex must be an integer/,
      );
      await expectRejected(
        stepperWith({ 'uses.selectedIndex': '-1' }, two),
        /uses\.selectedIndex must be an integer/,
      );
      await expectRejected(
        stepperWith({ 'uses.orientation': '"diagonal"' }, two),
        /uses\.orientation must be enum\(horizontal\|vertical\)/,
      );
      await expectRejected(
        stepperWith({ 'uses.orientation': 'vertical' }, two),
        /attribute "uses\.orientation" has the unquoted value vertical/,
      );
      await expectRejected(
        stepperWith({ 'uses.linear': 'yes' }, two),
        /uses\.linear" must be the unquoted string "true" or "false"/,
      );
    });

    it('TC-STEPPER-15: produces markers must be null, and step labels non-empty', async () => {
      await expectRejected(
        stepperWith({ 'produces.complete': 'onDone' }),
        /produces\.complete must be null when present/,
      );
      await expectRejected(
        stepperWith({ 'produces.selectionChange': 'handler#Cls.method' }),
        /produces\.selectionChange must be null when present/,
      );
      await expectRejected(
        stepperWith(undefined, [step('one', { 'uses.label': '"  "' })]),
        /uses\.label must not be empty/,
      );
    });

    it('TC-STEPPER-16: invalid input is rejected before any file is written', async () => {
      const tree = await createApplicationTree(
        openUiDocument(
          stepperWith(undefined, [
            step('one', undefined, [{ id: 'note', type: 'SurfaceContainers' }]),
            step('two', { 'uses.icon': '"x"' }),
          ]),
        ),
      );
      const before = [...tree.files].sort();

      await expect(
        runner.runSchematic('stepper', { document: DOCUMENT_PATH, project: 'demo-app' }, tree),
      ).rejects.toThrow(/uses\.icon/);
      expect([...tree.files].sort()).toEqual(before);
    });
  });

  describe('options and prerequisites', () => {
    it('TC-STEPPER-17: --document is required and must name a Stepper in a valid document', async () => {
      const tree = await createApplicationTree(
        openUiDocument({ id: 'panel', type: 'SurfaceContainers' }),
      );

      await expect(runner.runSchematic('stepper', { project: 'demo-app' }, tree)).rejects.toThrow(
        /document/,
      );
      await expect(
        runner.runSchematic('stepper', { document: 'missing.openui.json' }, tree),
      ).rejects.toThrow(/was not found in the workspace/);
      await expect(
        runner.runSchematic('stepper', { document: DOCUMENT_PATH, project: 'demo-app' }, tree),
      ).rejects.toThrow(/contains no "Stepper" element/);
      await expect(
        runner.runSchematic(
          'stepper',
          { document: DOCUMENT_PATH, project: 'demo-app', nodeId: 'panel' },
          tree,
        ),
      ).rejects.toThrow(/has type "SurfaceContainers" but this schematic expects "Stepper"/);

      const invalid = await createApplicationTree('{"version":"0.12.0","id":"root","type":"nope"}');
      await expect(
        runner.runSchematic('stepper', { document: DOCUMENT_PATH, project: 'demo-app' }, invalid),
      ).rejects.toThrow(/is invalid/);
    });

    it('TC-STEPPER-18: requires Angular Material and CDK, a kebab-case name and an application project', async () => {
      const withoutMaterial = await createApplicationTree(openUiDocument(stepperWith(undefined)), {
        material: false,
      });
      await expect(
        runner.runSchematic(
          'stepper',
          { document: DOCUMENT_PATH, project: 'demo-app' },
          withoutMaterial,
        ),
      ).rejects.toThrow(
        /stepper requires installed prerequisites: @angular\/material, @angular\/cdk/,
      );

      await expect(runStepper(stepperWith(undefined), { name: 'Not_Kebab' })).rejects.toThrow(
        /name/,
      );

      const twoApplications = await createApplicationTree(openUiDocument(stepperWith(undefined)), {
        extraApplication: true,
      });
      await expect(
        runner.runSchematic('stepper', { document: DOCUMENT_PATH }, twoApplications),
      ).rejects.toThrow(/project/i);
      await expect(
        runner.runSchematic(
          'stepper',
          { document: DOCUMENT_PATH, project: 'demo-app', path: '../outside' },
          twoApplications,
        ),
      ).rejects.toThrow(/path/);
    });
  });

  describe('decoder', () => {
    it('TC-STEPPER-19: stepperFromAst decodes defaults and every supported attribute', () => {
      expect(
        stepperFromAst(
          { id: 'wizard', type: 'Stepper', children: [step('one')] },
          'doc.openui.json',
        ),
      ).toMatchObject({
        selectedIndex: 0,
        linear: false,
        orientation: 'horizontal',
        selectionChange: false,
        complete: false,
        steps: [{ name: 'one', label: 'One', optional: false }],
      });

      const decoded = stepperFromAst(checkoutStepper, 'doc.openui.json');
      expect(decoded).toMatchObject({
        selectedIndex: 1,
        linear: true,
        orientation: 'vertical',
        selectionChange: true,
        complete: true,
      });
      expect(decoded.steps.map((decodedStep) => decodedStep.label)).toEqual([
        'Shipping address',
        'Payment',
        'Review',
      ]);
      expect(decoded.steps.map((decodedStep) => decodedStep.optional)).toEqual([
        false,
        false,
        true,
      ]);
      expect(Object.values(STEPPER_ATTRIBUTES)).toEqual([
        'uses.selectedIndex',
        'uses.linear',
        'uses.orientation',
        'produces.selectionChange',
        'produces.complete',
      ]);
      expect(Object.values(STEP_ATTRIBUTES)).toEqual(['uses.label', 'uses.optional']);
    });

    it('TC-STEPPER-21: stepperFromAst itself rejects an orientation outside the enum', () => {
      expect(() =>
        stepperFromAst(
          {
            id: 'wizard',
            type: 'Stepper',
            attrs: { 'uses.orientation': '"diagonal"' },
            children: [step('one')],
          },
          'doc.openui.json',
        ),
      ).toThrow(
        /uses\.orientation="diagonal" is not supported\. Supported orientations: horizontal, vertical/,
      );
    });

    it('TC-STEPPER-20: stepperTemplate puts Back on every step but the first and Next on every step but the last', () => {
      const template = stepperTemplate(
        stepperFromAst(
          {
            id: 'wizard',
            type: 'Stepper',
            attrs: { 'produces.complete': null },
            children: [step('a'), step('b'), step('c')],
          },
          'doc.openui.json',
        ),
      );
      const stepBlocks = template.split('<mat-step ').slice(1);

      expect(stepBlocks).toHaveLength(3);
      expect(stepBlocks.map((block) => block.includes('matStepperPrevious'))).toEqual([
        false,
        true,
        true,
      ]);
      expect(stepBlocks.map((block) => block.includes('matStepperNext'))).toEqual([
        true,
        true,
        false,
      ]);
      expect(stepBlocks.map((block) => block.includes('finish()'))).toEqual([false, false, true]);
    });
  });
});
