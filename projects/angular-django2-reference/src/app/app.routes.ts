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
];
