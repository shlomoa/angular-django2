import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { UI_COMMAND_CATEGORIES, getUiCommandsByCategory } from './ui-command-catalog';

@Component({
  selector: 'app-ui-command-category-page',
  imports: [RouterLink],
  template: `
    <section class="ui-route-page" aria-labelledby="ui-command-category-title">
      <a routerLink="/ui">Back to UI categories</a>

      @if (category; as selectedCategory) {
        <p class="eyebrow">{{ selectedCategory.name }}</p>
        <h2 id="ui-command-category-title">{{ selectedCategory.name }} commands</h2>
        <p>{{ selectedCategory.summary }}</p>
        <nav aria-label="Commands in this category">
          @for (command of commands; track command.id) {
            <a href="#{{ command.id }}">{{ command.name }}</a>
          }
        </nav>
      } @else {
        <h2 id="ui-command-category-title">Unknown UI command category</h2>
        <p>The requested category is not part of the angular-django2 command catalog.</p>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiCommandCategoryPage {
  private readonly route = inject(ActivatedRoute);
  private readonly categoryId = this.route.snapshot.paramMap.get('categoryId');

  protected readonly category = UI_COMMAND_CATEGORIES.find(
    (candidate) => candidate.id === this.categoryId,
  );
  protected readonly commands = this.category ? getUiCommandsByCategory(this.category.id) : [];
}
