import { routes } from './app.routes';
import { GuidesDetailPage } from './guides/guides-detail-page';
import { GuidesOverviewPage } from './guides/guides-overview-page';
import { UiCommandCategoryPage } from './ui/ui-command-category-page';
import { UiCommandOverviewPage } from './ui/ui-command-overview-page';

describe('reference app routes', () => {
  it('declares routed UI and guides pages', () => {
    expect(routes.map((route) => route.path)).toEqual([
      'ui',
      'ui/:categoryId',
      'guides',
      'guides/:guideId',
    ]);
    expect(routes.every((route) => typeof route.loadComponent === 'function')).toBe(true);
  });

  it('lazy-loads the UI command overview page', async () => {
    await expect(routes[0].loadComponent?.()).resolves.toBe(UiCommandOverviewPage);
  });

  it('lazy-loads the UI command category page', async () => {
    await expect(routes[1].loadComponent?.()).resolves.toBe(UiCommandCategoryPage);
  });

  it('lazy-loads the guides overview page', async () => {
    await expect(routes[2].loadComponent?.()).resolves.toBe(GuidesOverviewPage);
  });

  it('lazy-loads the guides detail page', async () => {
    await expect(routes[3].loadComponent?.()).resolves.toBe(GuidesDetailPage);
  });
});
