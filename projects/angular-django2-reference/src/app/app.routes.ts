import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'ui',
    loadComponent: () =>
      import('./ui/ui-command-overview-page').then((module) => module.UiCommandOverviewPage),
  },
  {
    path: 'ui/:categoryId',
    loadComponent: () =>
      import('./ui/ui-command-category-page').then((module) => module.UiCommandCategoryPage),
  },
  {
    path: 'guides',
    loadComponent: () =>
      import('./guides/guides-overview-page').then((module) => module.GuidesOverviewPage),
  },
  {
    path: 'guides/:guideId',
    loadComponent: () =>
      import('./guides/guides-detail-page').then((module) => module.GuidesDetailPage),
  },
];
