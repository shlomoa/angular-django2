// Begin import section
import { ChangeDetectionStrategy, Component, model, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AdvancedCard } from './advanced-card/advanced-card';
import { SecurityCard } from './security-card/security-card';
import { GeneralCard } from './general-card/general-card';
// End import section

/** The tab that became selected (`produces.selectedTabChange`). */
export interface SettingsTabsTabChange {
  /** Position of the selected tab, counted from zero. */
  readonly index: number;
  /** Label of the selected tab. */
  readonly label: string;
}

const TAB_LABELS: readonly string[] = ['General', 'Security', 'Advanced'];
const TAB_DISABLED: readonly boolean[] = [false, false, false];

let nextTabsId = 0;

@Component({
  selector: 'app-settings-tabs',
  imports: [MatButtonModule, AdvancedCard, SecurityCard, GeneralCard],
  templateUrl: './settings-tabs.html',
  styleUrl: './settings-tabs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsTabs {
  // Begin injected services section
  // End injected services section

  // Begin input signals section
  /** Position of the selected tab, counted from zero (`uses.selectedIndex`). */
  readonly selectedIndex = model(1);
  // End input signals section

  // Begin output signals section
  /** Emitted when another tab is selected (`produces.selectedTabChange`). */
  readonly selectedTabChange = output<SettingsTabsTabChange>();
  // End output signals section

  private readonly idPrefix = `app-settings-tabs-tabs-${nextTabsId++}`;

  protected tabId(index: number): string {
    return `${this.idPrefix}-tab-${index}`;
  }

  protected panelId(index: number): string {
    return `${this.idPrefix}-panel-${index}`;
  }

  protected selectTab(index: number): void {
    if (index === this.selectedIndex() || TAB_DISABLED[index]) {
      return;
    }

    this.selectedIndex.set(index);
    this.selectedTabChange.emit({ index, label: TAB_LABELS[index] });
  }

  /** Arrow Up and Arrow Down, Home and End move the selection to an enabled tab. */
  protected onKeydown(event: KeyboardEvent): void {
    const index = this.keyTarget(event.key);
    if (index === undefined) {
      return;
    }

    event.preventDefault();
    this.selectTab(index);
    const tabs = (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]');
    tabs[index]?.focus();
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
