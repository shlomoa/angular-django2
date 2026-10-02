import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import type { StepperSelectionEvent } from '@angular/cdk/stepper';
import { MatCardModule } from '@angular/material/card';

import { BreadcrumbsComponent } from '../shared';
import { Onboarding } from './onboarding/onboarding';

/** Header text of the steps in `onboarding.openui.json`, in document order. */
export const ONBOARDING_STEP_LABELS = ['Account', 'Preferences', 'Confirm'] as const;

/** The command that generated `./onboarding` from `onboarding.openui.json`. */
export const STEPPER_COMMAND =
  'ng generate angular-django2:stepper --document=src/app/widgets/onboarding.openui.json --path=src/app/widgets';

/**
 * Demonstration of the `stepper` schematic: `onboarding/` is the output of
 * {@link STEPPER_COMMAND}, formatted for this project's Prettier and ESLint
 * rules, and this page only listens to the `selectionChange` and `complete`
 * outputs declared by the OpenUI document.
 */
@Component({
  selector: 'app-stepper-demo-page',
  imports: [BreadcrumbsComponent, MatCardModule, Onboarding],
  templateUrl: './stepper-demo-page.html',
  styleUrl: './stepper-demo-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepperDemoPage {
  protected readonly command = STEPPER_COMMAND;
  protected readonly stepLabels = ONBOARDING_STEP_LABELS;
  protected readonly selectedIndex = signal(0);
  protected readonly completed = signal(false);
  protected readonly status = computed(() => {
    const index = this.selectedIndex();

    return `Step ${index + 1} of ${this.stepLabels.length}: ${this.stepLabels[index]}`;
  });

  protected onSelectionChange(event: StepperSelectionEvent): void {
    this.selectedIndex.set(event.selectedIndex);
    this.completed.set(false);
  }

  protected onComplete(): void {
    this.completed.set(true);
  }
}
