import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ONBOARDING_STEP_LABELS, STEPPER_COMMAND, StepperDemoPage } from './stepper-demo-page';

async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

async function renderPage() {
  const fixture = TestBed.createComponent(StepperDemoPage);
  await settle(fixture);

  return fixture;
}

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  expect(element, `Expected to find ${selector}`).not.toBeNull();

  return element as T;
}

describe('StepperDemoPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepperDemoPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('TC-STEPPER-22: renders the heading, the generation command, and the generated stepper', async () => {
    const compiled = (await renderPage()).nativeElement as HTMLElement;

    expect(requireElement(compiled, '#stepper-demo-title').textContent).toContain('Stepper');
    expect(requireElement(compiled, '.stepper-demo__command').textContent).toContain(
      STEPPER_COMMAND,
    );
    expect(requireElement(compiled, 'app-onboarding mat-stepper')).toBeTruthy();

    const headers = [...compiled.querySelectorAll('.mat-step-header')].map((header) =>
      header.textContent?.trim(),
    );
    expect(headers).toHaveLength(ONBOARDING_STEP_LABELS.length);
    ONBOARDING_STEP_LABELS.forEach((label, index) => expect(headers[index]).toContain(label));
  });

  it('TC-STEPPER-23: reports the selected step from the selectionChange output', async () => {
    const fixture = await renderPage();
    const compiled = fixture.nativeElement as HTMLElement;
    const status = requireElement<HTMLElement>(compiled, '.stepper-demo__status');
    expect(status.textContent).toContain('Step 1 of 3: Account');

    requireElement<HTMLButtonElement>(compiled, 'button[matStepperNext]').click();
    await settle(fixture);

    expect(status.textContent).toContain('Step 2 of 3: Preferences');
    expect(status.textContent).not.toContain('complete');
  });

  it('TC-STEPPER-24: reports completion from the complete output on the last step', async () => {
    const fixture = await renderPage();
    const compiled = fixture.nativeElement as HTMLElement;

    for (let step = 0; step < ONBOARDING_STEP_LABELS.length - 1; step++) {
      requireElement<HTMLButtonElement>(compiled, 'button[matStepperNext]').click();
      await settle(fixture);
    }
    expect(compiled.querySelector('.stepper-demo__done')).toBeNull();

    const finish = [...compiled.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === 'Finish',
    );
    expect(finish).toBeDefined();
    finish?.click();
    await settle(fixture);

    expect(requireElement(compiled, '.stepper-demo__done').textContent).toContain('complete');
  });
});
