import { Tree, SchematicsException } from '@angular-devkit/schematics';
import { describe, expect, it, vi } from 'vitest';

import {
  addComponentSectionMarkers,
  addTemplateSectionMarkers,
} from '../../projects/angular-django2/schematics/component/index';
import {
  embedComponent,
  parseChildComponent,
} from '../../projects/angular-django2/schematics/embed-component/index';

describe('component implementation hooks', () => {
  const generatedComponentTs = `import { Component } from '@angular/core';

@Component({
  selector: 'app-hero-card',
  imports: [],
  templateUrl: './hero-card.html',
  styleUrl: './hero-card.css',
})
export class HeroCard {

}
`;

  const generatedComponentHtml = '<p>hero-card works!</p>\n';

  it('TC-HOOK-01: wraps the import block with begin/end import markers', () => {
    const result = addComponentSectionMarkers(generatedComponentTs);

    expect(result).toContain('// Begin import section');
    expect(result).toContain('// End import section');
    expect(result).toMatch(
      /\/\/ Begin import section\nimport \{ Component \} from '@angular\/core';\n\/\/ End import section/,
    );
  });

  it('TC-HOOK-02: seeds the class body with injected/input/output signal markers', () => {
    const result = addComponentSectionMarkers(generatedComponentTs);

    expect(result).toContain('// Begin injected services section');
    expect(result).toContain('// End injected services section');
    expect(result).toContain('// Begin input signals section');
    expect(result).toContain('// End input signals section');
    expect(result).toContain('// Begin output signals section');
    expect(result).toContain('// End output signals section');
  });

  it('TC-HOOK-03: is idempotent for component TypeScript markers', () => {
    const once = addComponentSectionMarkers(generatedComponentTs);
    const twice = addComponentSectionMarkers(once);

    expect(twice).toBe(once);
  });

  it('TC-HOOK-04: appends a children section marker to the template', () => {
    const result = addTemplateSectionMarkers(generatedComponentHtml);

    expect(result).toContain('<p>hero-card works!</p>');
    expect(result).toContain('<!-- Begin children section -->');
    expect(result).toContain('<!-- End children section -->');
  });

  it('TC-HOOK-05: is idempotent for template markers', () => {
    const once = addTemplateSectionMarkers(generatedComponentHtml);
    const twice = addTemplateSectionMarkers(once);

    expect(twice).toBe(once);
  });
});

