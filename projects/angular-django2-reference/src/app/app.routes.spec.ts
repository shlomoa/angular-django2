import { routes } from './app.routes';
import { UiCommandCategoryPage } from './ui/ui-command-category-page';
import { UiCommandOverviewPage } from './ui/ui-command-overview-page';

describe('reference app routes', () => {
  it('declares routed UI pages for the command explorer', () => {
    expect(routes.map((route) => route.path)).toEqual(['ui', 'ui/:categoryId']);
    expect(routes.every((route) => typeof route.loadComponent === 'function')).toBe(true);
  });

  it('lazy-loads the UI command overview page', async () => {
    await expect(routes[0].loadComponent?.()).resolves.toBe(UiCommandOverviewPage);
  });

  it('lazy-loads the UI command category page', async () => {
    await expect(routes[1].loadComponent?.()).resolves.toBe(UiCommandCategoryPage);
  });
});
