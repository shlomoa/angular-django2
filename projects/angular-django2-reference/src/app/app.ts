import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location, NgOptimizedImage } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { AngularDjango2Service } from 'angular-django2';
import { filter } from 'rxjs';

type MaterialColorScheme = 'rose-red' | 'azure-blue' | 'magenta-violet' | 'cyan-orange';

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
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatToolbarModule,
    NgOptimizedImage,
    RouterLink,
    RouterOutlet,
  ],
  templateUrl: './app.reference.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly angularDjango2 = inject(AngularDjango2Service);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly currentUrl = signal(this.location.path() || this.router.url);

  protected readonly title = signal('angular-django2');
  protected readonly packageApi = this.angularDjango2.buildUrl('/api/');
  protected readonly csrfHeaderName = this.angularDjango2.resolvedConfig.csrfHeaderName;
  protected readonly selectedColorScheme = signal<MaterialColorScheme>('azure-blue');
  protected readonly colorSchemes: readonly { value: MaterialColorScheme; label: string }[] = [
    { value: 'rose-red', label: 'Rose & Red' },
    { value: 'azure-blue', label: 'Azure & Blue' },
    { value: 'magenta-violet', label: 'Magenta & Violet' },
    { value: 'cyan-orange', label: 'Cyan & Orange' },
  ];
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
      name: 'Runtime values',
      description: 'Display resolved API and CSRF values users can compare with their app.',
    },
  ];
  protected readonly guides = [
    {
      name: 'Getting started',
      description: 'Install the package and wire the standalone Angular providers.',
    },
    {
      name: 'Schematics workflow',
      description: 'Generate workspaces, apps, project structure, and data services.',
    },
    {
      name: 'Django integration',
      description: 'Keep API URLs, credentials, and CSRF behavior visible in code.',
    },
  ];

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