describe('embed-component schematic', () => {
  const childTs = `// Begin import section
import { Component, input, output } from '@angular/core';
// End import section

@Component({
  selector: 'app-hero-card',
  imports: [],
  templateUrl: './hero-card.html',
  styleUrl: './hero-card.css',
})
export class HeroCard {
  // Begin injected services section
  // End injected services section

  // Begin input signals section
  readonly title = input<string>();
  readonly count = input.required<number>();
  // End input signals section

  // Begin output signals section
  readonly selected = output<string>();
  // End output signals section
}
`;

  const parentTs = `// Begin import section
import { Component } from '@angular/core';
// End import section

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Begin injected services section
  // End injected services section

  // Begin input signals section
  // End input signals section

  // Begin output signals section
  // End output signals section
}
`;

  const parentHtml = `<p>app works!</p>

<!-- Begin children section -->
<!-- End children section -->
`;

  const createContext = () =>
    ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }) as never;

  const createWorkspaceTree = () => {
    const tree = Tree.empty();
    tree.create('/src/app/hero-card/hero-card.ts', childTs);
    tree.create('/src/app/hero-card/hero-card.html', '<p>hero-card works!</p>\n');
    tree.create('/src/app/app.ts', parentTs);
    tree.create('/src/app/app.html', parentHtml);
    return tree;
  };

  it('TC-EMBED-01: parses selector, class name, and signal names from the child', () => {
    const parsed = parseChildComponent(childTs);

    expect(parsed.selector).toBe('app-hero-card');
    expect(parsed.className).toBe('HeroCard');
    expect(parsed.inputs).toEqual(['title', 'count']);
    expect(parsed.outputs).toEqual(['selected']);
  });

  it('TC-EMBED-02: imports the child and registers it in the parent imports array', () => {
    const tree = createWorkspaceTree();

    embedComponent({
      component: 'src/app/hero-card/hero-card.ts',
      parent: 'src/app/app.ts',
    })(tree, createContext());

    const updatedParent = tree.read('/src/app/app.ts')!.toString();
    expect(updatedParent).toContain("import { HeroCard } from './hero-card/hero-card';");
    expect(updatedParent).toContain('imports: [HeroCard]');
  });

  it('TC-EMBED-03: adds not-implemented output handler stubs to the parent', () => {
    const tree = createWorkspaceTree();

    embedComponent({
      component: 'src/app/hero-card/hero-card.ts',
      parent: 'src/app/app.ts',
    })(tree, createContext());

    const updatedParent = tree.read('/src/app/app.ts')!.toString();
    expect(updatedParent).toContain('onSelected($event: unknown): void {');
    expect(updatedParent).toContain("throw new Error('onSelected is not implemented');");
  });

  it('TC-EMBED-04: embeds the child element after the children marker with wired signals', () => {
    const tree = createWorkspaceTree();

    embedComponent({
      component: 'src/app/hero-card/hero-card.ts',
      parent: 'src/app/app.ts',
    })(tree, createContext());

    const updatedHtml = tree.read('/src/app/app.html')!.toString();
    expect(updatedHtml).toContain(
      '<app-hero-card [title]="undefined" [count]="undefined" (selected)="onSelected($event)"></app-hero-card>',
    );
    expect(updatedHtml.indexOf('<!-- Begin children section -->')).toBeLessThan(
      updatedHtml.indexOf('<app-hero-card'),
    );
  });

  it('TC-EMBED-05: is idempotent across repeated embeds', () => {
    const tree = createWorkspaceTree();

    embedComponent({
      component: 'src/app/hero-card/hero-card.ts',
      parent: 'src/app/app.ts',
    })(tree, createContext());
    const firstTs = tree.read('/src/app/app.ts')!.toString();
    const firstHtml = tree.read('/src/app/app.html')!.toString();

    embedComponent({
      component: 'src/app/hero-card/hero-card.ts',
      parent: 'src/app/app.ts',
    })(tree, createContext());
    const secondTs = tree.read('/src/app/app.ts')!.toString();
    const secondHtml = tree.read('/src/app/app.html')!.toString();

    expect(secondTs).toBe(firstTs);
    expect(secondHtml).toBe(firstHtml);
    expect(secondTs.match(/import \{ HeroCard \}/g)).toHaveLength(1);
    expect(secondHtml.match(/<app-hero-card/g)).toHaveLength(1);
  });

  it('TC-EMBED-06: throws when the child or parent file is missing', () => {
    const tree = createWorkspaceTree();

    expect(() =>
      embedComponent({
        component: 'src/app/missing/missing.ts',
        parent: 'src/app/app.ts',
      })(tree, createContext()),
    ).toThrow(SchematicsException);

    expect(() =>
      embedComponent({
        component: 'src/app/hero-card/hero-card.ts',
        parent: 'src/app/missing.ts',
      })(tree, createContext()),
    ).toThrow(SchematicsException);
  });

  it('TC-EMBED-07: embeds a package component (Angular Material) into the parent', () => {
    const tree = createWorkspaceTree();

    embedComponent({
      component: 'MatDateRangePicker',
      parent: 'src/app/app.ts',
      from: '@angular/material/datepicker',
      selector: 'mat-date-range-picker',
      inputs: 'disabled, startAt',
      outputs: 'opened, closed',
    })(tree, createContext());

    const updatedParent = tree.read('/src/app/app.ts')!.toString();
    expect(updatedParent).toContain(
      "import { MatDateRangePicker } from '@angular/material/datepicker';",
    );
    expect(updatedParent).toContain('imports: [MatDateRangePicker]');
    expect(updatedParent).toContain('onOpened($event: unknown): void {');
    expect(updatedParent).toContain("throw new Error('onOpened is not implemented');");
    expect(updatedParent).toContain('onClosed($event: unknown): void {');

    const updatedHtml = tree.read('/src/app/app.html')!.toString();
    expect(updatedHtml).toContain(
      '<mat-date-range-picker [disabled]="undefined" [startAt]="undefined" (opened)="onOpened($event)" (closed)="onClosed($event)"></mat-date-range-picker>',
    );
    expect(updatedHtml.indexOf('<!-- Begin children section -->')).toBeLessThan(
      updatedHtml.indexOf('<mat-date-range-picker'),
    );
  });

  it('TC-EMBED-08: defaults the package selector to the dasherized class name', () => {
    const tree = createWorkspaceTree();

    embedComponent({
      component: 'MatDateRangePicker',
      parent: 'src/app/app.ts',
      from: '@angular/material/datepicker',
    })(tree, createContext());

    const updatedHtml = tree.read('/src/app/app.html')!.toString();
    expect(updatedHtml).toContain('<mat-date-range-picker></mat-date-range-picker>');
  });

  it('TC-EMBED-09: is idempotent when embedding a package component twice', () => {
    const tree = createWorkspaceTree();

    const embed = () =>
      embedComponent({
        component: 'MatDateRangePicker',
        parent: 'src/app/app.ts',
        from: '@angular/material/datepicker',
        selector: 'mat-date-range-picker',
        outputs: 'opened',
      })(tree, createContext());

    embed();
    const firstTs = tree.read('/src/app/app.ts')!.toString();
    const firstHtml = tree.read('/src/app/app.html')!.toString();
    embed();
    const secondTs = tree.read('/src/app/app.ts')!.toString();
    const secondHtml = tree.read('/src/app/app.html')!.toString();

    expect(secondTs).toBe(firstTs);
    expect(secondHtml).toBe(firstHtml);
    expect(secondTs.match(/import \{ MatDateRangePicker \}/g)).toHaveLength(1);
    expect(secondHtml.match(/<mat-date-range-picker/g)).toHaveLength(1);
  });

  it('TC-EMBED-10: does not require a local child file in package mode', () => {
    const tree = createWorkspaceTree();

    expect(() =>
      embedComponent({
        component: 'MatDateRangePicker',
        parent: 'src/app/app.ts',
        from: '@angular/material/datepicker',
      })(tree, createContext()),
    ).not.toThrow();
  });

  it('TC-EMBED-11: throws when the component or parent argument is empty', () => {
    const tree = createWorkspaceTree();

    expect(() =>
      embedComponent({
        component: '',
        parent: 'src/app/app.ts',
      })(tree, createContext()),
    ).toThrow(SchematicsException);

    expect(() =>
      embedComponent({
        component: 'MatDateRangePicker',
        parent: '  ',
        from: '@angular/material/datepicker',
      })(tree, createContext()),
    ).toThrow(SchematicsException);
  });
});
