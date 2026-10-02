import { readFileSync } from 'node:fs';
import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, type UnitTestTree } from '@angular-devkit/schematics/testing';
import type { OpenUiElement } from '@shlomoa/openui-spec';
import { beforeEach, describe, expect, it } from 'vitest';

import { tabSection } from 'angular-django2/schematics/tabs/ast';
import { readGeneratedNames } from 'angular-django2/schematics/tabs/index';
import {
  escapeTemplateAttribute,
  typeScriptStringLiteral,
} from 'angular-django2/schematics/tabs/templates';
import {
  angularCollectionPath,
  collectionPath,
  openUiDocumentString as openUiDocument,
  schematicSchemaPath,
} from './schematics.helpers';

const DOCUMENT_PATH = 'ui.openui.json';
const FEATURES = '/projects/demo-app/src/app/features';
const OPTIONS = { document: DOCUMENT_PATH, project: 'demo-app', path: 'src/app/features' };

/** Two tabs: a surface container with a form, and a bare surface container. */
const settingsTabs: OpenUiElement = {
  id: 'settingsTabs',
  type: 'Tabs',
  children: [
    {
      id: 'general',
      type: 'tab',
      attrs: { 'uses.label': '"General"' },
      children: [
        {
          id: 'signup',
          type: 'Form',
          attrs: { 'uses.title': '"Sign up"', 'uses.action': '"/api/signup/"' },
          children: [
            {
              id: 'email',
              type: 'TextInputs',
              attrs: { 'uses.type': '"email"', 'uses.label': '"Email"' },
            },
          ],
        },
        { id: 'notes', type: 'SurfaceContainers', attrs: { 'uses.title': '"Notes"' } },
      ],
    },
    {
      id: 'advanced',
      type: 'tab',
      attrs: { 'uses.label': '"Advanced"' },
      children: [{ id: 'danger', type: 'SurfaceContainers' }],
    },
  ],
};

function tabsNode(
  attrs: Record<string, string | null> | undefined,
  ...tabs: OpenUiElement[]
): OpenUiElement {
  return {
    id: 'viewTabs',
    type: 'Tabs',
    ...(attrs ? { attrs } : {}),
    children: tabs.length > 0 ? tabs : settingsTabs.children,
  };
}

const tab = (id: string, label: string, ...children: OpenUiElement[]): OpenUiElement => ({
  id,
  type: 'tab',
  attrs: { 'uses.label': JSON.stringify(label) },
  ...(children.length > 0 ? { children } : {}),
});

