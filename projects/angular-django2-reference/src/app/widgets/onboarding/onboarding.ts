// Begin import section
import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import type { StepperOrientation, StepperSelectionEvent } from '@angular/cdk/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatStepperModule } from '@angular/material/stepper';
import { ConfirmPanel } from './confirm-panel/confirm-panel';
import { PreferencesPanel } from './preferences-panel/preferences-panel';
import { AccountPanel } from './account-panel/account-panel';
// End import section

@Component({
  selector: 'app-onboarding',
  imports: [MatButtonModule, MatStepperModule, ConfirmPanel, PreferencesPanel, AccountPanel],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Onboarding {
  // Begin injected services section
  // End injected services section

  // Begin input signals section
  readonly selectedIndex = model(0);
  readonly linear = input(true);
  readonly orientation = input<StepperOrientation>('horizontal');
  // End input signals section

  // Begin output signals section
  readonly selectionChange = output<StepperSelectionEvent>();
  readonly complete = output<void>();
  // End output signals section

  protected onSelectionChange(event: StepperSelectionEvent): void {
    this.selectedIndex.set(event.selectedIndex);
    this.selectionChange.emit(event);
  }

  protected finish(): void {
    this.complete.emit();
  }
}
