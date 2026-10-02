import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { AccountTabs, type AccountTabsTabChange } from './account-tabs/account-tabs';
import { SettingsTabs, type SettingsTabsTabChange } from './settings-tabs/settings-tabs';

/**
 * Demonstration of the `tabs` schematic. `account-tabs/` and `settings-tabs/`
 * are the output of
 * `ng generate angular-django2:tabs --document=src/app/demos/tabs/tabs-demo.openui.json --node-id=<id>`
 * for the two `Tabs` nodes of `tabs-demo.openui.json` (formatted by Prettier and `ng lint --fix`); this page only hosts them
 * and listens to their `selectedTabChange` output.
 */
@Component({
  selector: 'app-tabs-demo-page',
  imports: [AccountTabs, SettingsTabs],
  templateUrl: './tabs-demo-page.html',
  styleUrl: './tabs-demo-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsDemoPage {
  protected readonly accountChange = signal<AccountTabsTabChange | undefined>(undefined);
  protected readonly settingsChange = signal<SettingsTabsTabChange | undefined>(undefined);
}
