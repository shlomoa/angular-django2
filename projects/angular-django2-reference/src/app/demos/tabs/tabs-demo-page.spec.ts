import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { TabsDemoPage } from './tabs-demo-page';

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  expect(element, `Expected to find ${selector}`).not.toBeNull();

  return element as T;
}

async function settle(fixture: ComponentFixture<TabsDemoPage>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/** Material attaches a tab body when its transition ends, so wait for the condition. */
async function settleUntil(
  fixture: ComponentFixture<TabsDemoPage>,
  condition: () => boolean,
): Promise<void> {
  const deadline = Date.now() + 2000;
  await settle(fixture);
  while (!condition() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    await settle(fixture);
  }
}

describe('TabsDemoPage (tabs schematic demonstration)', () => {
  let fixture: ComponentFixture<TabsDemoPage>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TabsDemoPage] }).compileComponents();
    fixture = TestBed.createComponent(TabsDemoPage);
    compiled = fixture.nativeElement as HTMLElement;
    await settle(fixture);
  });

  it('TC-TABS-DEMO-01: renders the generated horizontal tab group with the selected tab body created lazily', () => {
    const group = requireElement<HTMLElement>(compiled, 'app-account-tabs mat-tab-group');
    const labels = [...group.querySelectorAll<HTMLElement>('[role="tab"]')];

    expect(labels.map((label) => label.textContent?.trim())).toEqual([
      'Profile',
      'Billing',
      'Archive',
    ]);
    expect(labels[0].getAttribute('aria-selected')).toBe('true');
    expect(labels[2].getAttribute('aria-disabled')).toBe('true');
    expect(compiled.querySelector('app-profile-card app-contact-card')).not.toBeNull();
    expect(compiled.querySelector('app-billing-card')).toBeNull();
    expect(compiled.querySelector('.tabs-demo__status')?.textContent).toContain(
      'No tab change yet.',
    );
  });

  it('TC-TABS-DEMO-02: selecting a horizontal tab creates its body and emits selectedTabChange', async () => {
    const labels = [
      ...compiled.querySelectorAll<HTMLElement>('app-account-tabs mat-tab-group [role="tab"]'),
    ];

    labels[1].click();
    await settleUntil(fixture, () => compiled.querySelector('app-billing-card') !== null);

    expect(labels[1].getAttribute('aria-selected')).toBe('true');
    expect(compiled.querySelector('app-billing-card')).not.toBeNull();
    expect(compiled.querySelectorAll('.tabs-demo__status')[0].textContent).toContain(
      'Selected tab 1: Billing',
    );
  });

  it('TC-TABS-DEMO-03: renders uses.selectedIndex 1 as an ARIA vertical tablist with one tabpanel', () => {
    const list = requireElement<HTMLElement>(compiled, 'app-settings-tabs [role="tablist"]');
    const tabs = [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const panels = compiled.querySelectorAll<HTMLElement>('app-settings-tabs [role="tabpanel"]');

    expect(list.getAttribute('aria-orientation')).toBe('vertical');
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
    ]);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, 0, -1]);
    expect(panels.length).toBe(1);
    expect(panels[0].getAttribute('aria-labelledby')).toBe(tabs[1].id);
    expect(tabs[1].getAttribute('aria-controls')).toBe(panels[0].id);
    expect(panels[0].querySelector('app-security-card')).not.toBeNull();
  });

  it('TC-TABS-DEMO-04: the vertical tablist is operable by keyboard and emits selectedTabChange', async () => {
    const list = requireElement<HTMLElement>(compiled, 'app-settings-tabs [role="tablist"]');
    const press = async (key: string): Promise<void> => {
      list.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      await settle(fixture);
    };
    const selected = (): string | null | undefined =>
      list.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim();

    await press('ArrowDown');
    expect(selected()).toBe('Advanced');
    expect(compiled.querySelectorAll('.tabs-demo__status')[1].textContent).toContain(
      'Selected tab 2: Advanced',
    );

    await press('ArrowDown');
    expect(selected()).toBe('General');

    await press('End');
    expect(selected()).toBe('Advanced');

    await press('Home');
    expect(selected()).toBe('General');

    await press('ArrowUp');
    expect(selected()).toBe('Advanced');

    await press('Tab');
    expect(selected()).toBe('Advanced');
  });

  it('TC-TABS-DEMO-05: clicking a vertical tab selects it and swaps the panel', async () => {
    const tabs = [
      ...compiled.querySelectorAll<HTMLButtonElement>('app-settings-tabs [role="tab"]'),
    ];

    tabs[0].click();
    await settle(fixture);

    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(compiled.querySelector('app-general-card')).not.toBeNull();
    expect(compiled.querySelector('app-security-card')).toBeNull();
  });
});
