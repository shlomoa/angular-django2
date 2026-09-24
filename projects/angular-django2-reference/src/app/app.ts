import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location, NgOptimizedImage } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { ThemeService } from './core';
import { GUIDES } from './guides/guides-catalog';

@Component({
  selector: 'app-root',
  host: {
    '[class.theme-rose-red]': "selectedColorScheme() === 'rose-red'",
    '[class.theme-azure-blue]': "selectedColorScheme() === 'azure-blue'",
    '[class.theme-magenta-violet]': "selectedColorScheme() === 'magenta-violet'",
    '[class.theme-cyan-orange]': "selectedColorScheme() === 'cyan-orange'",
  },
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatListModule,
    MatSelectModule,
    MatSidenavModule,
    MatToolbarModule,
    NgOptimizedImage,
    RouterLink,
    RouterOutlet,
  ],
  templateUrl: './app.reference.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  private readonly currentUrl = signal(this.location.path() || this.router.url);

  protected readonly title = signal('angular-django2');
  protected readonly selectedColorScheme = this.themeService.selectedColorScheme;
  protected readonly colorSchemes = this.themeService.colorSchemes;

  protected readonly uiItems = [
    {
      name: 'Provider setup',
      description: 'Show the standalone providers that make Django boundaries explicit.',
    },
    {
      name: 'Material shell',
      description: 'Demonstrate a responsive toolbar, cards, chips, and selection controls.',
    },
    {
      name: 'Command exploration',
      description: 'Browse schematic commands grouped into category cards and detail pages.',
    },
  ];

  protected readonly guides = GUIDES.slice(0, 3).map((guide) => ({
    name: guide.name,
    description: guide.summary,
  }));

  protected readonly isHomeRoute = computed(() => {
    const url = this.currentUrl();
    return url === '/' || url === '' || url.startsWith('/#') || url.startsWith('/?');
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
  }
}