describe('tabs schematic (containers/tabs)', () => {
  let runner: SchematicTestRunner;
  let angularRunner: SchematicTestRunner;

  beforeEach(() => {
    runner = new SchematicTestRunner('angular-django2', collectionPath);
    angularRunner = new SchematicTestRunner('@schematics/angular', angularCollectionPath);
  });

  async function createApplicationTree(document: string): Promise<UnitTestTree> {
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
    Object.assign(packageJson.dependencies, {
      '@angular/cdk': '^22.0.0',
      '@angular/forms': '^22.0.0',
      '@angular/material': '^22.0.0',
    });
    tree.overwrite('/package.json', JSON.stringify(packageJson, null, 2));
    tree.create(`/${DOCUMENT_PATH}`, document);

    return tree;
  }

  async function generate(
    node: OpenUiElement,
    options: Record<string, unknown> = {},
  ): Promise<UnitTestTree> {
    return runner.runSchematic(
      'tabs',
      { ...OPTIONS, ...options },
      await createApplicationTree(openUiDocument(node)),
    );
  }

  async function expectRejection(
    node: OpenUiElement,
    message: string | RegExp,
    options: Record<string, unknown> = {},
  ): Promise<void> {
    await expect(generate(node, options)).rejects.toThrow(message);
  }

  describe('horizontal tab group', () => {
    it('TC-TABS-01: compiles a Tabs node into a standalone OnPush Material tab group with lazy tab bodies', async () => {
      const generated = await generate(settingsTabs);

      const root = `${FEATURES}/settings-tabs`;
      const source = generated.readContent(`${root}/settings-tabs.ts`);
      const template = generated.readContent(`${root}/settings-tabs.html`);

      expect(source).toContain("selector: 'app-settings-tabs'");
      expect(source).toContain('imports: [MatTabsModule');
      expect(source).toContain("import { MatTabsModule } from '@angular/material/tabs';");
      expect(source).toContain('changeDetection: ChangeDetectionStrategy.OnPush');
      expect(source).toContain('export class SettingsTabs {');
      expect(source).toContain('readonly selectedIndex = model(0);');
      expect(source).not.toContain('selectedTabChange');
      expect(source).toContain('// Begin input signals section');
      expect(source).toContain('// Begin output signals section');
      expect(source).toContain('// Begin injected services section');

      expect(template).toContain('<mat-tab-group [(selectedIndex)]="selectedIndex">');
      expect(template).not.toContain('selectedTabChange');
      expect(template).toMatch(
        /<mat-tab label="General">\n {4}<ng-template matTabContent>\n {6}<!-- Begin tab-general section -->/,
      );
      expect(template).toMatch(/<mat-tab label="Advanced">\n {4}<ng-template matTabContent>/);
      expect(generated.files).toContain(`${root}/settings-tabs.spec.ts`);
      // Angular's component schematic picks the style extension; the runner's default is CSS.
      expect(source).toContain("styleUrl: './settings-tabs.css'");
      expect(generated.readContent(`${root}/settings-tabs.css`)).toContain(':host');
    });

    it('TC-TABS-02: reads uses.selectedIndex as the initial selection and produces.selectedTabChange as an output', async () => {
      const generated = await generate(
        tabsNode({ 'uses.selectedIndex': '1', 'produces.selectedTabChange': null }),
      );

      const root = `${FEATURES}/view-tabs`;
      const source = generated.readContent(`${root}/view-tabs.ts`);
      const template = generated.readContent(`${root}/view-tabs.html`);

      expect(source).toContain('readonly selectedIndex = model(1);');
      expect(source).toContain('readonly selectedTabChange = output<ViewTabsTabChange>();');
      expect(source).toContain('export interface ViewTabsTabChange {');
      expect(source).toContain(
        "import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';",
      );
      expect(source).toContain(
        'this.selectedTabChange.emit({ index: event.index, label: event.tab.textLabel });',
      );
      expect(template).toContain(
        '<mat-tab-group [(selectedIndex)]="selectedIndex" (selectedTabChange)="emitTabChange($event)">',
      );
    });

    it('TC-TABS-03: compiles the tab content with the shared composition engine and embeds it in document order', async () => {
      const generated = await generate(settingsTabs);

      const root = `${FEATURES}/settings-tabs`;
      const template = generated.readContent(`${root}/settings-tabs.html`);
      const source = generated.readContent(`${root}/settings-tabs.ts`);

      expect(template).toMatch(
        /<!-- Begin tab-general section -->\n {6}<app-signup-form[^>]*><\/app-signup-form>\n {6}<app-notes><\/app-notes>\n {6}<!-- End tab-general section -->/,
      );
      expect(template).toMatch(
        /<!-- Begin tab-advanced section -->\n {6}<app-danger><\/app-danger>\n {6}<!-- End tab-advanced section -->/,
      );
      expect(source).toContain("import { SignupFormComponent } from './signup-form/signup-form';");
      expect(source).toContain("import { Notes } from './notes/notes';");
      expect(source).toContain("import { Danger } from './danger/danger';");
      expect(generated.files).toContain(`${root}/signup-form/signup-form.ts`);
      expect(generated.readContent(`${root}/signup-form/signup-form.html`)).toContain(
        'formControlName="email"',
      );
      expect(generated.readContent(`${root}/notes/notes.html`)).toContain('<h2>Notes</h2>');
    });

    it('TC-TABS-04: marks a disabled tab and escapes labels', async () => {
      const disabledTab: OpenUiElement = {
        id: 'locked',
        type: 'tab',
        attrs: { 'uses.label': '"A & \\"B\\" {{c}}"', 'uses.disabled': 'true' },
      };
      const generated = await generate(tabsNode(undefined, tab('open', 'Open'), disabledTab));

      const template = generated.readContent(`${FEATURES}/view-tabs/view-tabs.html`);
      expect(template).toContain(
        '<mat-tab label="A &amp; &quot;B&quot; &#123;&#123;c&#125;&#125;" [disabled]="true">',
      );
      expect(template).toContain('<mat-tab label="Open">');
      expect(escapeTemplateAttribute('a"<b>')).toBe('a&quot;&lt;b&gt;');
      expect(typeScriptStringLiteral("it's \\ x")).toBe("'it\\'s \\\\ x'");
    });

    it('TC-TABS-05: compiles a nested Tabs node as tab content', async () => {
      const inner: OpenUiElement = {
        id: 'innerTabs',
        type: 'Tabs',
        attrs: { 'uses.selectedIndex': '1', 'uses.orientation': '"vertical"' },
        children: [tab('one', 'One'), tab('two', 'Two')],
      };
      const generated = await generate(tabsNode(undefined, tab('outer', 'Outer', inner)));

      const root = `${FEATURES}/view-tabs`;
      expect(generated.readContent(`${root}/view-tabs.html`)).toMatch(
        /<!-- Begin tab-outer section -->\n {6}<app-inner-tabs \[selectedIndex\]="1"><\/app-inner-tabs>/,
      );
      expect(generated.readContent(`${root}/view-tabs.ts`)).toContain(
        "import { InnerTabs } from './inner-tabs/inner-tabs';",
      );
      expect(generated.readContent(`${root}/inner-tabs/inner-tabs.html`)).toContain(
        'aria-orientation="vertical"',
      );
    });
  });

  describe('vertical tab list', () => {
    const verticalTabs = tabsNode(
      { 'uses.orientation': '"vertical"', 'produces.selectedTabChange': null },
      tab('profile', 'Profile', { id: 'summary', type: 'SurfaceContainers' }),
      {
        id: 'billing',
        type: 'tab',
        attrs: { 'uses.label': '"Billing"', 'uses.disabled': 'true' },
      },
      tab('team', "Team's"),
    );

    it('TC-TABS-06: compiles uses.orientation vertical into an ARIA tablist of Material buttons', async () => {
      const generated = await generate(verticalTabs);

      const root = `${FEATURES}/view-tabs`;
      const template = generated.readContent(`${root}/view-tabs.html`);
      const source = generated.readContent(`${root}/view-tabs.ts`);

      expect(template).toContain('role="tablist" aria-orientation="vertical"');
      expect(template).not.toContain('mat-tab-group');
      expect(template).toMatch(
        /<button\n {6}mat-button\n {6}type="button"\n {6}role="tab"[\s\S]*\[attr\.aria-controls\]="panelId\(0\)"[\s\S]*\(click\)="selectTab\(0\)"\n {4}>\n {6}Profile\n {4}<\/button>/,
      );
      expect(template).toMatch(/disabled\n {6}\(click\)="selectTab\(1\)"[\s\S]*Billing/);
      expect(template).toContain('[tabindex]="selectedIndex() === 2 ? 0 : -1"');
      expect(template).toMatch(
        /@if \(selectedIndex\(\) === 0\) \{\n {6}<div class="tabs-panel" role="tabpanel" tabindex="0" \[id\]="panelId\(0\)" \[attr\.aria-labelledby\]="tabId\(0\)">\n {8}<!-- Begin tab-profile section -->\n {8}<app-summary><\/app-summary>/,
      );
      expect(source).toContain('imports: [MatButtonModule, Summary]');
      expect(source).toContain(
        "const TAB_LABELS: readonly string[] = ['Profile', 'Billing', 'Team\\'s'];",
      );
      expect(source).toContain('const TAB_DISABLED: readonly boolean[] = [false, true, false];');
      expect(source).toContain('readonly selectedIndex = model(0);');
      expect(source).toContain('readonly selectedTabChange = output<ViewTabsTabChange>();');
      expect(source).toContain('this.selectedTabChange.emit({ index, label: TAB_LABELS[index] });');
      expect(source).toContain("case 'ArrowDown':");
      expect(source).toContain("case 'ArrowUp':");
      expect(generated.readContent(`${root}/view-tabs.css`)).toContain('.tabs-vertical');
    });

    it('TC-TABS-07: omits the output of a vertical tablist without produces.selectedTabChange', async () => {
      const generated = await generate(
        tabsNode({ 'uses.orientation': '"vertical"' }, tab('one', 'One'), tab('two', 'Two')),
      );

      const source = generated.readContent(`${FEATURES}/view-tabs/view-tabs.ts`);
      expect(source).not.toContain('selectedTabChange');
      expect(source).not.toMatch(/\boutput\b[<,(]/);
      expect(source).not.toContain(', output');
    });

    it('TC-TABS-08: keeps the style file Angular generated, and moves the layout out of an indented Sass file', () => {
      const generated = `@Component({
  selector: 'app-view-tabs',
  templateUrl: './view-tabs.html',
  styleUrl: './view-tabs.%STYLE%',
})
export class ViewTabs {}
`;
      const names = (style: string | null) =>
        readGeneratedNames(
          style === null
            ? generated.replace("  styleUrl: './view-tabs.%STYLE%',\n", '')
            : generated.replace('%STYLE%', style),
          'view-tabs',
          'view-tabs.ts',
        );

      expect(names('scss')).toMatchObject({
        className: 'ViewTabs',
        selector: 'app-view-tabs',
        templateUrl: './view-tabs.html',
        styleUrl: './view-tabs.scss',
      });
      expect(names('css').styleUrl).toBe('./view-tabs.css');
      expect(names('less').styleUrl).toBe('./view-tabs.less');
      expect(names('sass').styleUrl).toBe('./view-tabs.scss');
      expect(names(null).styleUrl).toBe('./view-tabs.scss');
      expect(() => readGeneratedNames('export class A {}', 'a', 'a.ts')).toThrow(
        'needs a component with an external template',
      );
    });
  });

  describe('rejections', () => {
    it('TC-TABS-09: rejects unsupported attributes on Tabs and tab, including a page stack', async () => {
      const cases: [OpenUiElement, string][] = [
        [tabsNode({ 'uses.stack': '"true"' }), 'unsupported attribute(s): uses.stack'],
        [tabsNode({ 'uses.tabStrip': '"false"' }), 'unsupported attribute(s): uses.tabStrip'],
        [tabsNode({ selectedIndex: '1' }), 'unsupported attribute(s): selectedIndex'],
        [tabsNode({ 'uses.slot': '"header"' }), 'unsupported attribute(s): uses.slot'],
        [tabsNode({ 'behaves.select': null }), 'unsupported attribute(s): behaves.select'],
        [
          tabsNode(undefined, {
            id: 'iconTab',
            type: 'tab',
            attrs: { 'uses.label': '"A"', 'uses.icon': '"home"' },
          }),
          'unsupported attribute(s): uses.icon',
        ],
      ];

      for (const [node, message] of cases) {
        await expectRejection(node, message);
      }
    });

    it('TC-TABS-10: rejects unsupported children of Tabs and of a tab, and a slot on tab content', async () => {
      await expectRejection(
        tabsNode(undefined, { id: 'strayGrid', type: 'Grid' }),
        'has type "Grid", but Tabs "viewTabs" may contain only tab children',
      );
      await expectRejection(
        tabsNode(undefined, tab('one', 'One', { id: 'strayGrid', type: 'Grid' })),
        'has type "Grid", which cannot be the content of tab',
      );
      await expectRejection(
        tabsNode(
          undefined,
          tab('one', 'One', {
            id: 'slotted',
            type: 'SurfaceContainers',
            attrs: { 'uses.slot': '"header"' },
          }),
        ),
        'cannot choose a uses.slot',
      );
      await expectRejection({ id: 'viewTabs', type: 'Tabs' }, 'needs at least one tab child');
    });

    it('TC-TABS-11: rejects a missing, empty, unquoted, or non-text tab label and an invalid disabled flag', async () => {
      const labeled = (attrs: Record<string, string | null> | undefined): OpenUiElement => ({
        id: 'one',
        type: 'tab',
        ...(attrs ? { attrs } : {}),
      });

      await expectRejection(
        tabsNode(undefined, labeled(undefined)),
        'requires a non-empty uses.label',
      );
      await expectRejection(
        tabsNode(undefined, labeled({ 'uses.label': '" "' })),
        'requires a non-empty uses.label',
      );
      await expectRejection(
        tabsNode(undefined, labeled({ 'uses.label': 'label' })),
        'is an expression, not text',
      );
      await expectRejection(
        tabsNode(undefined, labeled({ 'uses.label': '"One"', 'uses.disabled': '"true"' })),
        'has the quoted literal "true"',
      );
      await expectRejection(
        tabsNode(undefined, labeled({ 'uses.label': '"One"', 'uses.disabled': 'isLocked' })),
        'cannot be evaluated at generation time',
      );
    });

    it('TC-TABS-12: rejects an invalid uses.selectedIndex, uses.orientation, or produces.selectedTabChange', async () => {
      const cases: [Record<string, string | null>, string | RegExp][] = [
        [{ 'uses.selectedIndex': '2' }, 'must be an integer from 0 to 1'],
        [{ 'uses.selectedIndex': '-1' }, 'must be an integer from 0 to 1'],
        [{ 'uses.selectedIndex': '0.5' }, 'must be an integer from 0 to 1'],
        [{ 'uses.selectedIndex': 'current' }, 'cannot be evaluated at generation time'],
        [{ 'uses.selectedIndex': '"1"' }, 'contract/wrong-value-type'],
        [{ 'uses.orientation': '"diagonal"' }, 'contract/wrong-value-type'],
        [{ 'uses.orientation': 'vertical' }, 'is an expression, not text'],
        [{ 'produces.selectedTabChange': 'onChange($event)' }, 'must be null when present'],
        [{ 'produces.selectedTabChange': '"onChange"' }, 'contract/wrong-value-type'],
      ];

      for (const [attrs, message] of cases) {
        await expectRejection(tabsNode(attrs), message);
      }
      await expectRejection(
        tabsNode({ 'uses.selectedIndex': '1' }, tab('one', 'One'), {
          id: 'two',
          type: 'tab',
          attrs: { 'uses.label': '"Two"', 'uses.disabled': 'true' },
        }),
        'selects the disabled tab "two"',
      );
    });
  });

  describe('options and prerequisites', () => {
    it('TC-TABS-13: resolves --nodeId, the default and explicit --name, and the default path', async () => {
      const other: OpenUiElement = {
        id: 'otherTabs',
        type: 'Tabs',
        children: [tab('otherOne', 'One')],
      };
      const document = openUiDocument(settingsTabs, other);

      const byNodeId = await runner.runSchematic(
        'tabs',
        { document: DOCUMENT_PATH, nodeId: 'otherTabs' },
        await createApplicationTree(document),
      );
      expect(byNodeId.files).toContain('/projects/demo-app/src/app/other-tabs/other-tabs.ts');

      const first = await runner.runSchematic(
        'tabs',
        { document: DOCUMENT_PATH, name: 'side-tabs' },
        await createApplicationTree(document),
      );
      expect(first.files).toContain('/projects/demo-app/src/app/side-tabs/side-tabs.ts');
      expect(first.files).not.toContain('/projects/demo-app/src/app/other-tabs/other-tabs.ts');
    });

    it('TC-TABS-14: rejects a missing document, node, node type, name, path, and Material prerequisite', async () => {
      const tree = async (): Promise<UnitTestTree> =>
        createApplicationTree(openUiDocument(settingsTabs));

      await expect(
        runner.runSchematic('tabs', { project: 'demo-app' }, await tree()),
      ).rejects.toThrow(/document/);
      await expect(
        runner.runSchematic('tabs', { document: 'missing.openui.json' }, await tree()),
      ).rejects.toThrow('was not found in the workspace');
      await expect(
        runner.runSchematic('tabs', { document: DOCUMENT_PATH, nodeId: 'nope' }, await tree()),
      ).rejects.toThrow('was not found in the document');
      await expect(
        runner.runSchematic('tabs', { document: DOCUMENT_PATH, nodeId: 'general' }, await tree()),
      ).rejects.toThrow('has type "tab" but this schematic expects "Tabs"');
      await expect(generate({ id: 'panel', type: 'SurfaceContainers' })).rejects.toThrow(
        'contains no "Tabs" element',
      );
      await expect(
        runner.runSchematic('tabs', { ...OPTIONS, name: 'Bad_Name' }, await tree()),
      ).rejects.toThrow();
      await expect(
        runner.runSchematic('tabs', { ...OPTIONS, path: '../outside' }, await tree()),
      ).rejects.toThrow('within the application source tree');

      const withoutMaterial = await tree();
      const packageJson = JSON.parse(withoutMaterial.readContent('/package.json'));
      delete packageJson.dependencies['@angular/material'];
      withoutMaterial.overwrite('/package.json', JSON.stringify(packageJson));
      await expect(runner.runSchematic('tabs', OPTIONS, withoutMaterial)).rejects.toThrow(
        'requires installed Angular Material prerequisites',
      );
    });

    it('TC-TABS-15: registers tabs in the collection with a schema that requires the document', () => {
      const collection = JSON.parse(readFileSync(collectionPath, 'utf8')) as {
        schematics: Record<string, { factory: string; schema: string }>;
      };
      const schema = JSON.parse(readFileSync(schematicSchemaPath('tabs'), 'utf8')) as {
        required: string[];
        additionalProperties: boolean;
        properties: Record<string, { aliases?: string[] }>;
      };

      expect(collection.schematics['tabs']).toMatchObject({
        factory: './tabs/index#tabs',
        schema: './tabs/schema.json',
      });
      expect(schema.required).toEqual(['document']);
      expect(schema.additionalProperties).toBe(false);
      expect(Object.keys(schema.properties).sort()).toEqual([
        'document',
        'name',
        'nodeId',
        'path',
        'project',
      ]);
      expect(schema.properties['nodeId'].aliases).toEqual([
        'element-id',
        'elementId',
        'node-id',
        'nodeId',
      ]);
      expect(tabSection('settingsTabs')).toBe('tab-settings-tabs');
    });
  });
});
