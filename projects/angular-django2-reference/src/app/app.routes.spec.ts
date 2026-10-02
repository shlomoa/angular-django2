import { routes } from './app.routes';
import { TabsDemoPage } from './demos/tabs/tabs-demo-page';
import { GuidesDetailPage } from './guides/guides-detail-page';
import { GuidesOverviewPage } from './guides/guides-overview-page';
import { UiCommandCategoryPage } from './ui/ui-command-category-page';
import { TableDemoPage } from './tables/table-demo-page';
import { UiCommandOverviewPage } from './ui/ui-command-overview-page';
import { StepperDemoPage } from './widgets/stepper-demo-page';

describe('reference app routes', () => {
  it('declares routed UI and guides pages', () => {
    expect(routes.map((route) => route.path)).toEqual([
      'ui',
      'ui/:categoryId',
      'table',
      'guides',
      'guides/:guideId',
      'widgets/stepper',
      'demos/tabs',
    ]);
    expect(routes.every((route) => typeof route.loadComponent === 'function')).toBe(true);
  });

  it('lazy-loads the UI command overview page', async () => {
    await expect(routes[0].loadComponent?.()).resolves.toBe(UiCommandOverviewPage);
  });

  it('lazy-loads the UI command category page', async () => {
    await expect(routes[1].loadComponent?.()).resolves.toBe(UiCommandCategoryPage);
  });

  it('lazy-loads the table demonstration page', async () => {
    await expect(routes[2].loadComponent?.()).resolves.toBe(TableDemoPage);
  });

  it('lazy-loads the guides overview page', async () => {
    await expect(routes[3].loadComponent?.()).resolves.toBe(GuidesOverviewPage);
  });

  it('lazy-loads the guides detail page', async () => {
    await expect(routes[4].loadComponent?.()).resolves.toBe(GuidesDetailPage);
  });

  it('lazy-loads the stepper demonstration page', async () => {
    await expect(routes[5].loadComponent?.()).resolves.toBe(StepperDemoPage);
  });

  it('lazy-loads the tabs schematic demonstration page', async () => {
    await expect(routes[6].loadComponent?.()).resolves.toBe(TabsDemoPage);
  });
});
