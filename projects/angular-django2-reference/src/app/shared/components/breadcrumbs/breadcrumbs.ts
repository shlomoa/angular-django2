import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  readonly label: string;
  readonly url?: string;
}

@Component({
  selector: 'app-breadcrumbs',
  imports: [MatIconModule, RouterLink],
  template: `
    <nav class="breadcrumbs" aria-label="Breadcrumb navigation">
      <ol class="breadcrumb-list">
        <li>
          <a routerLink="/" class="breadcrumb-link home-link" aria-label="Home">
            <mat-icon class="breadcrumb-icon">home</mat-icon>
          </a>
        </li>
        @for (item of items(); track $index; let last = $last) {
          <li class="breadcrumb-separator" aria-hidden="true">
            <mat-icon class="separator-icon">chevron_right</mat-icon>
          </li>
          <li>
            @if (!last && item.url) {
              <a [routerLink]="item.url" class="breadcrumb-link">{{ item.label }}</a>
            } @else {
              <span class="breadcrumb-current" aria-current="page">{{ item.label }}</span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: `
    .breadcrumbs {
      margin-bottom: 1.5rem;
    }

    .breadcrumb-list {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: 0.875rem;
      gap: 0.25rem;
    }

    .breadcrumb-link {
      display: inline-flex;
      align-items: center;
      color: var(--mat-sys-primary);
      text-decoration: none;
      border-radius: 4px;
      padding: 0.125rem 0.375rem;
      transition: background-color 150ms ease;

      &:hover {
        background-color: var(--mat-sys-surface-container);
        text-decoration: underline;
      }
    }

    .home-link {
      padding: 0.25rem;
    }

    .breadcrumb-icon {
      font-size: 1.125rem;
      width: 1.125rem;
      height: 1.125rem;
    }

    .breadcrumb-separator {
      display: inline-flex;
      align-items: center;
      color: var(--mat-sys-outline);
    }

    .separator-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

    .breadcrumb-current {
      color: var(--mat-sys-on-surface-variant);
      font-weight: 500;
      padding: 0.125rem 0.375rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbsComponent {
  readonly items = input<readonly BreadcrumbItem[]>([]);
}
