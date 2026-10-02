/**
 * Templates of the `tabs` schematic: the component source, the template, and
 * the styles of a compiled `Tabs` node.
 *
 * Both orientations expose the same public API (the `selectedIndex` model
 * signal and the optional `selectedTabChange` output) and the same content
 * sections, so the composition engine embeds tab content the same way:
 *
 * - `horizontal`: Layer 2, an Angular Material `mat-tab-group`. Each tab body is
 *   an `<ng-template matTabContent>`, so embedded content is created when its
 *   tab is first selected.
 * - `vertical`: Layer 1 and 2, an ARIA `tablist` / `tabpanel` pattern with
 *   Material buttons, because `mat-tab-group` has no vertical orientation. The
 *   panel of the selected tab is the only one rendered.
 *
 * @internal
 */
import { escapeTemplateText } from '../component/ast';
import { templateSectionMarkers } from '../embed-component/index';
import type { TabAstOptions, TabsAstOptions } from './ast';

/** Names of the generated component, read back from the files Angular generated. */
export interface TabsComponentNames {
  /** Kebab-case name, also the base file name. */
  readonly name: string;
  /** Component class name. */
  readonly className: string;
  /** Component element selector. */
  readonly selector: string;
  /** Template URL, as written in the `@Component` decorator. */
  readonly templateUrl: string;
  /** Style URL, as written in the `@Component` decorator. */
  readonly styleUrl: string;
}

