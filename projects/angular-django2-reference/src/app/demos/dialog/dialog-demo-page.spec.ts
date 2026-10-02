import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { DialogDemoPage } from './dialog-demo-page';

function queryDocument<T extends Element>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

function requireDocumentElement<T extends Element>(selector: string): T {
  const element = queryDocument<T>(selector);
  expect(element, `Expected to find ${selector}`).not.toBeNull();

  return element as T;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 20));
  fixture.detectChanges();
}

function pressEscape(target: Element): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true, cancelable: true }),
  );
}

describe('DialogDemoPage', () => {
  let fixture: ComponentFixture<DialogDemoPage>;
  let page: HTMLElement;

  async function openDialog(): Promise<void> {
    const trigger = page.querySelector<HTMLButtonElement>('mat-card-actions button');
    trigger?.focus();
    trigger?.click();
    await settle(fixture);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogDemoPage],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogDemoPage);
    page = fixture.nativeElement as HTMLElement;
    await settle(fixture);
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('TC-DIALOG-DEMO-01: renders the page without opening a dialog', () => {
    expect(page.querySelector('#dialog-demo-title')?.textContent).toContain('Dialog');
    expect(page.querySelector('[data-testid="outcome"]')?.textContent).toContain(
      'No dialog has ended yet',
    );
    expect(queryDocument('[role="dialog"]')).toBeNull();
  });

  it('TC-DIALOG-DEMO-02: opens a modal dialog that is labelled, described and holds focus', async () => {
    const trigger = page.querySelector<HTMLButtonElement>('mat-card-actions button');
    await openDialog();

    const dialog = requireDocumentElement<HTMLElement>('[role="dialog"]');
    const title = requireDocumentElement<HTMLElement>('h2[mat-dialog-title]');
    const content = requireDocumentElement<HTMLElement>('mat-dialog-content');

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(dialog.getAttribute('aria-describedby')).toBe(content.id);
    expect(title.textContent).toContain('Delete this report?');
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(queryDocument('.cdk-overlay-backdrop')).not.toBeNull();

    pressEscape(dialog);
    await settle(fixture);
    expect(trigger === document.activeElement).toBe(true);
  });

  it('TC-DIALOG-DEMO-03: a button closes the dialog and reports produces.close', async () => {
    await openDialog();

    const buttons = [...document.querySelectorAll<HTMLButtonElement>('mat-dialog-actions button')];
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'Keep report',
      'Delete report',
    ]);
    buttons[1].click();
    await settle(fixture);

    expect(queryDocument('[role="dialog"]')).toBeNull();
    expect(page.querySelector('[data-testid="outcome"]')?.textContent).toContain(
      'closed (produces.close)',
    );
  });

  it('TC-DIALOG-DEMO-04: Escape dismisses the dialog and reports produces.cancel', async () => {
    await openDialog();

    pressEscape(requireDocumentElement('[role="dialog"]'));
    await settle(fixture);

    expect(queryDocument('[role="dialog"]')).toBeNull();
    expect(page.querySelector('[data-testid="outcome"]')?.textContent).toContain(
      'dismissed (produces.cancel)',
    );
  });

  it('TC-DIALOG-DEMO-05: a backdrop click dismisses a modal dialog', async () => {
    await openDialog();

    requireDocumentElement<HTMLElement>('.cdk-overlay-backdrop').click();
    await settle(fixture);

    expect(queryDocument('[role="dialog"]')).toBeNull();
    expect(page.querySelector('[data-testid="outcome"]')?.textContent).toContain(
      'dismissed (produces.cancel)',
    );
  });

  it('TC-DIALOG-DEMO-06: a non-modal dialog has no backdrop and does not set aria-modal', async () => {
    page.querySelector<HTMLElement>('mat-slide-toggle button')?.click();
    await settle(fixture);
    await openDialog();

    const dialog = requireDocumentElement<HTMLElement>('[role="dialog"]');
    expect(dialog.getAttribute('aria-modal')).not.toBe('true');
    expect(queryDocument('.cdk-overlay-backdrop')).toBeNull();

    pressEscape(dialog);
    await settle(fixture);
    expect(queryDocument('[role="dialog"]')).toBeNull();
  });

  it('TC-DIALOG-DEMO-07: opening again after a closing reports the new outcome', async () => {
    await openDialog();
    pressEscape(requireDocumentElement('[role="dialog"]'));
    await settle(fixture);

    await openDialog();
    document.querySelector<HTMLButtonElement>('mat-dialog-actions button')?.click();
    await settle(fixture);

    expect(page.querySelector('[data-testid="outcome"]')?.textContent).toContain(
      'closed (produces.close)',
    );
  });
});
