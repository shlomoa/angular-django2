// Begin import section
import { ChangeDetectionStrategy, Component, model, output } from '@angular/core';
import type { MatTabChangeEvent } from '@angular/material/tabs';
import { MatTabsModule } from '@angular/material/tabs';
import { BillingCard } from './billing-card/billing-card';
import { ProfileCard } from './profile-card/profile-card';
// End import section

/** The tab that became selected (`produces.selectedTabChange`). */
export interface AccountTabsTabChange {
  /** Position of the selected tab, counted from zero. */
  readonly index: number;
  /** Label of the selected tab. */
  readonly label: string;
}

@Component({
  selector: 'app-account-tabs',
  imports: [MatTabsModule, BillingCard, ProfileCard],
  templateUrl: './account-tabs.html',
  styleUrl: './account-tabs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountTabs {
  // Begin injected services section
  // End injected services section

  // Begin input signals section
  /** Position of the selected tab, counted from zero (`uses.selectedIndex`). */
  readonly selectedIndex = model(0);
  // End input signals section

  // Begin output signals section
  /** Emitted when another tab is selected (`produces.selectedTabChange`). */
  readonly selectedTabChange = output<AccountTabsTabChange>();
  // End output signals section

  protected emitTabChange(event: MatTabChangeEvent): void {
    this.selectedTabChange.emit({ index: event.index, label: event.tab.textLabel });
  }
}