/** Escape text for a double-quoted Angular template attribute. */
export function escapeTemplateAttribute(value: string): string {
  return escapeTemplateText(value).replace(/"/g, '&quot;');
}

/** Single-quoted TypeScript string literal. */
export function typeScriptStringLiteral(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
}

/** Template of the component. */
export function tabsTemplate(options: TabsAstOptions): string {
  return options.orientation === 'vertical'
    ? verticalTabsTemplate(options)
    : horizontalTabsTemplate(options);
}

function horizontalTabsTemplate(options: TabsAstOptions): string {
  const tabs = options.tabs.map((tab) => {
    const disabled = tab.disabled ? ' [disabled]="true"' : '';
    return [
      `  <mat-tab label="${escapeTemplateAttribute(tab.label)}"${disabled}>`,
      '    <ng-template matTabContent>',
      templateSectionMarkers(tab.section, '      '),
      '    </ng-template>',
      '  </mat-tab>',
    ].join('\n');
  });
  const attributes = [
    '[(selectedIndex)]="selectedIndex"',
    ...(options.selectedTabChange ? ['(selectedTabChange)="emitTabChange($event)"'] : []),
  ];

  return `<mat-tab-group ${attributes.join(' ')}>\n${tabs.join('\n')}\n</mat-tab-group>\n`;
}

function verticalTabsTemplate(options: TabsAstOptions): string {
  const tabButtons = options.tabs.map((tab, index) => verticalTabButton(tab, index));
  const panels = options.tabs.map((tab, index) =>
    [
      `    @if (selectedIndex() === ${index}) {`,
      `      <div class="tabs-panel" role="tabpanel" tabindex="0" [id]="panelId(${index})" [attr.aria-labelledby]="tabId(${index})">`,
      templateSectionMarkers(tab.section, '        '),
      '      </div>',
      '    }',
    ].join('\n'),
  );

  return `<div class="tabs tabs-vertical">
  <div class="tabs-list" role="tablist" aria-orientation="vertical" (keydown)="onKeydown($event)">
${tabButtons.join('\n')}
  </div>
  <div class="tabs-panels">
${panels.join('\n')}
  </div>
</div>
`;
}

function verticalTabButton(tab: TabAstOptions, index: number): string {
  return [
    '    <button',
    '      mat-button',
    '      type="button"',
    '      role="tab"',
    '      class="tabs-tab"',
    `      [id]="tabId(${index})"`,
    `      [attr.aria-controls]="panelId(${index})"`,
    `      [attr.aria-selected]="selectedIndex() === ${index}"`,
    `      [class.tabs-tab-selected]="selectedIndex() === ${index}"`,
    `      [tabindex]="selectedIndex() === ${index} ? 0 : -1"`,
    ...(tab.disabled ? ['      disabled'] : []),
    `      (click)="selectTab(${index})"`,
    '    >',
    `      ${escapeTemplateText(tab.label)}`,
    '    </button>',
  ].join('\n');
}

/** Component styles. */
export function tabsStyles(options: TabsAstOptions): string {
  if (options.orientation === 'horizontal') {
    return ':host {\n  display: block;\n}\n';
  }

  return `:host {
  display: block;
}

.tabs-vertical {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.tabs-list {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: stretch;
}

.tabs-tab {
  justify-content: flex-start;
}

.tabs-tab-selected {
  background-color: var(--mat-sys-secondary-container);
  color: var(--mat-sys-on-secondary-container);
}

.tabs-panels {
  flex: 1 1 auto;
  min-width: 0;
}
`;
}

/** TypeScript source of the component. */
export function tabsComponentSource(names: TabsComponentNames, options: TabsAstOptions): string {
  return options.orientation === 'vertical'
    ? verticalComponentSource(names, options)
    : horizontalComponentSource(names, options);
}

function changeEventName(names: TabsComponentNames): string {
  return `${names.className}TabChange`;
}

function changeEventInterface(names: TabsComponentNames): string {
  return `/** The tab that became selected (\`produces.selectedTabChange\`). */
export interface ${changeEventName(names)} {
  /** Position of the selected tab, counted from zero. */
  readonly index: number;
  /** Label of the selected tab. */
  readonly label: string;
}
`;
}

const SELECTED_INDEX_DOC =
  '  /** Position of the selected tab, counted from zero (`uses.selectedIndex`). */';
const SELECTED_TAB_CHANGE_DOC =
  '  /** Emitted when another tab is selected (`produces.selectedTabChange`). */';

function horizontalComponentSource(names: TabsComponentNames, options: TabsAstOptions): string {
  const coreImports = [
    'ChangeDetectionStrategy',
    'Component',
    'model',
    ...(options.selectedTabChange ? ['output'] : []),
  ];
  const materialImports = [
    ...(options.selectedTabChange ? ['MatTabChangeEvent'] : []),
    'MatTabsModule',
  ];
  const outputs = options.selectedTabChange
    ? `${SELECTED_TAB_CHANGE_DOC}
  readonly selectedTabChange = output<${changeEventName(names)}>();
`
    : '';
  const handler = options.selectedTabChange
    ? `
  protected emitTabChange(event: MatTabChangeEvent): void {
    this.selectedTabChange.emit({ index: event.index, label: event.tab.textLabel });
  }
`
    : '';

  return `// Begin import section
import { ${coreImports.join(', ')} } from '@angular/core';
import { ${materialImports.join(', ')} } from '@angular/material/tabs';
// End import section

${options.selectedTabChange ? `${changeEventInterface(names)}\n` : ''}@Component({
  selector: '${names.selector}',
  imports: [MatTabsModule],
  templateUrl: '${names.templateUrl}',
  styleUrl: '${names.styleUrl}',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${names.className} {
  // Begin injected services section
  // End injected services section

  // Begin input signals section
${SELECTED_INDEX_DOC}
  readonly selectedIndex = model(${options.selectedIndex});
  // End input signals section

  // Begin output signals section
${outputs}  // End output signals section
${handler}}
`;
}

function verticalComponentSource(names: TabsComponentNames, options: TabsAstOptions): string {
  const coreImports = [
    'ChangeDetectionStrategy',
    'Component',
    'model',
    ...(options.selectedTabChange ? ['output'] : []),
  ];
  const labels = options.tabs.map((tab) => typeScriptStringLiteral(tab.label)).join(', ');
  const disabled = options.tabs.map((tab) => String(tab.disabled)).join(', ');
  const outputs = options.selectedTabChange
    ? `${SELECTED_TAB_CHANGE_DOC}
  readonly selectedTabChange = output<${changeEventName(names)}>();
`
    : '';
  const emit = options.selectedTabChange
    ? `
    this.selectedTabChange.emit({ index, label: TAB_LABELS[index] });`
    : '';

  return `// Begin import section
import { ${coreImports.join(', ')} } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
// End import section

${options.selectedTabChange ? `${changeEventInterface(names)}\n` : ''}const TAB_LABELS: readonly string[] = [${labels}];
const TAB_DISABLED: readonly boolean[] = [${disabled}];

let nextTabsId = 0;

@Component({
  selector: '${names.selector}',
  imports: [MatButtonModule],
  templateUrl: '${names.templateUrl}',
  styleUrl: '${names.styleUrl}',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${names.className} {
  // Begin injected services section
  // End injected services section

  // Begin input signals section
${SELECTED_INDEX_DOC}
  readonly selectedIndex = model(${options.selectedIndex});
  // End input signals section

  // Begin output signals section
${outputs}  // End output signals section

  private readonly idPrefix = \`${names.selector}-tabs-\${nextTabsId++}\`;

  protected tabId(index: number): string {
    return \`\${this.idPrefix}-tab-\${index}\`;
  }

  protected panelId(index: number): string {
    return \`\${this.idPrefix}-panel-\${index}\`;
  }

  protected selectTab(index: number): void {
    if (index === this.selectedIndex() || TAB_DISABLED[index]) {
      return;
    }

    this.selectedIndex.set(index);${emit}
  }

  /** Arrow Up and Arrow Down, Home and End move the selection to an enabled tab. */
  protected onKeydown(event: KeyboardEvent): void {
    const index = this.keyTarget(event.key);
    if (index === undefined) {
      return;
    }

    event.preventDefault();
    this.selectTab(index);
    (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]')[index]?.focus();
  }

  private keyTarget(key: string): number | undefined {
    const enabled = TAB_DISABLED.flatMap((disabled, index) => (disabled ? [] : [index]));
    const position = enabled.indexOf(this.selectedIndex());

    switch (key) {
      case 'ArrowDown':
        return enabled[(position + 1) % enabled.length];
      case 'ArrowUp':
        return enabled[(position - 1 + enabled.length) % enabled.length];
      case 'Home':
        return enabled[0];
      case 'End':
        return enabled[enabled.length - 1];
      default:
        return undefined;
    }
  }
}
`;
}
